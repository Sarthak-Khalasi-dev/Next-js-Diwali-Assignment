"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  Repeat,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  DollarSign,
  TrendingUp,
  Receipt,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  StickyNote,
  PlusCircle,
} from "lucide-react";

interface CustomerDetailsPageProps {
  params: Promise<{ id: string }>;
}

interface CustomerData {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface SubscriptionItem {
  _id: string;
  product?: {
    _id: string;
    name: string;
    description?: string;
  };
  price?: {
    _id: string;
    unitAmount: number;
    currency: string;
    billingCycle: string;
  };
  status: "active" | "paused" | "cancelled" | "past_due";
  startDate: string;
  nextBillingDate: string;
  createdAt: string;
}

interface InvoiceItem {
  _id: string;
  invoiceNumber: string;
  total: number;
  subtotal: number;
  taxAmount: number;
  status: "draft" | "pending" | "paid" | "overdue";
  dueDate: string;
  createdAt: string;
}

interface PaymentItem {
  _id: string;
  invoice?: {
    _id: string;
    invoiceNumber: string;
  };
  amount: number;
  currency: string;
  method: string;
  status: "successful" | "pending" | "failed";
  transactionId?: string;
  paidAt: string;
}

interface StatsData {
  totalInvoiced: number;
  totalPaid: number;
  balanceDue: number;
  activeSubscriptionsCount: number;
  invoicesCount: number;
  paymentsCount: number;
}

function CustomerDetailContent({ params }: CustomerDetailsPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalInvoiced: 0,
    totalPaid: 0,
    balanceDue: 0,
    activeSubscriptionsCount: 0,
    invoicesCount: 0,
    paymentsCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchCustomerDetails() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/customers/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Customer not found");
        }

