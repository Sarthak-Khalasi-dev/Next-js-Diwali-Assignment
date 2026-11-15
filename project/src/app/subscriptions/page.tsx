"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  PauseCircle,
  XCircle,
  AlertTriangle,
  Eye,
  RefreshCw,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CustomerRef {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

interface ProductRef {
  _id: string;
  name: string;
  description?: string;
}

interface PriceRef {
  _id: string;
  amount: number;
  currency: string;
  interval: "monthly" | "yearly" | "one_time";
  nickname?: string;
}

interface SubscriptionItem {
  _id: string;
  customer: CustomerRef | null;
  product: ProductRef | null;
  price: PriceRef | null;
  status: "active" | "paused" | "cancelled" | "past_due";
  startDate: string;
  nextBillingDate: string;
  cancelledAt: string | null;
  pausedAt: string | null;
  history: Array<{ action: string; date: string; details: string }>;
  createdAt: string;
}

interface SubscriptionStats {
  total: number;
  active: number;
  paused: number;
  cancelled: number;
  pastDue: number;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [stats, setStats] = useState<SubscriptionStats>({
    total: 0,
    active: 0,
    paused: 0,
    cancelled: 0,
    pastDue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Status action modal state
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"pause" | "resume" | "cancel">("pause");
  const [selectedSub, setSelectedSub] = useState<SubscriptionItem | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
      params.append("page", page.toString());
      params.append("limit", "10");

      const res = await fetch(`/api/subscriptions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      const data = await res.json();

      setSubscriptions(data.subscriptions || []);
      setStats(data.stats || { total: 0, active: 0, paused: 0, cancelled: 0, pastDue: 0 });
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalItems(data.pagination?.total || 0);
    } catch (err: unknown) {
      console.error("Error loading subscriptions:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSubscriptions();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchSubscriptions]);

  const handleOpenActionModal = (sub: SubscriptionItem, type: "pause" | "resume" | "cancel") => {
    setSelectedSub(sub);
    setActionType(type);
    setActionReason("");
    setActionModalOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!selectedSub) return;
    try {
      setActionLoading(true);
      const res = await fetch(`/api/subscriptions/${selectedSub._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          reason: actionReason,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to ${actionType} subscription`);
      }

      setActionModalOpen(false);
      setSelectedSub(null);
      await fetchSubscriptions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed";
      alert(msg);
    } finally {
      setActionLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-500 mt-1">Manage customer subscriptions and billing cycles</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSubscriptions()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/subscriptions/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Subscription
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:border-gray-300 transition-colors" onClick={() => setStatusFilter("all")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-green-300 transition-colors" onClick={() => setStatusFilter("active")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Active</p>
                <p className="text-xl font-bold text-green-600 mt-1">{stats.active}</p>
              </div>
              <div className="p-2.5 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-amber-300 transition-colors" onClick={() => setStatusFilter("paused")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Paused</p>
                <p className="text-xl font-bold text-amber-600 mt-1">{stats.paused}</p>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg">
                <PauseCircle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-gray-300 transition-colors" onClick={() => setStatusFilter("cancelled")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Cancelled</p>
                <p className="text-xl font-bold text-gray-600 mt-1">{stats.cancelled}</p>
              </div>
              <div className="p-2.5 bg-gray-100 rounded-lg">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-red-300 transition-colors" onClick={() => setStatusFilter("past_due")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Past Due</p>
                <p className="text-xl font-bold text-red-600 mt-1">{stats.pastDue}</p>
              </div>
              <div className="p-2.5 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
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
                placeholder="Search customer or plan..."
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
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
                <option value="past_due">Past Due</option>
              </Select>

              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-40"
              >
                <option value="createdAt">Date Created</option>
                <option value="startDate">Start Date</option>
                <option value="nextBillingDate">Next Billing</option>
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

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm">Loading subscriptions...</p>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="p-4 bg-blue-50 rounded-full mb-3">
                <CreditCard className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">No subscriptions found</h3>
              <p className="text-sm text-gray-500 max-w-sm mt-1">
                {search || statusFilter !== "all"
                  ? "Try clearing your filters or search term to see existing records."
                  : "Get started by creating your first subscription for a customer."}
              </p>
              <div className="mt-5">
                <Link href="/subscriptions/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Subscription
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/75 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Customer</th>
                    <th className="px-6 py-3.5">Plan / Product</th>
                    <th className="px-6 py-3.5">Billing</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Next Renewal</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {subscriptions.map((sub) => {
                    const customerName = sub.customer?.name || "Unknown Customer";
                    const customerEmail = sub.customer?.email || "";
                    const productName = sub.product?.name || "Unknown Product";
                    const priceAmount = sub.price?.amount || 0;
                    const priceCurrency = sub.price?.currency || "INR";
                    const priceInterval = sub.price?.interval || "monthly";
                    const planNickname = sub.price?.nickname || priceInterval;

                    return (
                      <tr key={sub._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs">
                              {customerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <Link
                                href={`/customers/${sub.customer?._id}`}
                                className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                              >
                                {customerName}
                              </Link>
                              {customerEmail && (
                                <p className="text-xs text-gray-500">{customerEmail}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{productName}</p>
                            <span className="text-xs text-gray-500 capitalize">
                              {planNickname}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(priceAmount, priceCurrency)}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              per {priceInterval.replace("_", " ")}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {getStatusBadge(sub.status)}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-xs">
                              {sub.status === "cancelled"
                                ? "Ended"
                                : formatDate(sub.nextBillingDate)}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/subscriptions/${sub._id}`}>
                              <Button variant="ghost" size="sm" title="View details">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>

                            {sub.status === "active" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenActionModal(sub, "pause")}
                                title="Pause subscription"
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              >
                                Pause
                              </Button>
                            )}

                            {sub.status === "paused" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenActionModal(sub, "resume")}
                                title="Resume subscription"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                Resume
                              </Button>
                            )}

                            {sub.status !== "cancelled" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenActionModal(sub, "cancel")}
                                title="Cancel subscription"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                Cancel
                              </Button>
                            )}
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
          {!loading && subscriptions.length > 0 && (
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-200 text-xs text-gray-500">
              <p>
                Showing {subscriptions.length} of {totalItems} subscriptions
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
              "Temporarily pause recurring billing for this customer. Billing can be resumed anytime."}
            {actionType === "resume" &&
              "Resume recurring billing for this subscription. The next renewal date will remain active."}
            {actionType === "cancel" &&
              "Cancel this subscription. Once cancelled, customer will not be billed automatically."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {selectedSub && (
            <div className="p-3 bg-gray-50 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-gray-800">
                Customer: {selectedSub.customer?.name}
              </p>
              <p className="text-gray-600">
                Plan: {selectedSub.product?.name} (
                {selectedSub.price?.nickname || selectedSub.price?.interval})
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reason or notes (optional)
            </label>
            <Input
              placeholder="e.g. Customer requested temporary hiatus"
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
              Back
            </Button>
            <Button
              size="sm"
              variant={actionType === "cancel" ? "destructive" : "default"}
              onClick={handleExecuteAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : null}
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
