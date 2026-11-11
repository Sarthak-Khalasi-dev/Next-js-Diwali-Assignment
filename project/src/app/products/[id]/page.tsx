"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Package,
  Plus,
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle2,
  Tag,
  Power,
  Users,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PricePlan {
  _id: string;
  product: string;
  amount: number;
  currency: string;
  interval: "monthly" | "yearly" | "one_time";
  nickname: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductDetails {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductStats {
  totalPrices: number;
  activePrices: number;
  subscriptionsCount: number;
  activeSubscriptionsCount: number;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [prices, setPrices] = useState<PricePlan[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    totalPrices: 0,
    activePrices: 0,
    subscriptionsCount: 0,
    activeSubscriptionsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Product toggle & delete states
  const [togglingProduct, setTogglingProduct] = useState(false);
  const [showDeleteProductModal, setShowDeleteProductModal] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Price Modal States
  const [showAddPriceModal, setShowAddPriceModal] = useState(false);
  const [newPriceForm, setNewPriceForm] = useState({
    nickname: "",
    amount: "",
    currency: "INR",
    interval: "monthly" as "monthly" | "yearly" | "one_time",
    isActive: true,
  });
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);
  const [priceModalError, setPriceModalError] = useState("");

  // Edit Price Modal States
  const [editingPrice, setEditingPrice] = useState<PricePlan | null>(null);
  const [editPriceForm, setEditPriceForm] = useState({
    nickname: "",
    amount: "",
    currency: "INR",
    interval: "monthly" as "monthly" | "yearly" | "one_time",
    isActive: true,
  });
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  // Delete Price Modal States
  const [deletingPrice, setDeletingPrice] = useState<PricePlan | null>(null);
  const [isDeletingPrice, setIsDeletingPrice] = useState(false);

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`/api/products/${id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load product details");
      }

      setProduct(data.product);
      setPrices(data.prices || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load product";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Flash success helper
  const flashSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  // Toggle Product active status
  const handleToggleProductStatus = async () => {
    if (!product) return;
    try {
      setTogglingProduct(true);
      setError("");

      const res = await fetch(`/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to toggle status");
      }

      setProduct((prev) => (prev ? { ...prev, isActive: !prev.isActive } : null));
      flashSuccess(
        `Product ${!product.isActive ? "activated" : "deactivated"} successfully`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to toggle status";
      setError(msg);
    } finally {
      setTogglingProduct(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async () => {
    if (!product) return;
    try {
      setIsDeletingProduct(true);
      setError("");

      const res = await fetch(`/api/products/${product._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete product");
      }

      router.push("/products");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete product";
      setError(msg);
      setShowDeleteProductModal(false);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Toggle Price active status
  const handleTogglePriceStatus = async (price: PricePlan) => {
    try {
      const res = await fetch(`/api/prices/${price._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !price.isActive }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update price status");
      }

      setPrices((prev) =>
        prev.map((p) => (p._id === price._id ? { ...p, isActive: !price.isActive } : p))
      );
      setStats((prev) => ({
        ...prev,
        activePrices: price.isActive ? prev.activePrices - 1 : prev.activePrices + 1,
      }));
      flashSuccess(`Plan ${!price.isActive ? "activated" : "deactivated"} successfully`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to toggle price";
      setError(msg);
    }
  };

  // Add Price Submit
  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newPriceForm.amount);
    if (isNaN(amountNum) || amountNum < 0) {
      setPriceModalError("Please enter a valid non-negative price");
      return;
    }

    try {
      setIsSubmittingPrice(true);
      setPriceModalError("");

      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id,
          amount: amountNum,
          currency: newPriceForm.currency,
          interval: newPriceForm.interval,
          nickname: newPriceForm.nickname.trim(),
          isActive: newPriceForm.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add price plan");
      }

      setShowAddPriceModal(false);
      setNewPriceForm({
        nickname: "",
        amount: "",
        currency: "INR",
        interval: "monthly",
        isActive: true,
      });
      fetchProduct();
      flashSuccess("Pricing plan added successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add price plan";
      setPriceModalError(msg);
    } finally {
      setIsSubmittingPrice(false);
    }
  };

  // Open Edit Price modal
  const openEditPrice = (price: PricePlan) => {
    setEditingPrice(price);
    setEditPriceForm({
      nickname: price.nickname,
      amount: price.amount.toString(),
      currency: price.currency,
      interval: price.interval,
      isActive: price.isActive,
    });
    setPriceModalError("");
  };

  // Update Price Submit
  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrice) return;

    const amountNum = parseFloat(editPriceForm.amount);
    if (isNaN(amountNum) || amountNum < 0) {
      setPriceModalError("Please enter a valid non-negative price");
      return;
    }

    try {
      setIsUpdatingPrice(true);
      setPriceModalError("");

      const res = await fetch(`/api/prices/${editingPrice._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: editPriceForm.nickname.trim(),
          amount: amountNum,
          currency: editPriceForm.currency,
          interval: editPriceForm.interval,
          isActive: editPriceForm.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update price plan");
      }

      setEditingPrice(null);
      fetchProduct();
      flashSuccess("Pricing plan updated successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update price plan";
      setPriceModalError(msg);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  // Delete Price Submit
  const handleDeletePrice = async () => {
    if (!deletingPrice) return;

    try {
      setIsDeletingPrice(true);
      setError("");

      const res = await fetch(`/api/prices/${deletingPrice._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete price plan");
      }

      setDeletingPrice(null);
      fetchProduct();
      flashSuccess("Pricing plan deleted successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete price plan";
      setError(msg);
      setDeletingPrice(null);
    } finally {
      setIsDeletingPrice(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm text-gray-500">Loading product details...</p>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="space-y-4 max-w-xl mx-auto py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to load product</p>
            <p>{error}</p>
          </div>
        </div>
        <Link href="/products">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Navigation */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/products" className="hover:text-gray-900 transition-colors">
          Products
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{product.name}</span>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="font-bold text-red-400 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  product.isActive ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-400"
                }`}
              >
                <Package className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                  <Badge variant={product.isActive ? "success" : "secondary"}>
                    {product.isActive ? "Active Product" : "Inactive Product"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 max-w-2xl">
                  {product.description || "No description provided for this product."}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                  <span>Created: {formatDate(product.createdAt)}</span>
                  <span>•</span>
                  <span>Last updated: {formatDate(product.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={handleToggleProductStatus}
                disabled={togglingProduct}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  product.isActive
                    ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                    : "text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                }`}
              >
                {togglingProduct ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                <span>{product.isActive ? "Deactivate" : "Activate"}</span>
              </button>

              <Link href={`/products/${product._id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" /> Edit Details
                </Button>
              </Link>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteProductModal(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Plans</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalPrices}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Tag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Active Plans</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.activePrices}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Active Subscriptions</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {stats.activeSubscriptionsCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Subscriptions</p>
              <p className="text-2xl font-bold text-gray-700 mt-1">
                {stats.subscriptionsCount}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Plans Section */}
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Pricing Plans & Tiers
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure billing frequencies (monthly, yearly, one-time) and manage pricing availability.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setShowAddPriceModal(true);
                setPriceModalError("");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" /> Add Pricing Plan
            </Button>
          </div>

          {prices.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <Tag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-800">
                No pricing plans configured yet
              </p>
              <p className="text-xs text-gray-500 mt-1 mb-4">
                Customers cannot subscribe to this product until at least one pricing plan is added.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddPriceModal(true);
                  setPriceModalError("");
                }}
              >
                <Plus className="h-4 w-4" /> Add First Plan
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prices.map((price) => (
                <div
                  key={price._id}
                  className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                    price.isActive
                      ? "bg-white border-gray-200 shadow-xs"
                      : "bg-gray-50/70 border-gray-200 opacity-75"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                          price.interval === "monthly"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : price.interval === "yearly"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {price.interval === "one_time"
                          ? "One-Time Payment"
                          : price.interval === "monthly"
                          ? "Monthly Subscription"
                          : "Yearly Subscription"}
                      </span>
                      <Badge variant={price.isActive ? "success" : "secondary"}>
                        {price.isActive ? "Active" : "Archived"}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-gray-900 text-base">
                      {price.nickname || "Standard Tier"}
                    </h3>

                    {/* Price display */}
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900">
                        {formatCurrency(price.amount, price.currency)}
                      </span>
                      <span className="text-xs font-medium text-gray-500">
                        {price.interval === "monthly"
                          ? "/ month"
                          : price.interval === "yearly"
                          ? "/ year"
                          : "one-time"}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 mt-3">
                      Added on {formatDate(price.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePriceStatus(price)}
                      className={`text-xs font-medium px-2 py-1 rounded border inline-flex items-center gap-1 transition-colors ${
                        price.isActive
                          ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                          : "text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                      }`}
                    >
                      <Power className="h-3 w-3" />
                      <span>{price.isActive ? "Disable" : "Enable"}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditPrice(price)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100"
                        title="Edit Plan"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingPrice(price)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete Plan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Price Plan Modal */}
      {showAddPriceModal && (
        <Dialog open={true} onClose={() => setShowAddPriceModal(false)}>
          <DialogHeader>
            <DialogTitle>Add New Pricing Plan</DialogTitle>
            <DialogDescription>
              Create a new pricing tier for <strong>{product.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {priceModalError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {priceModalError}
            </div>
          )}

          <form onSubmit={handleAddPrice} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Plan Nickname / Name *
              </label>
              <Input
                placeholder="e.g. Pro Monthly, Starter Annual, Lifetime Access"
                value={newPriceForm.nickname}
                onChange={(e) =>
                  setNewPriceForm({ ...newPriceForm, nickname: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Billing Interval *
                </label>
                <Select
                  value={newPriceForm.interval}
                  onChange={(e) =>
                    setNewPriceForm({
                      ...newPriceForm,
                      interval: e.target.value as "monthly" | "yearly" | "one_time",
                    })
                  }
                >
                  <option value="monthly">Monthly Recurring</option>
                  <option value="yearly">Yearly Recurring</option>
                  <option value="one_time">One-time Fee</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Price (INR ₹) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 999"
                  required
                  value={newPriceForm.amount}
                  onChange={(e) =>
                    setNewPriceForm({ ...newPriceForm, amount: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="modalPriceIsActive"
                checked={newPriceForm.isActive}
                onChange={(e) =>
                  setNewPriceForm({ ...newPriceForm, isActive: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="modalPriceIsActive" className="text-xs text-gray-700 font-medium">
                Make plan active immediately
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddPriceModal(false)}
                disabled={isSubmittingPrice}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmittingPrice}
              >
                {isSubmittingPrice ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                  </>
                ) : (
                  "Create Plan"
                )}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Edit Price Plan Modal */}
      {editingPrice && (
        <Dialog open={true} onClose={() => setEditingPrice(null)}>
          <DialogHeader>
            <DialogTitle>Edit Pricing Plan</DialogTitle>
            <DialogDescription>
              Update tier settings and pricing for this plan.
            </DialogDescription>
          </DialogHeader>

          {priceModalError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {priceModalError}
            </div>
          )}

          <form onSubmit={handleUpdatePrice} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Plan Nickname
              </label>
              <Input
                value={editPriceForm.nickname}
                onChange={(e) =>
                  setEditPriceForm({ ...editPriceForm, nickname: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Billing Interval *
                </label>
                <Select
                  value={editPriceForm.interval}
                  onChange={(e) =>
                    setEditPriceForm({
                      ...editPriceForm,
                      interval: e.target.value as "monthly" | "yearly" | "one_time",
                    })
                  }
                >
                  <option value="monthly">Monthly Recurring</option>
                  <option value="yearly">Yearly Recurring</option>
                  <option value="one_time">One-time Fee</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Price (INR ₹) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={editPriceForm.amount}
                  onChange={(e) =>
                    setEditPriceForm({ ...editPriceForm, amount: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="editPriceIsActive"
                checked={editPriceForm.isActive}
                onChange={(e) =>
                  setEditPriceForm({ ...editPriceForm, isActive: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="editPriceIsActive" className="text-xs text-gray-700 font-medium">
                Plan is active for new subscriptions
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingPrice(null)}
                disabled={isUpdatingPrice}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isUpdatingPrice}
              >
                {isUpdatingPrice ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Delete Price Plan Modal */}
      {deletingPrice && (
        <Dialog open={true} onClose={() => setDeletingPrice(null)}>
          <DialogHeader>
            <DialogTitle>Delete Pricing Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the plan{" "}
              <strong>{deletingPrice.nickname}</strong> (
              {formatCurrency(deletingPrice.amount, deletingPrice.currency)})?
            </DialogDescription>
          </DialogHeader>

          <p className="mt-3 text-xs text-gray-500">
            If this pricing plan is currently used by any active subscriptions, deletion will be rejected to protect customer contracts.
          </p>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingPrice(null)}
              disabled={isDeletingPrice}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeletePrice}
              disabled={isDeletingPrice}
            >
              {isDeletingPrice ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Plan"
              )}
            </Button>
          </div>
        </Dialog>
      )}

      {/* Delete Product Modal */}
      {showDeleteProductModal && (
        <Dialog open={true} onClose={() => setShowDeleteProductModal(false)}>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Permanently delete product <strong>{product.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 space-y-1">
            <p className="font-semibold">⚠️ Warning:</p>
            <p>
              Deleting this product will also delete all {prices.length} attached pricing tiers.
            </p>
            {stats.activeSubscriptionsCount > 0 && (
              <p className="font-medium text-red-700">
                Notice: There are {stats.activeSubscriptionsCount} active subscription(s) tied to this product. Deletion will be rejected by the server to prevent data corruption.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteProductModal(false)}
              disabled={isDeletingProduct}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteProduct}
              disabled={isDeletingProduct}
            >
              {isDeletingProduct ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Product & Plans"
              )}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
