"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CustomerRef {
  _id: string;
  name: string;
  email: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceItem {
  _id: string;
  invoiceNumber: string;
  customer: CustomerRef | null;
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
}

interface InvoiceStats {
  total: number;
  paid: number;
  pending: number;
  overdue: number;
  draft: number;
  totalRevenue: number;
}

interface CustomerOption {
  _id: string;
  name: string;
  email: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    draft: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // New Invoice Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([
    { description: "Consulting / Professional Services", quantity: 1, unitPrice: 5000 },
  ]);
  const [taxPercent, setTaxPercent] = useState(18);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Quick Action / Details modal
  const [viewInvoice, setViewInvoice] = useState<InvoiceItem | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      params.append("page", page.toString());
      params.append("limit", "10");

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const data = await res.json();

      setInvoices(data.invoices || []);
      setStats(data.stats || { total: 0, paid: 0, pending: 0, overdue: 0, draft: 0, totalRevenue: 0 });
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  const loadCustomers = async () => {
    try {
      if (!dueDate) {
        const d = new Date();
        d.setDate(d.getDate() + 15);
        setDueDate(d.toISOString().split("T")[0]);
      }
      const res = await fetch("/api/customers?limit=100");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        if (data.customers?.length > 0 && !selectedCustomer) {
          setSelectedCustomer(data.customers[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCreateModal = () => {
    loadCustomers();
    setCreateModalOpen(true);
    setCreateError(null);
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (
    index: number,
    field: "description" | "quantity" | "unitPrice",
    value: string | number
  ) => {
    const updated = [...lineItems];
    if (field === "description") {
      updated[index].description = String(value);
    } else {
      updated[index][field] = Number(value) || 0;
    }
    setLineItems(updated);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  };

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    const discount = (sub * discountPercent) / 100;
    const taxable = Math.max(0, sub - discount);
    const tax = (taxable * taxPercent) / 100;
    return taxable + tax;
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      setCreateError("Please select a customer.");
      return;
    }

    try {
      setCreatingInvoice(true);
      setCreateError(null);

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: selectedCustomer,
          lineItems,
          taxPercent,
          discountPercent,
          dueDate,
          notes: invoiceNotes,
          status: "pending",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to create invoice");
      }

      setCreateModalOpen(false);
      await fetchInvoices();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Error creating invoice");
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }

      await fetchInvoices();
      if (viewInvoice && viewInvoice._id === invoiceId) {
        setViewInvoice(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete invoice");
      }

      await fetchInvoices();
      if (viewInvoice && viewInvoice._id === invoiceId) {
        setViewInvoice(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Delete failed");
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">
            Create, track, and manage customer billing invoices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchInvoices()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleOpenCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:border-gray-300 transition-colors" onClick={() => setStatusFilter("all")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total Invoices</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-green-300 transition-colors" onClick={() => setStatusFilter("paid")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Collected</p>
                <p className="text-xl font-bold text-green-600 mt-1">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="p-2.5 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-amber-300 transition-colors" onClick={() => setStatusFilter("pending")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Pending</p>
                <p className="text-xl font-bold text-amber-600 mt-1">{stats.pending}</p>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-red-300 transition-colors" onClick={() => setStatusFilter("overdue")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Overdue</p>
                <p className="text-xl font-bold text-red-600 mt-1">{stats.overdue}</p>
              </div>
              <div className="p-2.5 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-gray-300 transition-colors" onClick={() => setStatusFilter("draft")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Drafts</p>
                <p className="text-xl font-bold text-gray-600 mt-1">{stats.draft}</p>
              </div>
              <div className="p-2.5 bg-gray-100 rounded-lg">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search invoice number or customer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-36"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="draft">Draft</option>
              </Select>

              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-40"
              >
                <option value="createdAt">Date Created</option>
                <option value="dueDate">Due Date</option>
                <option value="total">Amount</option>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              >
                {sortOrder === "desc" ? "↓ Newest" : "↑ Oldest"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm">Loading invoices...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="p-4 bg-blue-50 rounded-full mb-3">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">No invoices found</h3>
              <p className="text-sm text-gray-500 max-w-sm mt-1">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search criteria or status filter."
                  : "Create your first customer invoice or generate one from a subscription."}
              </p>
              <div className="mt-5">
                <Button size="sm" onClick={handleOpenCreateModal}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Due Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoices.map((inv) => {
                    const custName = inv.customer?.name || "Unknown Customer";
                    const custEmail = inv.customer?.email || "";

                    return (
                      <tr key={inv._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link
                            href={`/invoices/${inv._id}`}
                            className="font-mono font-medium text-blue-600 hover:underline text-xs inline-flex items-center gap-1"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {formatDate(inv.createdAt)}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{custName}</p>
                            {custEmail && <p className="text-xs text-gray-500">{custEmail}</p>}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900">{formatCurrency(inv.total)}</p>
                          {inv.taxAmount > 0 && (
                            <p className="text-[10px] text-gray-400">
                              incl. {inv.taxPercent}% GST ({formatCurrency(inv.taxAmount)})
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>

                        <td className="px-6 py-4 text-xs text-gray-600">
                          {formatDate(inv.dueDate)}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/invoices/${inv._id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Open invoice details"
                              >
                                View
                              </Button>
                            </Link>

                            {inv.status !== "paid" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkPaid(inv._id)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                Mark Paid
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteInvoice(inv._id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && invoices.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 text-xs text-gray-500">
              <p>
                Showing {invoices.length} of {totalCount} invoices
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </Button>
                <span className="px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Dialog */}
      <Dialog open={!!viewInvoice} onClose={() => setViewInvoice(null)}>
        {viewInvoice && (
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="font-mono text-lg">
                    {viewInvoice.invoiceNumber}
                  </DialogTitle>
                  <DialogDescription>
                    Issued on {formatDate(viewInvoice.createdAt)}
                  </DialogDescription>
                </div>
                {getStatusBadge(viewInvoice.status)}
              </div>
            </DialogHeader>

            <div className="p-4 bg-gray-50 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-gray-800">
                Customer: {viewInvoice.customer?.name}
              </p>
              <p className="text-gray-500">Email: {viewInvoice.customer?.email}</p>
              <p className="text-gray-500">
                Due Date: {formatDate(viewInvoice.dueDate)}
              </p>
              {viewInvoice.paidAt && (
                <p className="text-green-600 font-medium">
                  Paid on: {formatDate(viewInvoice.paidAt)}
                </p>
              )}
            </div>

            {/* Line Items */}
            <div className="border border-gray-200 rounded-lg overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-gray-100/70 border-b border-gray-200 font-medium text-gray-600">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Price</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewInvoice.lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-medium">{item.description}</td>
                      <td className="p-2.5 text-center">{item.quantity}</td>
                      <td className="p-2.5 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2.5 text-right font-semibold">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 bg-gray-50/50 border-t border-gray-200 space-y-1 text-right">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(viewInvoice.subtotal)}</span>
                </div>
                {viewInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({viewInvoice.discountPercent}%)</span>
                    <span>-{formatCurrency(viewInvoice.discountAmount)}</span>
                  </div>
                )}
                {viewInvoice.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>GST ({viewInvoice.taxPercent}%)</span>
                    <span>+{formatCurrency(viewInvoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-gray-900 pt-1 border-t border-gray-200">
                  <span>Total Amount</span>
                  <span>{formatCurrency(viewInvoice.total)}</span>
                </div>
              </div>
            </div>

            {viewInvoice.notes && (
              <div className="text-xs text-gray-500">
                <span className="font-semibold block">Notes:</span>
                <p className="mt-0.5">{viewInvoice.notes}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewInvoice(null)}
              >
                Close
              </Button>

              {viewInvoice.status !== "paid" && (
                <Button
                  size="sm"
                  onClick={() => handleMarkPaid(viewInvoice._id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Create New Invoice Dialog */}
      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Generate New Invoice</DialogTitle>
          <DialogDescription>
            Create an invoice with itemized line items, tax rate, and payment due date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateInvoice} className="space-y-4 py-2 text-xs">
          {createError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
              {createError}
            </div>
          )}

          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Select Customer
            </label>
            <Select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full"
            >
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Line Items Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-medium text-gray-700">Line Items</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLineItem}
              >
                + Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) =>
                      handleUpdateLineItem(index, "description", e.target.value)
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
                      handleUpdateLineItem(index, "quantity", e.target.value)
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
                      handleUpdateLineItem(index, "unitPrice", e.target.value)
                    }
                    className="w-24"
                    required
                  />
                  {lineItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLineItem(index)}
                      className="text-red-500 p-1 h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-gray-700 mb-1">
                GST / Tax %
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={taxPercent}
                onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
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
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">
              Notes or Payment Instructions
            </label>
            <Textarea
              placeholder="e.g. Please wire transfer or pay via UPI within 15 days"
              rows={2}
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center text-sm font-semibold">
            <span>Estimated Total:</span>
            <span className="text-base text-blue-600">
              {formatCurrency(calculateTotal())}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              disabled={creatingInvoice}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={creatingInvoice}>
              {creatingInvoice && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Create & Issue Invoice
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
