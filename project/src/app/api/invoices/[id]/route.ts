import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Invoice, Customer, Subscription, Product, Price } from "@/models";
import { InvoiceStatus, ILineItem } from "@/models/Invoice";

// Ensure models are registered for populate
void Customer;
void Subscription;
void Product;
void Price;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/invoices/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const invoice = await Invoice.findById(id)
      .populate("customer")
      .populate({
        path: "subscription",
        populate: [
          { path: "product", select: "name description" },
          { path: "price", select: "amount currency interval nickname" },
        ],
      });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error: unknown) {
    console.error("GET /api/invoices/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/invoices/[id] - Status transitions & quick updates
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { status, notes, paidAt } = body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (status) {
      const validStatuses: InvoiceStatus[] = ["draft", "pending", "paid", "overdue"];
      if (!validStatuses.includes(status as InvoiceStatus)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      invoice.status = status as InvoiceStatus;
      if (status === "paid") {
        invoice.paidAt = paidAt ? new Date(paidAt) : new Date();
      } else if (status !== "paid") {
        invoice.paidAt = null;
      }
    }

    if (notes !== undefined) {
      invoice.notes = notes;
    }

    await invoice.save();

    const updated = await Invoice.findById(id)
      .populate("customer")
      .populate("subscription");

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("PATCH /api/invoices/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/invoices/[id] - Full update
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { lineItems, discountPercent, taxPercent, dueDate, notes, status } = body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (Array.isArray(lineItems) && lineItems.length > 0) {
      const computedLineItems: ILineItem[] = lineItems.map((item) => ({
        description: item.description || "Service",
        quantity: Math.max(1, Number(item.quantity) || 1),
        unitPrice: Math.max(0, Number(item.unitPrice) || 0),
        total: (Math.max(1, Number(item.quantity) || 1)) * (Math.max(0, Number(item.unitPrice) || 0)),
      }));

      invoice.lineItems = computedLineItems;

      const subtotal = computedLineItems.reduce((acc, item) => acc + item.total, 0);
      invoice.subtotal = subtotal;

      const discPct = discountPercent !== undefined ? Math.min(100, Math.max(0, Number(discountPercent))) : invoice.discountPercent;
      const taxPct = taxPercent !== undefined ? Math.min(100, Math.max(0, Number(taxPercent))) : invoice.taxPercent;

      invoice.discountPercent = discPct;
      invoice.discountAmount = (subtotal * discPct) / 100;
      const taxable = Math.max(0, subtotal - invoice.discountAmount);

      invoice.taxPercent = taxPct;
      invoice.taxAmount = (taxable * taxPct) / 100;
      invoice.total = Math.round((taxable + invoice.taxAmount) * 100) / 100;
    }

    if (dueDate) {
      invoice.dueDate = new Date(dueDate);
    }

    if (notes !== undefined) {
      invoice.notes = notes;
    }

    if (status) {
      invoice.status = status;
      if (status === "paid" && !invoice.paidAt) {
        invoice.paidAt = new Date();
      }
    }

    await invoice.save();

    const updated = await Invoice.findById(id)
      .populate("customer")
      .populate("subscription");

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("PUT /api/invoices/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/invoices/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    await Invoice.findByIdAndDelete(id);

    return NextResponse.json({ message: "Invoice deleted successfully" });
  } catch (error: unknown) {
    console.error("DELETE /api/invoices/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
