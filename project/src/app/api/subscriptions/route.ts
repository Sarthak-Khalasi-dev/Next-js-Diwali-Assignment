import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Subscription, Customer, Product, Price } from "@/models";
import { SubscriptionStatus } from "@/models/Subscription";

// Ensure models are registered for Mongoose populate
void Customer;
void Product;
void Price;

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim().toLowerCase() || "all";
    const customerId = searchParams.get("customerId")?.trim() || "";
    const productId = searchParams.get("productId")?.trim() || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")));

    const query: Record<string, unknown> = {};

    if (status && status !== "all" && ["active", "paused", "cancelled", "past_due"].includes(status)) {
      query.status = status as SubscriptionStatus;
    }

    if (customerId) {
      query.customer = customerId;
    }

    if (productId) {
      query.product = productId;
    }

    // If search is provided, find matching customer or product IDs
    if (search) {
      const [matchingCustomers, matchingProducts] = await Promise.all([
        Customer.find({
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }).select("_id"),
        Product.find({
          name: { $regex: search, $options: "i" },
        }).select("_id"),
      ]);

      const customerIds = matchingCustomers.map((c) => c._id);
      const productIds = matchingProducts.map((p) => p._id);

      query.$or = [
        { customer: { $in: customerIds } },
        { product: { $in: productIds } },
      ];
    }

    const sortOptions: Record<string, 1 | -1> = {};
    if (["createdAt", "startDate", "nextBillingDate", "status"].includes(sortBy)) {
      sortOptions[sortBy] = sortOrder;
    } else {
      sortOptions.createdAt = -1;
    }

    const [
      subscriptions,
      total,
      totalCount,
      activeCount,
      pausedCount,
      cancelledCount,
      pastDueCount,
    ] = await Promise.all([
      Subscription.find(query)
        .populate("customer", "name email phone")
        .populate("product", "name description")
        .populate("price", "amount currency interval nickname")
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Subscription.countDocuments(query),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ status: "paused" }),
      Subscription.countDocuments({ status: "cancelled" }),
      Subscription.countDocuments({ status: "past_due" }),
    ]);

    return NextResponse.json({
      subscriptions,
      stats: {
        total: totalCount,
        active: activeCount,
        paused: pausedCount,
        cancelled: cancelledCount,
        pastDue: pastDueCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/subscriptions error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { customer, product, price, startDate, notes } = body;

    if (!customer) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }
    if (!product) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }
    if (!price) {
      return NextResponse.json({ error: "Price ID is required" }, { status: 400 });
    }

    const [existingCustomer, existingProduct, existingPrice] = await Promise.all([
      Customer.findById(customer),
      Product.findById(product),
      Price.findById(price),
    ]);

    if (!existingCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (!existingPrice) {
      return NextResponse.json({ error: "Price plan not found" }, { status: 404 });
    }

    const subscriptionStartDate = startDate ? new Date(startDate) : new Date();

    // Calculate next billing date based on billing interval
    const nextBillingDate = new Date(subscriptionStartDate);
    if (existingPrice.interval === "monthly") {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (existingPrice.interval === "yearly") {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      // one_time
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 50);
    }

    const newSubscription = await Subscription.create({
      customer,
      product,
      price,
      status: "active",
      startDate: subscriptionStartDate,
      nextBillingDate,
      history: [
        {
          action: "Created",
          date: new Date(),
          details: `Subscription started with ${existingProduct.name} - ${existingPrice.nickname || existingPrice.interval} plan${notes ? ` (${notes})` : ""}`,
        },
      ],
    });

    const populatedSubscription = await Subscription.findById(newSubscription._id)
      .populate("customer", "name email phone")
      .populate("product", "name description")
      .populate("price", "amount currency interval nickname");

    return NextResponse.json(populatedSubscription, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/subscriptions error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
