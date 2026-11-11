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
  Package,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Tag,
  ArrowRight,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Power,
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
}

interface ProductItem {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  prices: PricePlan[];
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  totalPrices: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    totalPrices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [intervalFilter, setIntervalFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(9);

  // Quick Action States
  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  // Quick Add Price Modal state
  const [quickAddTarget, setQuickAddTarget] = useState<ProductItem | null>(null);
  const [quickPriceForm, setQuickPriceForm] = useState({
    nickname: "",
    amount: "",
    currency: "INR",
    interval: "monthly" as "monthly" | "yearly" | "one_time",
    isActive: true,
  });
  const [isAddingPrice, setIsAddingPrice] = useState(false);
  const [priceFormError, setPriceFormError] = useState("");

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setActionError("");
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (intervalFilter !== "all") params.set("interval", intervalFilter);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load products");
      }

      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to load products";
      setActionError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, intervalFilter, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle product active toggle
  const handleToggleProductStatus = async (product: ProductItem) => {
    try {
      setStatusTogglingId(product._id);
      setActionError("");

      const res = await fetch(`/api/products/${product._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !product.isActive }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update product status");
      }

      // Update state locally
      setProducts((prev) =>
        prev.map((p) =>
          p._id === product._id ? { ...p, isActive: !product.isActive } : p
        )
      );

      // Refresh stats
      setStats((prev) => ({
        ...prev,
        activeProducts: product.isActive
          ? prev.activeProducts - 1
          : prev.activeProducts + 1,
        inactiveProducts: product.isActive
          ? prev.inactiveProducts + 1
          : prev.inactiveProducts - 1,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to toggle status";
      setActionError(msg);
    } finally {
      setStatusTogglingId(null);
    }
  };

  // Handle product deletion
  const handleDeleteProduct = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      setActionError("");

      const res = await fetch(`/api/products/${deleteTarget._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete product");
      }

      setDeleteTarget(null);
      fetchProducts();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to delete product";
      setActionError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Quick Add Price submission
  const handleQuickAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTarget) return;

    const amountNum = parseFloat(quickPriceForm.amount);
    if (isNaN(amountNum) || amountNum < 0) {
      setPriceFormError("Please enter a valid non-negative amount");
      return;
    }

    try {
      setIsAddingPrice(true);
      setPriceFormError("");

      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: quickAddTarget._id,
          amount: amountNum,
          currency: quickPriceForm.currency,
          interval: quickPriceForm.interval,
          nickname: quickPriceForm.nickname.trim(),
          isActive: quickPriceForm.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add price plan");
      }

      setQuickAddTarget(null);
      setQuickPriceForm({
        nickname: "",
        amount: "",
        currency: "INR",
        interval: "monthly",
        isActive: true,
      });
      fetchProducts();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to add price";
      setPriceFormError(msg);
    } finally {
      setIsAddingPrice(false);
    }
  };

