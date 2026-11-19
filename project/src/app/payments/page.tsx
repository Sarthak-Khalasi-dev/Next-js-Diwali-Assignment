"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditCard, CheckCircle, Clock, XCircle, RefreshCw, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Payment {
  _id: string;
  transactionId: string;
  amount: number;
  method: string;
  status: "successful" | "pending" | "failed" | "refunded";
  paidAt: string;
  notes: string;
  invoice: { _id: string; invoiceNumber: string; totalAmount: number } | null;
  customer: { _id: string; name: string; email: string } | null;
  createdAt: string;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  customer: { name: string } | null;
}

interface Stats {
  total: number;
  successful: number;
  pending: number;
  failed: number;
  totalCollected: number;
}

const METHOD_LABELS: Record<string, string> = {
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  cash: "Cash",
  other: "Other",
};

const STATUS_VARIANTS: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  successful: "success",
  pending: "warning",
  failed: "destructive",
  refunded: "secondary",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, successful: 0, pending: 0, failed: 0, totalCollected: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    invoiceId: "",
    amount: "",
    method: "upi",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterMethod) params.set("method", filterMethod);
      const res = await fetch(`/api/payments?${params}`);
      const data = await res.json();
      const list: Payment[] = data.payments || [];
      setPayments(list);

      const s: Stats = { total: list.length, successful: 0, pending: 0, failed: 0, totalCollected: 0 };
      list.forEach((p) => {
        if (p.status === "successful") { s.successful++; s.totalCollected += p.amount; }
        else if (p.status === "pending") s.pending++;
        else if (p.status === "failed") s.failed++;
      });
      setStats(s);
    } catch (err) {
      console.error("Failed to fetch payments:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterMethod]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const fetchUnpaidInvoices = async () => {
    try {
      const res = await fetch("/api/invoices?status=pending&limit=50");
      const data = await res.json();
      setUnpaidInvoices(data.invoices || []);
    } catch (err) {
      console.error("Failed to fetch invoices:", err);
    }
  };

  const openModal = () => {
    fetchUnpaidInvoices();
    setForm({ invoiceId: "", amount: "", method: "upi", notes: "" });
    setShowModal(true);
  };

  const handleInvoiceSelect = (invoiceId: string) => {
    const inv = unpaidInvoices.find((i) => i._id === invoiceId);
    setForm((f) => ({ ...f, invoiceId, amount: inv ? String(inv.totalAmount) : "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to record payment");
        return;
      }
      setShowModal(false);
      fetchPayments();
    } catch (err) {
      console.error("Submit payment error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const copyTxnId = (txnId: string) => {
    navigator.clipboard.writeText(txnId);
    setCopiedId(txnId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage all payment transactions</p>
        </div>
        <Button onClick={openModal}>Record Payment</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Collected</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalCollected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Successful</p>
                <p className="text-xl font-bold text-gray-900">{stats.successful}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-xl font-bold text-gray-900">{stats.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-4 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Statuses</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Methods</option>
              <option value="upi">UPI</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
            <Button variant="outline" onClick={fetchPayments} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History ({stats.total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">No payments recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Transaction ID</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Customer</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Invoice</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Method</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payments.map((p) => (
                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-mono text-xs text-gray-700">
                          {p.transactionId || "—"}
                          {p.transactionId && (
                            <button
                              onClick={() => copyTxnId(p.transactionId)}
                              className="text-gray-400 hover:text-gray-700 transition-colors"
                              title="Copy transaction ID"
                            >
                              {copiedId === p.transactionId ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{p.customer?.name || "—"}</p>
                          <p className="text-xs text-gray-400">{p.customer?.email || ""}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {p.invoice?.invoiceNumber || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {METHOD_LABELS[p.method] || p.method}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[p.status] || "secondary"}>
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDate(p.paidAt || p.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
              <p className="text-sm text-gray-500 mt-1">Link a payment to an existing unpaid invoice</p>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Invoice *</label>
                <select
                  required
                  value={form.invoiceId}
                  onChange={(e) => handleInvoiceSelect(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Choose an invoice...</option>
                  {unpaidInvoices.map((inv) => (
                    <option key={inv._id} value={inv._id}>
                      {inv.invoiceNumber} — {inv.customer?.name} ({formatCurrency(inv.totalAmount)})
                    </option>
                  ))}
                </select>
                {unpaidInvoices.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">No unpaid invoices found.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  required
                  value={form.method}
                  onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="upi">UPI</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="debit_card">Debit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
                  rows={2}
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "Recording..." : "Record Payment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
