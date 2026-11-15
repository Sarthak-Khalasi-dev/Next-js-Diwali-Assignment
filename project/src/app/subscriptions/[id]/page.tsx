"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  User,
  Package,
  CheckCircle2,
  PauseCircle,
  XCircle,
  ArrowLeft,
  History,
  FileText,
  RotateCw,
  Loader2,
  AlertCircle,
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

interface CustomerData {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  billingAddress?: BillingAddress;
}

interface ProductData {
  _id: string;
  name: string;
  description?: string;
}

interface PriceData {
  _id: string;
  amount: number;
  currency: string;
  interval: "monthly" | "yearly" | "one_time";
  nickname?: string;
}

interface HistoryItem {
  action: string;
  date: string;
  details: string;
}

interface SubscriptionData {
  _id: string;
  customer: CustomerData | null;
  product: ProductData | null;
  price: PriceData | null;
  status: "active" | "paused" | "cancelled" | "past_due";
  startDate: string;
  nextBillingDate: string;
  cancelledAt: string | null;
  pausedAt: string | null;
  history: HistoryItem[];
  createdAt: string;
  updatedAt: string;
}

interface AvailablePlan {
  _id: string;
  amount: number;
  currency: string;
  interval: "monthly" | "yearly" | "one_time";
  nickname?: string;
  isActive: boolean;
}