  const getIntervalBadge = (interval: PricePlan["interval"]) => {
    switch (interval) {
      case "monthly":
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Monthly</span>;
      case "yearly":
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">Yearly</span>;
      case "one_time":
        return <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">One-Time</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Products & Pricing
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your service offerings, billing tiers (Monthly, Yearly, One-time), and plan availability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProducts()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Link href="/products/new">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Action Error Alert */}
      {actionError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
          <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1">
            <p className="font-semibold">Notice</p>
            <p>{actionError}</p>
          </div>
          <button
            onClick={() => setActionError("")}
            className="text-red-400 hover:text-red-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Products</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalProducts}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Active Products</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeProducts}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Inactive Products</p>
              <p className="text-2xl font-bold text-gray-500 mt-1">{stats.inactiveProducts}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Price Plans</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalPrices}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Tag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products by title or description..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-gray-50/50"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
              {/* Status Filter */}
              <div className="w-36">
                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Status: All</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </Select>
              </div>

              {/* Interval Filter */}
              <div className="w-40">
                <Select
                  value={intervalFilter}
                  onChange={(e) => {
                    setIntervalFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Plan: All Types</option>
                  <option value="monthly">Monthly Plans</option>
                  <option value="yearly">Yearly Plans</option>
                  <option value="one_time">One-time Fee</option>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="w-36">
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");
                    setSortBy(field);
                    setSortOrder(order as "asc" | "desc");
                    setPage(1);
                  }}
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="name-asc">Name (A–Z)</option>
                  <option value="name-desc">Name (Z–A)</option>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded ${
                    viewMode === "grid"
                      ? "bg-white shadow-xs text-blue-600"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded ${
                    viewMode === "table"
                      ? "bg-white shadow-xs text-blue-600"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Table View"
                >
                  <TableIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
          <p className="text-sm text-gray-500">Loading products & pricing...</p>
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Package className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No products found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              {search || statusFilter !== "all" || intervalFilter !== "all"
                ? "No products match your active search and filter criteria. Try clearing some filters."
                : "You have not created any products yet. Get started by adding your first product and pricing tiers."}
            </p>
            <div className="mt-5 flex gap-3">
              {search || statusFilter !== "all" || intervalFilter !== "all" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setIntervalFilter("all");
                    setPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Link href="/products/new">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4" />
                    Create Your First Product
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.map((product) => (
            <Card
              key={product._id}
              className={`flex flex-col transition-all duration-200 hover:shadow-md ${
                !product.isActive ? "border-gray-200 bg-gray-50/60 opacity-80" : "bg-white"
              }`}
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                          product.isActive
                            ? "bg-blue-50 text-blue-600"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <Link
                          href={`/products/${product._id}`}
                          className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1 transition-colors"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-gray-400">
                          Added {formatDate(product.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={product.isActive ? "success" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-600 mt-2 line-clamp-2 min-h-[32px]">
                    {product.description || "No description provided for this product."}
                  </p>

                  {/* Pricing Plans List */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Pricing Plans ({product.prices.length})
                      </span>
                      <button
                        onClick={() => {
                          setQuickAddTarget(product);
                          setPriceFormError("");
                        }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                      >
                        <Plus className="h-3 w-3" /> Add Plan
                      </button>
                    </div>

                    {product.prices.length === 0 ? (
                      <div className="bg-gray-50 rounded-lg p-2.5 text-center text-xs text-gray-400 border border-dashed border-gray-200">
                        No pricing plans yet. Add one to start billing.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {product.prices.map((price) => (
                          <div
                            key={price._id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                              price.isActive
                                ? "bg-white border-gray-200"
                                : "bg-gray-50 border-gray-200 text-gray-400 line-through"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {getIntervalBadge(price.interval)}
                              <span className="font-medium text-gray-800">
                                {price.nickname || "Plan"}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-gray-900">
                                {formatCurrency(price.amount, price.currency)}
                              </span>
                              <span className="text-[10px] text-gray-500 ml-1">
                                {price.interval === "monthly"
                                  ? "/mo"
                                  : price.interval === "yearly"
                                  ? "/yr"
                                  : ""}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleProductStatus(product)}
                    disabled={statusTogglingId === product._id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      product.isActive
                        ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                        : "text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                    }`}
                    title={product.isActive ? "Deactivate Product" : "Activate Product"}
                  >
                    {statusTogglingId === product._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Power className="h-3.5 w-3.5" />
                    )}
                    <span>{product.isActive ? "Disable" : "Enable"}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(product)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <Link
                      href={`/products/${product._id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <span>Manage</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3.5">Product</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Pricing Plans</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((product) => (
                  <tr
                    key={product._id}
                    className={`hover:bg-gray-50/70 transition-colors ${
                      !product.isActive ? "bg-gray-50/30" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            product.isActive
                              ? "bg-blue-50 text-blue-600"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          <Package className="h-5 w-5" />
                        </div>
                        <div>
                          <Link
                            href={`/products/${product._id}`}
                            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-gray-500 line-clamp-1 max-w-xs mt-0.5">
                            {product.description || "No description"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={product.isActive ? "success" : "secondary"}>
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {product.prices.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">No plans</span>
                        ) : (
                          product.prices.map((p) => (
                            <span
                              key={p._id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${
                                p.isActive
                                  ? "bg-gray-50 border-gray-200 text-gray-700"
                                  : "bg-gray-100 border-gray-200 text-gray-400 line-through"
                              }`}
                            >
                              <span className="font-semibold">{formatCurrency(p.amount, p.currency)}</span>
                              <span className="text-[10px] text-gray-500">
                                ({p.interval === "one_time" ? "1-time" : p.interval})
                              </span>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(product.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleProductStatus(product)}
                          disabled={statusTogglingId === product._id}
                          className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
                            product.isActive
                              ? "text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100"
                              : "text-green-700 bg-green-50 border-green-200 hover:bg-green-100"
                          }`}
                          title={product.isActive ? "Disable Product" : "Enable Product"}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAddTarget(product);
                            setPriceFormError("");
                          }}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-blue-200"
                          title="Add Price Plan"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          href={`/products/${product._id}`}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-gray-100 border border-gray-200 inline-flex items-center"
                          title="Manage Product"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 border border-red-200"
                          title="Delete Product"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-xs text-gray-500">
            Showing <span className="font-semibold">{(page - 1) * limit + 1}</span> to{" "}
            <span className="font-semibold">
              {Math.min(page * limit, total)}
            </span>{" "}
            of <span className="font-semibold">{total}</span> products
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-xs font-medium px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Quick Add Price Plan Modal */}
      {quickAddTarget && (
        <Dialog open={true} onClose={() => setQuickAddTarget(null)}>
          <DialogHeader>
            <DialogTitle>Add Pricing Plan</DialogTitle>
            <DialogDescription>
              Add a new pricing tier to <strong>{quickAddTarget.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          {priceFormError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              {priceFormError}
            </div>
          )}

          <form onSubmit={handleQuickAddPrice} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Plan Nickname / Name
              </label>
              <Input
                placeholder="e.g. Pro Monthly, Starter Annual, Lifetime Access"
                value={quickPriceForm.nickname}
                onChange={(e) =>
                  setQuickPriceForm({ ...quickPriceForm, nickname: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Billing Interval *
                </label>
                <Select
                  value={quickPriceForm.interval}
                  onChange={(e) =>
                    setQuickPriceForm({
                      ...quickPriceForm,
                      interval: e.target.value as "monthly" | "yearly" | "one_time",
                    })
                  }
                >
                  <option value="monthly">Monthly Recurring</option>
                  <option value="yearly">Yearly Recurring</option>
                  <option value="one_time">One-time Payment</option>
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
                  value={quickPriceForm.amount}
                  onChange={(e) =>
                    setQuickPriceForm({ ...quickPriceForm, amount: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="priceIsActive"
                checked={quickPriceForm.isActive}
                onChange={(e) =>
                  setQuickPriceForm({ ...quickPriceForm, isActive: e.target.checked })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="priceIsActive" className="text-xs text-gray-700 font-medium">
                Make this price plan active immediately for new subscriptions
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickAddTarget(null)}
                disabled={isAddingPrice}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isAddingPrice}
              >
                {isAddingPrice ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Adding...
                  </>
                ) : (
                  "Create Price Plan"
                )}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Dialog open={true} onClose={() => setDeleteTarget(null)}>
          <DialogHeader>
            <DialogTitle>Confirm Product Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete{" "}
              <strong>{deleteTarget.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
            <p className="font-semibold">⚠️ Deletion Warning:</p>
            <p>
              This will also permanently delete all <strong>{deleteTarget.prices.length}</strong> associated pricing plan(s).
            </p>
            <p className="text-gray-600">
              Note: If any active subscriptions depend on this product, deletion will be blocked to safeguard database integrity.
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteProduct}
              disabled={isDeleting}
            >
              {isDeleting ? (
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
