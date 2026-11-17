import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Invoice, Customer, Subscription, Product, Price } from "@/models";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

// Ensure models are registered for populate
void Customer;
void Subscription;
void Product;
void Price;

interface RouteParams {
  params: Promise<{ id: string }>;
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#333333",
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 20,
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2563EB",
  },
  brandSubtitle: {
    fontSize: 9,
    color: "#6B7280",
    marginTop: 2,
  },
  invoiceTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
    color: "#111827",
  },
  invoiceNumber: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    color: "#374151",
    marginTop: 4,
  },
  statusBadge: {
    fontSize: 9,
    textTransform: "uppercase",
    fontWeight: "bold",
    textAlign: "right",
    marginTop: 4,
    color: "#059669",
  },
  partiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  partyBox: {
    width: "48%",
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#9CA3AF",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  partyText: {
    fontSize: 9,
    color: "#4B5563",
    marginBottom: 1.5,
  },
  table: {
    width: "100%",
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  colNum: { width: "8%", textAlign: "center" },
  colDesc: { width: "52%" },
  colQty: { width: "12%", textAlign: "center" },
  colRate: { width: "14%", textAlign: "right" },
  colTotal: { width: "14%", textAlign: "right" },
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  totalsBox: {
    width: "40%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    fontSize: 9,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.5,
    borderTopColor: "#111827",
    paddingTop: 6,
    marginTop: 4,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  notesBox: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  notesTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginBottom: 3,
  },
  notesText: {
    fontSize: 8.5,
    color: "#4B5563",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 8,
    color: "#9CA3AF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 8,
  },
});

interface PDFLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PDFCustomer {
  name?: string;
  email?: string;
  phone?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

interface PDFInvoiceData {
  invoiceNumber: string;
  status: string;
  customer?: PDFCustomer;
  createdAt: Date | string;
  dueDate: Date | string;
  paidAt?: Date | string | null;
  lineItems: PDFLineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  notes?: string;
}

function InvoicePDFDocument({ invoice }: { invoice: PDFInvoiceData }) {
  const customer = invoice.customer || {};
  const addr = customer.billingAddress || {};
  const formattedAddress = [addr.street, addr.city, addr.state, addr.zipCode, addr.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>BillWise</Text>
            <Text style={styles.brandSubtitle}>Centralized Billing & Subscription Platform</Text>
            <Text style={styles.brandSubtitle}>support@billwise.io | GSTIN: 24AABCB1234F1Z8</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <Text style={styles.statusBadge}>Status: {invoice.status}</Text>
          </View>
        </View>

        {/* Parties & Dates */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.sectionTitle}>Billed To</Text>
            <Text style={styles.partyName}>{customer.name || "Customer"}</Text>
            {customer.email && <Text style={styles.partyText}>{customer.email}</Text>}
            {customer.phone && <Text style={styles.partyText}>{customer.phone}</Text>}
            {formattedAddress && <Text style={styles.partyText}>{formattedAddress}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.sectionTitle}>Invoice Info</Text>
            <Text style={styles.partyText}>
              Date of Issue: {new Date(invoice.createdAt).toLocaleDateString("en-IN")}
            </Text>
            <Text style={styles.partyText}>
              Payment Due: {new Date(invoice.dueDate).toLocaleDateString("en-IN")}
            </Text>
            {invoice.paidAt && (
              <Text style={styles.partyText}>
                Paid On: {new Date(invoice.paidAt).toLocaleDateString("en-IN")}
              </Text>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNum}>#</Text>
            <Text style={styles.colDesc}>Item & Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colRate}>Unit Price</Text>
            <Text style={styles.colTotal}>Total (INR)</Text>
          </View>
          {invoice.lineItems.map((item: PDFLineItem, idx: number) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.colNum}>{idx + 1}</Text>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colRate}>{Number(item.unitPrice).toFixed(2)}</Text>
              <Text style={styles.colTotal}>{Number(item.total).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={{ color: "#6B7280" }}>Subtotal:</Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>INR {Number(invoice.subtotal).toFixed(2)}</Text>
            </View>
            {invoice.discountAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: "#059669" }}>Discount ({invoice.discountPercent}%):</Text>
                <Text style={{ color: "#059669" }}>- INR {Number(invoice.discountAmount).toFixed(2)}</Text>
              </View>
            )}
            {invoice.taxAmount > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ color: "#6B7280" }}>GST ({invoice.taxPercent}%):</Text>
                <Text>+ INR {Number(invoice.taxAmount).toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text>Total Due:</Text>
              <Text style={{ color: "#2563EB" }}>INR {Number(invoice.total).toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Payment Details & Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          This is a computer-generated tax invoice generated by BillWise SaaS. No signature is required.
        </Text>
      </Page>
    </Document>
  );
}

// GET /api/invoices/[id]/pdf
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const invoice = await Invoice.findById(id)
      .populate("customer")
      .populate("subscription");

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const buffer = await renderToBuffer(
      <InvoicePDFDocument invoice={invoice.toObject() as unknown as PDFInvoiceData} />
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/invoices/[id]/pdf error:", error);
    const message = error instanceof Error ? error.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