export default function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Available plans for the product (for change plan modal)
  const [availablePlans, setAvailablePlans] = useState<AvailablePlan[]>([]);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [selectedNewPriceId, setSelectedNewPriceId] = useState("");
  const [changePlanReason, setChangePlanReason] = useState("");
  const [updatingPlan, setUpdatingPlan] = useState(false);

  // Status Action Modal (Pause / Resume / Cancel)
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"pause" | "resume" | "cancel">("pause");
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Quick Invoice generation
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/subscriptions/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Subscription not found");
        throw new Error("Failed to load subscription details");
      }
      const data: SubscriptionData = await res.json();
      setSubscription(data);

      // Load product prices for change plan options
      if (data.product?._id) {
        try {
          const prodRes = await fetch(`/api/products/${data.product._id}`);
          if (prodRes.ok) {
            const prodData = await prodRes.json();
            setAvailablePlans(prodData.prices || []);
            if (prodData.prices?.length > 0) {
              setSelectedNewPriceId(prodData.prices[0]._id);
            }
          }
        } catch {
          // Non-blocking
        }
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Error fetching details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleOpenActionModal = (type: "pause" | "resume" | "cancel") => {
    setActionType(type);
    setActionReason("");
    setActionModalOpen(true);
  };

  const handleExecuteAction = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          reason: actionReason,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || `Failed to ${actionType} subscription`);
      }

      setActionModalOpen(false);
      showSuccess(`Subscription ${actionType}d successfully.`);
      await fetchSubscription();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!selectedNewPriceId) return;
    try {
      setUpdatingPlan(true);
      const res = await fetch(`/api/subscriptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change_plan",
          priceId: selectedNewPriceId,
          reason: changePlanReason,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to switch plan");
      }

      setChangePlanOpen(false);
      showSuccess("Subscription pricing plan upgraded/changed successfully.");
      await fetchSubscription();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Plan update failed");
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!subscription) return;
    try {
      setGeneratingInvoice(true);
      const res = await fetch(`/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: subscription.customer?._id,
          subscription: subscription._id,
          notes: `Auto-generated billing invoice for subscription ${subscription._id.slice(-6)}`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate invoice");
      }

      showSuccess("New invoice generated successfully!");
      router.push("/invoices");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Invoice generation failed");
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "paused":
        return <Badge variant="warning">Paused</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm">Loading subscription details...</p>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900">Subscription Error</h2>
        <p className="text-sm text-gray-500 mt-1 mb-4">{error || "Record not found"}</p>
        <Link href="/subscriptions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Subscriptions
          </Button>
        </Link>
      </div>
    );
  }

  const customer = subscription.customer;
  const product = subscription.product;
  const price = subscription.price;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/subscriptions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Subscriptions
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Subscription #{subscription._id.slice(-6).toUpperCase()}
              </h1>
              {getStatusBadge(subscription.status)}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Created on {formatDate(subscription.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {subscription.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenActionModal("pause")}
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
            >
              <PauseCircle className="h-4 w-4 mr-1.5" />
              Pause
            </Button>
          )}

          {subscription.status === "paused" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenActionModal("resume")}
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Resume
            </Button>
          )}

          {subscription.status !== "cancelled" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChangePlanOpen(true)}
              >
                <RotateCw className="h-4 w-4 mr-1.5" />
                Change Plan
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenActionModal("cancel")}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Cancel
              </Button>
            </>
          )}

          <Button
            size="sm"
            onClick={handleGenerateInvoice}
            disabled={generatingInvoice}
          >
            {generatingInvoice ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <FileText className="h-4 w-4 mr-1.5" />
            )}
            Generate Invoice
          </Button>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Grid: Details Left, Timeline & Summary Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg): Customer & Plan Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Plan & Pricing Tier Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                Plan & Billing Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Assigned Product
                  </p>
                  <p className="text-base font-bold text-gray-900 mt-1">
                    {product?.name || "Unassigned"}
                  </p>
                  {product?.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  {product?._id && (
                    <Link
                      href={`/products/${product._id}`}
                      className="text-xs text-blue-600 font-medium inline-flex items-center gap-1 mt-3 hover:underline"
                    >
                      View Product Catalog <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                <div className="p-4 bg-green-50/50 rounded-lg border border-green-100">
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wider">
                    Recurring Charge
                  </p>
                  <p className="text-2xl font-black text-gray-900 mt-1">
                    {price ? formatCurrency(price.amount, price.currency) : "₹0.00"}
                  </p>
                  <p className="text-xs text-gray-500 capitalize mt-1">
                    Billed per {price?.interval.replace("_", " ")}
                    {price?.nickname ? ` (${price.nickname})` : ""}
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-green-100 text-green-800 mt-2">
                    Auto-Renewing
                  </span>
                </div>
              </div>

              {/* Timing metrics row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 block">Start Date</span>
                  <span className="font-semibold text-gray-800 mt-0.5 block">
                    {formatDate(subscription.startDate)}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 block">Next Renewal</span>
                  <span className="font-semibold text-blue-600 mt-0.5 block">
                    {subscription.status === "cancelled"
                      ? "N/A"
                      : formatDate(subscription.nextBillingDate)}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 block">Status Changed</span>
                  <span className="font-semibold text-gray-800 mt-0.5 block">
                    {formatDate(subscription.updatedAt)}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-500 block">Term Type</span>
                  <span className="font-semibold text-gray-800 capitalize mt-0.5 block">
                    {price?.interval.replace("_", " ") || "Standard"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-600" />
                  Customer Profile
                </CardTitle>
                {customer?._id && (
                  <Link
                    href={`/customers/${customer._id}`}
                    className="text-xs text-blue-600 font-medium hover:underline inline-flex items-center gap-1"
                  >
                    View Full Profile <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {customer ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 block">Customer Name</span>
                    <p className="font-semibold text-gray-800 mt-0.5">{customer.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{customer.email}</p>
                    {customer.phone && (
                      <p className="text-xs text-gray-500">{customer.phone}</p>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-gray-400 block">Billing Address</span>
                    {customer.billingAddress?.street || customer.billingAddress?.city ? (
                      <p className="text-xs text-gray-600 mt-0.5">
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
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5 italic">
                        No billing address on file
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No customer attached</p>
              )}
            </CardContent>
          </Card>

          {/* Activity & History Log */}
          <Card>
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <History className="h-4 w-4 text-gray-600" />
                Lifecycle Audit Trail ({subscription.history?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {subscription.history && subscription.history.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {subscription.history.map((event, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white ring-2 ring-blue-100" />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className="font-semibold text-sm text-gray-900">
                          {event.action}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(event.date)}
                        </span>
                      </div>
                      {event.details && (
                        <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-2.5 rounded border border-gray-100">
                          {event.details}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No recorded history</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Status & Quick Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 bg-gray-50/60 border-b border-gray-100">
              <CardTitle className="text-sm font-semibold text-gray-900">
                Subscription Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                {getStatusBadge(subscription.status)}
                <span className="text-xs text-gray-500 capitalize">
                  {subscription.status} state
                </span>
              </div>

              {subscription.status === "paused" && subscription.pausedAt && (
                <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-200">
                  <p className="font-semibold">Paused on</p>
                  <p>{formatDate(subscription.pausedAt)}</p>
                </div>
              )}

              {subscription.status === "cancelled" && subscription.cancelledAt && (
                <div className="p-3 bg-red-50 rounded-lg text-xs text-red-800 border border-red-200">
                  <p className="font-semibold">Cancelled on</p>
                  <p>{formatDate(subscription.cancelledAt)}</p>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subscription ID</span>
                  <span className="font-mono text-gray-900">{subscription._id.slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto Renewal</span>
                  <span className="font-medium text-green-600">
                    {subscription.status === "active" ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Invoice Action Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Need to bill now?</h4>
                  <p className="text-xs text-gray-600">
                    Create an itemized invoice for this billing cycle with 1 click.
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full mt-2"
                onClick={handleGenerateInvoice}
                disabled={generatingInvoice}
              >
                {generatingInvoice ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Generate Invoice Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Plan Modal */}
      <Dialog open={changePlanOpen} onClose={() => setChangePlanOpen(false)}>
        <DialogHeader>
          <DialogTitle>Switch Pricing Plan</DialogTitle>
          <DialogDescription>
            Select a different pricing tier for this customer. Billing renewals will adjust automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Available Plans for {product?.name}
            </label>
            <div className="space-y-2">
              {availablePlans.map((pl) => (
                <div
                  key={pl._id}
                  onClick={() => setSelectedNewPriceId(pl._id)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between ${
                    selectedNewPriceId === pl._id
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-900 capitalize">
                      {pl.nickname || `${pl.interval} Plan`}
                    </p>
                    <span className="text-xs text-gray-500 capitalize">
                      per {pl.interval.replace("_", " ")}
                    </span>
                  </div>
                  <span className="font-bold text-sm text-gray-900">
                    {formatCurrency(pl.amount, pl.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason for plan switch (optional)
            </label>
            <Input
              placeholder="e.g. Customer upgraded to annual plan"
              value={changePlanReason}
              onChange={(e) => setChangePlanReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChangePlanOpen(false)}
              disabled={updatingPlan}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleChangePlan}
              disabled={updatingPlan || !selectedNewPriceId}
            >
              {updatingPlan && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save New Plan
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Action Dialog (Pause / Resume / Cancel) */}
      <Dialog open={actionModalOpen} onClose={() => setActionModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>
            {actionType === "pause" && "Pause Subscription"}
            {actionType === "resume" && "Resume Subscription"}
            {actionType === "cancel" && "Cancel Subscription"}
          </DialogTitle>
          <DialogDescription>
            {actionType === "pause" &&
              "Temporarily suspend recurring billing. The customer will not be charged on renewal."}
            {actionType === "resume" &&
              "Reactivate subscription recurring billing for upcoming renewal cycles."}
            {actionType === "cancel" &&
              "Permanently cancel this subscription. This action will be recorded in the audit trail."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Notes or reason (optional)
            </label>
            <Input
              placeholder="e.g. Requested via support ticket"
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionModalOpen(false)}
              disabled={actionLoading}
            >
              Close
            </Button>
            <Button
              size="sm"
              variant={actionType === "cancel" ? "destructive" : "default"}
              onClick={handleExecuteAction}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Confirm{" "}
              {actionType === "pause"
                ? "Pause"
                : actionType === "resume"
                ? "Resume"
                : "Cancellation"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