        setCustomer(data.customer);
        setNoteContent(data.customer.notes || "");
        setSubscriptions(data.subscriptions || []);
        setInvoices(data.invoices || []);
        setPayments(data.payments || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load customer profile";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchCustomerDetails();
    }
  }, [id]);

  function copyToClipboard(text: string, type: "id" | "email") {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: noteContent }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update notes");
      }

      setCustomer((prev) => (prev ? { ...prev, notes: noteContent } : null));
      setIsEditingNotes(false);
      setNotesSuccess(true);
      setTimeout(() => setNotesSuccess(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update notes");
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete customer");
      }

      setDeleteDialogOpen(false);
      router.push("/customers");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete customer";
      setError(msg);
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <Loader2 className="h-6 w-6 text-blue-600 absolute" />
        </div>
        <p className="text-gray-900 font-semibold text-lg">Loading Customer Profile</p>
        <p className="text-gray-500 text-sm mt-1">Retrieving subscriptions, invoices, and payment records...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-xl mx-auto py-16">
        <Card className="border-red-200 bg-red-50/70 shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-red-900 mb-2">Customer Not Found</h2>
            <p className="text-sm text-red-700 mb-6">{error || "The requested customer profile could not be located."}</p>
            <Link href="/customers">
              <Button variant="outline" className="border-red-300 hover:bg-red-100">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Customer Directory
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = customer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Header Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <Link
            href="/customers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers Directory
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              {customer.name}
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold px-2.5 py-0.5">
              <ShieldCheck className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              Active Customer
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-2">
            <button
              onClick={() => copyToClipboard(customer._id, "id")}
              className="inline-flex items-center gap-1 font-mono hover:text-gray-900 bg-gray-100 px-2 py-0.5 rounded transition"
              title="Click to copy ID"
            >
              <span>ID: {customer._id.slice(0, 8)}...</span>
              {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            </button>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              Joined {formatDate(customer.createdAt)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link href={`/customers/${customer._id}/edit`}>
            <Button variant="outline" className="h-9 gap-1.5 border-gray-300 hover:bg-gray-50">
              <Pencil className="h-4 w-4 text-gray-600" />
              Edit Customer
            </Button>
          </Link>
          <Button
            variant="outline"
            className="h-9 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Financial & Activity Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <Card className="border-gray-200/80 shadow-xs hover:border-blue-200 transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Invoiced</p>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalInvoiced)}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.invoicesCount} total invoice(s) generated</p>
          </CardContent>
        </Card>

        {/* Total Paid */}
        <Card className="border-gray-200/80 shadow-xs hover:border-emerald-200 transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Collected</p>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-2">{formatCurrency(stats.totalPaid)}</p>
            <p className="text-xs text-gray-500 mt-1">{stats.paymentsCount} recorded transaction(s)</p>
          </CardContent>
        </Card>

        {/* Balance Due */}
        <Card className="border-gray-200/80 shadow-xs hover:border-amber-200 transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding Balance</p>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <p className={`text-2xl font-bold mt-2 ${stats.balanceDue > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {formatCurrency(stats.balanceDue)}
            </p>
            <div className="mt-1">
              {stats.balanceDue === 0 ? (
                <span className="inline-flex items-center text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  All Settled
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-medium text-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Payment Pending
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card className="border-gray-200/80 shadow-xs hover:border-blue-200 transition">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Plans</p>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Repeat className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2">{stats.activeSubscriptionsCount}</p>
            <p className="text-xs text-gray-500 mt-1">
              {subscriptions.length} total plan subscription(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Content Area */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-gray-100/90 p-1 border border-gray-200/60 rounded-xl">
          <TabsTrigger value="overview">
            Overview & Profile
          </TabsTrigger>
          <TabsTrigger value="subscriptions" badge={subscriptions.length}>
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="invoices" badge={invoices.length}>
            Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" badge={payments.length}>
            Payments
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview & Profile */}
        <TabsContent value="overview" className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Card: Customer Identity & Contact */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-gray-100">
                <CardTitle className="text-base font-semibold">Contact Details</CardTitle>
                <CardDescription>Primary communication channels</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                    {initials}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{customer.name}</h3>
                    <p className="text-xs text-gray-500">Customer since {new Date(customer.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="space-y-3.5 pt-2 text-sm">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Email Address
                    </label>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200/70">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline truncate">
                          {customer.email}
                        </a>
                      </div>
                      <button
                        onClick={() => copyToClipboard(customer.email, "email")}
                        className="text-gray-400 hover:text-gray-700 ml-2"
                        title="Copy email"
                      >
                        {copiedEmail ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Phone Number
                    </label>
                    <div className="flex items-center p-2.5 rounded-lg bg-gray-50 border border-gray-200/70">
                      <Phone className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="text-gray-800 hover:text-blue-600">
                          {customer.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">No phone provided</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                      Last Updated
                    </label>
                    <div className="flex items-center p-2.5 rounded-lg bg-gray-50 border border-gray-200/70 text-gray-600">
                      <Clock className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <span>{formatDate(customer.updatedAt || customer.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Middle Card: Billing Address */}
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Billing Address</CardTitle>
                  <CardDescription>Address used for invoicing</CardDescription>
                </div>
                <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                  <MapPin className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 text-sm">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/70 space-y-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Street Address</p>
                    <p className="font-medium text-gray-900">
                      {customer.billingAddress?.street || <span className="text-gray-400 italic">Street not specified</span>}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">City</p>
                      <p className="font-medium text-gray-900 mt-1">
                        {customer.billingAddress?.city || "—"}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">State</p>
                      <p className="font-medium text-gray-900 mt-1">
                        {customer.billingAddress?.state || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Postal Code</p>
                      <p className="font-medium text-gray-900 mt-1">
                        {customer.billingAddress?.zipCode || "—"}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Country</p>
                      <p className="font-medium text-gray-900 mt-1">
                        {customer.billingAddress?.country || "India"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Card: Internal Notes with Quick-Edit */}
            <Card className="border-gray-200 shadow-sm flex flex-col">
              <CardHeader className="pb-4 border-b border-gray-100 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Internal Notes</CardTitle>
                  <CardDescription>Confidential staff comments</CardDescription>
                </div>
                {!isEditingNotes && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 text-xs"
                    onClick={() => setIsEditingNotes(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Note
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-between">
                {isEditingNotes ? (
                  <div className="space-y-3">
                    <Textarea
                      rows={6}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Add internal notes about this customer (e.g. key contacts, special discount terms)..."
                      className="text-sm"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{noteContent.length} characters</span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setIsEditingNotes(false);
                            setNoteContent(customer.notes || "");
                          }}
                          disabled={savingNotes}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={savingNotes}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {savingNotes ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Notes"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {notesSuccess && (
                      <div className="mb-3 p-2 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Notes updated successfully!
                      </div>
                    )}
                    {customer.notes ? (
                      <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                        <div className="flex items-center gap-1.5 text-amber-800 text-xs font-semibold uppercase mb-1.5">
                          <StickyNote className="h-3.5 w-3.5" />
                          Staff Notes
                        </div>
                        {customer.notes}
                      </div>
                    ) : (
                      <div className="text-center py-10 px-4 rounded-xl bg-gray-50 border border-dashed border-gray-200">
                        <StickyNote className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">No notes added yet</p>
                        <p className="text-xs text-gray-400 mt-1">Keep track of preferences, interactions, and billing remarks.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-4 text-xs"
                          onClick={() => setIsEditingNotes(true)}
                        >
                          <PlusCircle className="h-3.5 w-3.5 mr-1" />
                          Add Note
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Account Status</span>
                    <span className="font-semibold text-emerald-600">Good Standing</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Subscriptions */}
        <TabsContent value="subscriptions" className="pt-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-blue-600" />
                  Customer Subscriptions
                </CardTitle>
                <CardDescription>
                  Recurring plans, renewal cycles, and subscription statuses
                </CardDescription>
              </div>
              <Link href="/subscriptions">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Manage Subscriptions
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6">
              {subscriptions.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl bg-gray-50/80 border border-dashed border-gray-200">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                    <Repeat className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">No subscriptions found</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
                    This customer currently has no active subscription plans. Assign plans in Phase 3.
                  </p>
                  <Link href="/subscriptions">
                    <Button variant="outline" size="sm" className="text-xs">
                      Go to Subscriptions
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                        <th className="py-3 px-4">Plan / Product</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Price</th>
                        <th className="py-3 px-4">Billing Cycle</th>
                        <th className="py-3 px-4">Next Renewal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {subscriptions.map((sub) => (
                        <tr key={sub._id} className="hover:bg-gray-50/80 transition">
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {sub.product?.name || "Subscription Plan"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                sub.status === "active"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 capitalize"
                                  : sub.status === "paused"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 capitalize"
                                  : sub.status === "past_due"
                                  ? "bg-red-50 text-red-700 border-red-200 capitalize"
                                  : "bg-gray-100 text-gray-600 border-gray-200 capitalize"
                              }
                            >
                              {sub.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-gray-900 font-semibold">
                            {sub.price ? formatCurrency(sub.price.unitAmount, sub.price.currency) : "—"}
                          </td>
                          <td className="py-3 px-4 text-gray-600 capitalize">
                            {sub.price?.billingCycle || "Monthly"}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {sub.nextBillingDate ? formatDate(sub.nextBillingDate) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Invoices */}
        <TabsContent value="invoices" className="pt-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Customer Invoices
                </CardTitle>
                <CardDescription>
                  Invoices issued, tax breakdowns, and settlement history
                </CardDescription>
              </div>
              <Link href="/invoices">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" />
                  View All Invoices
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6">
              {invoices.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl bg-gray-50/80 border border-dashed border-gray-200">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">No invoices issued</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
                    No billing statements have been generated for this customer yet. Invoices will populate in Phase 4.
                  </p>
                  <Link href="/invoices">
                    <Button variant="outline" size="sm" className="text-xs">
                      Go to Invoices
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Issue Date</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoices.map((inv) => (
                        <tr key={inv._id} className="hover:bg-gray-50/80 transition">
                          <td className="py-3 px-4 font-mono font-medium text-blue-600">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{formatDate(inv.createdAt)}</td>
                          <td className="py-3 px-4 text-gray-600">{formatDate(inv.dueDate)}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            {formatCurrency(inv.total)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                inv.status === "paid"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 capitalize"
                                  : inv.status === "pending"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 capitalize"
                                  : inv.status === "overdue"
                                  ? "bg-red-50 text-red-700 border-red-200 capitalize"
                                  : "bg-gray-100 text-gray-600 border-gray-200 capitalize"
                              }
                            >
                              {inv.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Payments */}
        <TabsContent value="payments" className="pt-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  Payment Records
                </CardTitle>
                <CardDescription>
                  Payment history, payment modes, and gateway transaction IDs
                </CardDescription>
              </div>
              <Link href="/payments">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs">
                  <ExternalLink className="h-3.5 w-3.5" />
                  View All Payments
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-6">
              {payments.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl bg-gray-50/80 border border-dashed border-gray-200">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">No payment records found</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
                    Transactions and receipts logged for this customer will be listed here in Phase 5.
                  </p>
                  <Link href="/payments">
                    <Button variant="outline" size="sm" className="text-xs">
                      Go to Payments
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                        <th className="py-3 px-4">Transaction / ID</th>
                        <th className="py-3 px-4">Invoice #</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payments.map((p) => (
                        <tr key={p._id} className="hover:bg-gray-50/80 transition">
                          <td className="py-3 px-4 font-mono text-xs text-gray-600">
                            {p.transactionId || p._id.slice(-8)}
                          </td>
                          <td className="py-3 px-4 text-gray-900">
                            {p.invoice?.invoiceNumber || "—"}
                          </td>
                          <td className="py-3 px-4 uppercase text-xs font-medium text-gray-600">
                            {p.method.replace("_", " ")}
                          </td>
                          <td className="py-3 px-4 text-gray-600">{formatDate(p.paidAt)}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900">
                            {formatCurrency(p.amount, p.currency)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={
                                p.status === "successful"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 capitalize"
                                  : p.status === "pending"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 capitalize"
                                  : "bg-red-50 text-red-700 border-red-200 capitalize"
                              }
                            >
                              {p.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Delete Customer Profile</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong className="text-gray-900">{customer.name}</strong>?
            This will remove this customer from the system. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting Profile...
              </>
            ) : (
              "Yes, Delete Customer"
            )}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

export default function CustomerDetailPage(props: CustomerDetailsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-gray-500 font-medium">Loading customer profile...</p>
        </div>
      }
    >
      <CustomerDetailContent {...props} />
    </Suspense>
  );
}
