import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Payment, Invoice, Subscription } from "@/models";
import mongoose from "mongoose";

function generateTxnId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "TXN";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const method = searchParams.get("method");
    const invoiceId = searchParams.get("invoiceId");

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (method) filter.method = method;
    if (invoiceId) filter.invoice = invoiceId;

    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("invoice", "invoiceNumber totalAmount dueDate")
        .populate("customer", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return NextResponse.json({
      payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /api/payments error:", err);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { invoiceId, amount, method, notes } = body;

    if (!invoiceId || !amount || !method) {
      return NextResponse.json(
        { error: "invoiceId, amount, and method are required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return NextResponse.json({ error: "Invalid invoiceId" }, { status: 400 });
    }

    const invoice = await Invoice.findById(invoiceId).populate("subscription");
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid") {
      return NextResponse.json({ error: "Invoice is already paid" }, { status: 400 });
    }

    const txnId = generateTxnId();

    const payment = await Payment.create({
      invoice: invoiceId,
      customer: invoice.customer,
      amount: parseFloat(amount),
      method,
      status: "successful",
      transactionId: txnId,
      paidAt: new Date(),
      notes: notes || "",
    });

    // Auto-mark invoice as paid if payment is successful
    await Invoice.findByIdAndUpdate(invoiceId, {
      status: "paid",
      paidAt: new Date(),
    });

    // Update subscription last billing info if applicable
    if (invoice.subscription) {
      const sub = invoice.subscription as { _id: mongoose.Types.ObjectId };
      await Subscription.findByIdAndUpdate(sub._id, {
        lastBillingDate: new Date(),
      });
    }

    const populated = await Payment.findById(payment._id)
      .populate("invoice", "invoiceNumber totalAmount")
      .populate("customer", "name email");

    return NextResponse.json(populated, { status: 201 });
  } catch (err) {
    console.error("POST /api/payments error:", err);
    return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
  }
}
