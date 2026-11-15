import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Invoice, Customer, Subscription, Product, Price } from "@/models";
import { InvoiceStatus, ILineItem } from "@/models/Invoice";
import { generateInvoiceNumber } from "@/lib/utils";

// Ensure models are registered for populate
void Customer;
void Subscription;
void Product;
void Price;

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim().toLowerCase() || "all";
    const customerId = searchParams.get("customerId")?.trim() || "";
    const subscriptionId = searchParams.get("subscriptionId")?.trim() || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));

    const query: Record<string, unknown> = {};

    if (status && status !== "all" && ["draft", "pending", "paid", "overdue"].includes(status)) {
      query.status = status as InvoiceStatus;
    }

    if (customerId) {
      query.customer = customerId;
    }

    if (subscriptionId) {
      query.subscription = subscriptionId;
    }

    if (search) {
      const matchingCustomers = await Customer.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const customerIds = matchingCustomers.map((c) => c._id);

      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
        { customer: { $in: customerIds } },
      ];
    }

    const sortOptions: Record<string, 1 | -1> = {};
    if (["createdAt", "dueDate", "total", "invoiceNumber"].includes(sortBy)) {
      sortOptions[sortBy] = sortOrder;
    } else {
      sortOptions.createdAt = -1;
    }

    const [
      invoices,
      total,
      totalCount,
      paidCount,
      pendingCount,
      overdueCount,
      draftCount,
      revenueAggregation,
    ] = await Promise.all([
      Invoice.find(query)
        .populate("customer", "name email phone")
        .populate({
          path: "subscription",
          select: "product price status",
          populate: [
            { path: "product", select: "name" },
            { path: "price", select: "amount interval" },
          ],
        })
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Invoice.countDocuments(query),
      Invoice.countDocuments(),
      Invoice.countDocuments({ status: "paid" }),
      Invoice.countDocuments({ status: "pending" }),
      Invoice.countDocuments({ status: "overdue" }),
      Invoice.countDocuments({ status: "draft" }),
      Invoice.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
      ]),
    ]);

    const totalRevenue = revenueAggregation[0]?.totalRevenue || 0;

    return NextResponse.json({
      invoices,
      stats: {
        total: totalCount,
        paid: paidCount,
        pending: pendingCount,
        overdue: overdueCount,
        draft: draftCount,
        totalRevenue,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/invoices error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      customer: customerId,
      subscription: subscriptionId,
      lineItems: customLineItems,
      discountPercent = 0,
      taxPercent = 18,
      dueDate,
      notes = "",
      status = "pending",
    } = body;

    let targetCustomerId = customerId;
    let computedLineItems: ILineItem[] = [];

    // If subscription is provided, auto-populate from subscription
    if (subscriptionId) {
      const sub = await Subscription.findById(subscriptionId)
        .populate("customer")
        .populate("product")
        .populate("price");

      if (!sub) {
        return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
      }

      targetCustomerId = sub.customer._id;

      const prodName = (sub.product as unknown as { name?: string })?.name || "Subscription Service";
      const pricePlan = sub.price as unknown as { amount?: number; nickname?: string; interval?: string };
      const amount = pricePlan?.amount || 0;
      const interval = pricePlan?.nickname || pricePlan?.interval || "monthly";

      computedLineItems = [
        {
          description: `${prodName} (${interval.replace("_", " ")} plan)`,
          quantity: 1,
          unitPrice: amount,
          total: amount,
        },
      ];
    } else if (Array.isArray(customLineItems) && customLineItems.length > 0) {
      computedLineItems = customLineItems.map((item) => ({
        description: item.description || "Service",
        quantity: Math.max(1, Number(item.quantity) || 1),
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        total: (Math.max(1, Number(item.quantity) || 1)) * (Math.max(0, Number(item.unitPrice) || 0)),
      }));
    } else {
      return NextResponse.json(
        { error: "Invoice requires either a valid subscription or at least one line item" },
        { status: 400 }
      );
    }

    if (!targetCustomerId) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }

    const existingCustomer = await Customer.findById(targetCustomerId);
    if (!existingCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Calculations
    const subtotal = computedLineItems.reduce((acc, item) => acc + item.total, 0);
    const validDiscountPercent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
    const discountAmount = (subtotal * validDiscountPercent) / 100;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const validTaxPercent = Math.min(100, Math.max(0, Number(taxPercent) || 0));
    const taxAmount = (taxableAmount * validTaxPercent) / 100;
    const total = Math.round((taxableAmount + taxAmount) * 100) / 100;

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 15);

    const invoiceNumber = generateInvoiceNumber();

    const invoice = await Invoice.create({
      invoiceNumber,
      customer: targetCustomerId,
      subscription: subscriptionId || null,
      lineItems: computedLineItems,
      subtotal,
      discountPercent: validDiscountPercent,
      discountAmount,
      taxPercent: validTaxPercent,
      taxAmount,
      total,
      status: status || "pending",
      dueDate: dueDate ? new Date(dueDate) : defaultDueDate,
      paidAt: status === "paid" ? new Date() : null,
      notes,
    });

    const populated = await Invoice.findById(invoice._id)
      .populate("customer", "name email phone")
      .populate("subscription");

    return NextResponse.json(populated, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/invoices error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
