import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import {
  Customer,
  Subscription,
  Invoice,
  Payment,
  Product,
  Price,
} from "@/models";

// GET /api/customers/:id - Retrieve customer along with subscriptions, invoices, payments, and stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    // Ensure Product and Price models are registered for populate
    void Product;
    void Price;

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer ID format" }, { status: 400 });
    }

    const customer = await Customer.findById(id).lean();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Parallel fetch related collections for this customer
    const [subscriptions, invoices, payments] = await Promise.all([
      Subscription.find({ customer: id })
        .populate("product", "name description")
        .populate("price", "unitAmount currency billingCycle")
        .sort({ createdAt: -1 })
        .lean(),
      Invoice.find({ customer: id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ customer: id })
        .populate("invoice", "invoiceNumber total status")
        .sort({ paidAt: -1 })
        .lean(),
    ]);

    // Calculate aggregated metrics
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = payments
      .filter((p) => p.status === "successful")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const balanceDue = Math.max(0, totalInvoiced - totalPaid);
    const activeSubscriptionsCount = subscriptions.filter(
      (sub) => sub.status === "active"
    ).length;

    const stats = {
      totalInvoiced,
      totalPaid,
      balanceDue,
      activeSubscriptionsCount,
      invoicesCount: invoices.length,
      paymentsCount: payments.length,
    };

    return NextResponse.json({
      customer,
      subscriptions,
      invoices,
      payments,
      stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/customers/:id - Full update of customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer ID format" }, { status: 400 });
    }

    const body = await request.json();

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
      }

      // Check if another customer uses this email
      const existing = await Customer.findOne({ email, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json(
          { error: "Another customer is already registered with this email" },
          { status: 409 }
        );
      }
      body.email = email;
    }

    if (body.name) {
      body.name = body.name.trim();
    }

    const customer = await Customer.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: "A customer with this email already exists" },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/customers/:id - Partial update (e.g., notes, phone, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer ID format" }, { status: 400 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updateData.name = name;
    }

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });
      }
      const existing = await Customer.findOne({ email, _id: { $ne: id } });
      if (existing) {
        return NextResponse.json(
          { error: "Another customer is already registered with this email" },
          { status: 409 }
        );
      }
      updateData.email = email;
    }

    if (body.phone !== undefined) updateData.phone = body.phone.trim();
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.billingAddress !== undefined) updateData.billingAddress = body.billingAddress;

    const customer = await Customer.findByIdAndUpdate(id, { $set: updateData }, {
      new: true,
      runValidators: true,
    }).lean();

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ customer, message: "Customer updated successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/customers/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid customer ID format" }, { status: 400 });
    }

    const customer = await Customer.findByIdAndDelete(id);

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Customer deleted successfully",
      id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
