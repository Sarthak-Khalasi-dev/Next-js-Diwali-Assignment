import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Payment, Invoice } from "@/models";
import mongoose from "mongoose";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid payment ID" }, { status: 400 });
    }

    const payment = await Payment.findById(id)
      .populate("invoice", "invoiceNumber totalAmount dueDate status")
      .populate("customer", "name email phone");

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (err) {
    console.error("GET /api/payments/[id] error:", err);
    return NextResponse.json({ error: "Failed to fetch payment" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid payment ID" }, { status: 400 });
    }

    const body = await req.json();
    const { status, notes } = body;

    const allowedStatuses = ["successful", "failed", "pending", "refunded"];
    if (status && !allowedStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (status === "successful") updateData.paidAt = new Date();

    const updated = await Payment.findByIdAndUpdate(id, updateData, { new: true })
      .populate("invoice", "invoiceNumber totalAmount")
      .populate("customer", "name email");

    // If marking as refunded or failed, revert invoice to pending
    if (status === "refunded" || status === "failed") {
      await Invoice.findByIdAndUpdate(payment.invoice, { status: "pending", paidAt: null });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("PATCH /api/payments/[id] error:", err);
    return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid payment ID" }, { status: 400 });
    }

    const payment = await Payment.findByIdAndDelete(id);
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Revert invoice status to sent if this was a successful payment
    if (payment.status === "successful") {
      await Invoice.findByIdAndUpdate(payment.invoice, { status: "sent", paidAt: null });
    }

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/payments/[id] error:", err);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
