"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Printer,
  Download,
  Edit3,
  CheckCircle2,
  Clock,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Zap,
  ArrowRight,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface BillingAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface CustomerInfo {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  billingAddress?: BillingAddress;
}

interface SubscriptionInfo {
  _id: string;
  product?: {
    name: string;
    description?: string;
  };
  price?: {
    amount: number;
    currency: string;
    interval: string;
    nickname?: string;
  };
  status?: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceDetail {
  _id: string;
  invoiceNumber: string;
  customer: CustomerInfo | null;
  subscription: SubscriptionInfo | null;
  lineItems: LineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  status: "draft" | "pending" | "paid" | "overdue";
  dueDate: string;
  paidAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Status update loader
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Edit Invoice modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLineItems, setEditLineItems] = useState<LineItem[]>([]);
  const [editTaxPercent, setEditTaxPercent] = useState(18);
  const [editDiscountPercent, setEditDiscountPercent] = useState(0);
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState<"draft" | "pending" | "paid" | "overdue">("pending");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchInvoice = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/invoices/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Invoice not found");
        throw new Error("Failed to load invoice details");
      }
      const data: InvoiceDetail = await res.json();
      setInvoice(data);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error fetching invoice");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleStatusChange = async (newStatus: "draft" | "pending" | "paid" | "overdue") => {
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to update invoice status");
      }

      showNotification(`Invoice marked as ${newStatus}`);
      await fetchInvoice();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to permanently delete this invoice?")) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to delete invoice");
      }

      router.push("/invoices");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleOpenEdit = () => {
    if (!invoice) return;
    setEditLineItems([...invoice.lineItems]);
    setEditTaxPercent(invoice.taxPercent);
    setEditDiscountPercent(invoice.discountPercent);
    setEditDueDate(
      invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0] : ""
    );
    setEditNotes(invoice.notes || "");
    setEditStatus(invoice.status);
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleAddEditItem = () => {
    setEditLineItems([
      ...editLineItems,
      { description: "", quantity: 1, unitPrice: 0, total: 0 },
    ]);
  };

  const handleRemoveEditItem = (index: number) => {
    if (editLineItems.length <= 1) return;
    setEditLineItems(editLineItems.filter((_, i) => i !== index));
  };

  const handleUpdateEditItem = (
    index: number,
    field: "description" | "quantity" | "unitPrice",
    val: string | number
  ) => {
    const updated = [...editLineItems];
    if (field === "description") {
      updated[index].description = String(val);
    } else {
      const num = Math.max(0, Number(val) || 0);
      updated[index][field] = num;
      updated[index].total = updated[index].quantity * updated[index].unitPrice;
    }
    setEditLineItems(updated);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingEdit(true);
      setEditError(null);

      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineItems: editLineItems,
          taxPercent: editTaxPercent,
          discountPercent: editDiscountPercent,
          dueDate: editDueDate,
          notes: editNotes,
          status: editStatus,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to update invoice");
      }

      setEditModalOpen(false);
      showNotification("Invoice successfully updated");
      await fetchInvoice();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingEdit(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const res = await fetch(`/api/invoices/${id}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice?.invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showNotification("Invoice PDF downloaded successfully!");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "PDF download failed");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="success">Paid</Badge>;
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm">Loading invoice details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900">Invoice Not Found</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">{error || "Record could not be retrieved"}</p>
        <Link href="/invoices">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Invoices
          </Button>
        </Link>
      </div>
    );
  }

  const customer = invoice.customer;
  const subscription = invoice.subscription;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top action bar (hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Invoices
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-gray-900">
                {invoice.invoiceNumber}
              </h1>
              {getStatusBadge(invoice.status)}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Issued {formatDate(invoice.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Download className="h-4 w-4 mr-1.5" />
            )}
            Download PDF
          </Button>

          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>

          <Button variant="outline" size="sm" onClick={handleOpenEdit}>
            <Edit3 className="h-4 w-4 mr-1.5" />
            Edit
          </Button>

          {invoice.status !== "paid" ? (
            <Button
              size="sm"
              onClick={() => handleStatusChange("paid")}
              disabled={updatingStatus}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {updatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
              )}
              Mark as Paid
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("pending")}
              disabled={updatingStatus}
            >
              <Clock className="h-4 w-4 mr-1.5" />
              Mark as Pending
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm print:hidden">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Invoice Card (Printable layout) */}
      <Card className="border border-gray-200 shadow-sm print:shadow-none print:border-none">
        <CardContent className="p-8 sm:p-12 space-y-8">
          {/* Invoice Header / Branding */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-gray-200 pb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="text-2xl font-black text-gray-900 tracking-tight">
                  BillWise
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Cloud Billing & Subscription Platform
              </p>
              <p className="text-xs text-gray-400 mt-1">
                GSTIN: 24AABCB1234F1Z8 | support@billwise.io
              </p>
            </div>

            <div className="sm:text-right space-y-1">
              <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold block">
                TAX INVOICE
              </span>
              <p className="text-xl font-bold font-mono text-gray-900">
                {invoice.invoiceNumber}
              </p>
              <div className="pt-2">
                {getStatusBadge(invoice.status)}
              </div>
            </div>
          </div>

          {/* Parties & Dates Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs border-b border-gray-200 pb-8">
            {/* Billed To */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Billed To
              </p>
              {customer ? (
                <div>
                  <p className="text-sm font-bold text-gray-900">{customer.name}</p>
                  <p className="text-gray-600 mt-0.5">{customer.email}</p>
                  {customer.phone && <p className="text-gray-600">{customer.phone}</p>}
                  {customer.billingAddress && (
                    <p className="text-gray-500 mt-1 leading-relaxed">
                      {[
                        customer.billingAddress.street,
                        customer.billingAddress.city,
                        customer.billingAddress.state,
                        customer.billingAddress.zipCode,
                        customer.billingAddress.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  <Link
                    href={`/customers/${customer._id}`}
                    className="inline-flex items-center gap-1 text-blue-600 font-medium hover:underline mt-2 print:hidden"
                  >
                    View Customer Profile <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <p className="text-gray-400 italic">No customer linked</p>
              )}
            </div>

            {/* Invoice Timeline */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Payment Dates
              </p>
              <div className="space-y-1 text-gray-600">
                <div className="flex justify-between sm:justify-start sm:gap-4">
                  <span className="text-gray-400">Issue Date:</span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(invoice.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-4">
                  <span className="text-gray-400">Due Date:</span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>
                {invoice.paidAt && (
                  <div className="flex justify-between sm:justify-start sm:gap-4 text-green-700">
                    <span className="text-gray-400">Paid Date:</span>
                    <span className="font-semibold">
                      {formatDate(invoice.paidAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Context (if any) */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Subscription Plan
              </p>
              {subscription ? (
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {subscription.product?.name || "Active Service"}
                  </p>
                  <p className="text-gray-600 capitalize mt-0.5">
                    {subscription.price?.nickname ||
                      `${subscription.price?.interval} Plan`}
                  </p>
                  <Link
                    href={`/subscriptions/${subscription._id}`}
                    className="inline-flex items-center gap-1 text-blue-600 font-medium hover:underline mt-2 print:hidden"
                  >
                    View Subscription <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <p className="text-gray-500">Ad-hoc Invoice / Custom Line Items</p>
              )}
            </div>
          </div>

          {/* Itemized Line Items Table */}
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-y border-gray-200 uppercase font-semibold text-gray-500">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Item & Description</th>
                    <th className="py-3 px-4 text-center w-24">Qty</th>
                    <th className="py-3 px-4 text-right w-36">Rate</th>
                    <th className="py-3 px-4 text-right w-36">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.lineItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-4 text-center text-gray-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-900">{item.description}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-700 font-mono">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900 font-mono">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Calculations Box */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4">
              {/* Payment notes & Bank Info */}
              <div className="sm:max-w-xs space-y-2 text-xs text-gray-500">
                {invoice.notes ? (
                  <div>
                    <span className="font-bold text-gray-700 block uppercase text-[10px] tracking-wider mb-1">
                      Notes & Payment Details
                    </span>
                    <p className="p-3 bg-gray-50 rounded-lg border border-gray-100 leading-relaxed">
                      {invoice.notes}
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-gray-700 block uppercase text-[10px] tracking-wider mb-1">
                      Terms
                    </span>
                    <p className="text-gray-400 italic">
                      Payment is due within {formatDate(invoice.dueDate)}. Thank you for your business!
                    </p>
                  </div>
                )}
              </div>

              {/* Subtotal, Taxes, Total calculation */}
              <div className="w-full sm:w-80 space-y-2 text-xs">
                <div className="flex justify-between py-1 text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>

                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between py-1 text-green-600">
                    <span>Discount ({invoice.discountPercent}%)</span>
                    <span className="font-mono">
                      -{formatCurrency(invoice.discountAmount)}
                    </span>
                  </div>
                )}

                {invoice.taxAmount > 0 && (
                  <div className="flex justify-between py-1 text-gray-600">
                    <span>GST ({invoice.taxPercent}%)</span>
                    <span className="font-mono font-medium">
                      +{formatCurrency(invoice.taxAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-3 border-t-2 border-gray-900 text-sm font-bold text-gray-900">
                  <span>Total Amount</span>
                  <span className="text-base text-blue-600 font-mono">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>

                {invoice.status === "paid" && invoice.paidAt && (
                  <div className="p-2.5 bg-green-50 rounded border border-green-200 text-center text-green-800 font-medium text-xs">
                    ✓ Paid in Full on {formatDate(invoice.paidAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Invoice Dialog */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Edit Invoice #{invoice.invoiceNumber}</DialogTitle>
          <DialogDescription>
            Modify line items, discounts, GST tax percentage, or due date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveEdit} className="space-y-4 py-2 text-xs">
          {editError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
              {editError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-gray-700 mb-1">Status</label>
              <Select
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(e.target.value as "draft" | "pending" | "paid" | "overdue")
                }
                className="w-full"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </Select>
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">Due Date</label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Line items editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-gray-700">Line Items</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEditItem}
              >
                + Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {editLineItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) =>
                      handleUpdateEditItem(index, "description", e.target.value)
                    }
                    className="flex-1"
                    required
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) =>
                      handleUpdateEditItem(index, "quantity", e.target.value)
                    }
                    className="w-16"
                    required
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) =>
                      handleUpdateEditItem(index, "unitPrice", e.target.value)
                    }
                    className="w-24"
                    required
                  />
                  {editLineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveEditItem(index)}
                      className="text-red-500 p-1 h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Discount & Tax */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-gray-700 mb-1">
                GST / Tax %
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={editTaxPercent}
                onChange={(e) => setEditTaxPercent(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block font-medium text-gray-700 mb-1">
                Discount %
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={editDiscountPercent}
                onChange={(e) => setEditDiscountPercent(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Payment Instructions / Notes
            </label>
            <Textarea
              placeholder="e.g. Please wire transfer to account..."
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={savingEdit}>
              {savingEdit && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
