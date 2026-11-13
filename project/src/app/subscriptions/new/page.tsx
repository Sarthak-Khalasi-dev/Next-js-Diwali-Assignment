"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CreditCard,
  User,
  Package,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CustomerOption {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  status?: string;
}

interface PriceOption {
  _id: string;
  product: string;
  amount: number;
  currency: string;
  interval: "monthly" | "yearly" | "one_time";
  nickname?: string;
  isActive: boolean;
}

interface ProductOption {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  prices: PriceOption[];
}

export default function NewSubscriptionPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form selections
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedPriceId, setSelectedPriceId] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingData(true);
        const [custRes, prodRes] = await Promise.all([
          fetch("/api/customers?limit=100"),
          fetch("/api/products?status=active&limit=100"),
        ]);

        if (custRes.ok) {
          const custData = await custRes.json();
          setCustomers(custData.customers || []);
          if (custData.customers?.length > 0) {
            setSelectedCustomerId(custData.customers[0]._id);
          }
        }

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          const activeProds: ProductOption[] = (prodData.products || []).filter(
            (p: ProductOption) => p.prices && p.prices.length > 0
          );
          setProducts(activeProds);
          if (activeProds.length > 0) {
            setSelectedProductId(activeProds[0]._id);
            if (activeProds[0].prices.length > 0) {
              setSelectedPriceId(activeProds[0].prices[0]._id);
            }
          }
        }
      } catch (err: unknown) {
        console.error("Failed to load setup options:", err);
        setError("Could not load customers or products. Please check connection.");
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, []);

  const selectedCustomer = customers.find((c) => c._id === selectedCustomerId);
  const selectedProduct = products.find((p) => p._id === selectedProductId);

  // When selected product changes, auto-select first available price tier
  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p._id === productId);
    if (prod && prod.prices && prod.prices.length > 0) {
      setSelectedPriceId(prod.prices[0]._id);
    } else {
      setSelectedPriceId("");
    }
  };

  const selectedPrice = selectedProduct?.prices?.find(
    (p) => p._id === selectedPriceId
  );

  // Compute calculated renewal date
  const computeNextRenewal = () => {
    if (!startDate || !selectedPrice) return null;
    const d = new Date(startDate);
    if (selectedPrice.interval === "monthly") {
      d.setMonth(d.getMonth() + 1);
    } else if (selectedPrice.interval === "yearly") {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      return "One-time (No recurring renewal)";
    }
    return formatDate(d);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError("Please select a customer.");
      return;
    }
    if (!selectedProductId) {
      setError("Please select a product.");
      return;
    }
    if (!selectedPriceId) {
      setError("Please select a pricing plan.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: selectedCustomerId,
          product: selectedProductId,
          price: selectedPriceId,
          startDate: new Date(startDate).toISOString(),
          notes,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to create subscription");
      }

      const created = await res.json();
      router.push(`/subscriptions/${created._id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating subscription";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm">Preparing subscription builder...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button and page heading */}
      <div className="flex items-center gap-4">
        <Link href="/subscriptions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Subscriptions
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Subscription</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Assign recurring pricing plans to customer accounts
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-800">No Customers Found</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              You must have at least one customer created before starting a subscription.
            </p>
            <Link href="/customers/new">
              <Button size="sm">Add Customer First</Button>
            </Link>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-10 w-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-800">No Active Products Available</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-4">
              Please create an active product with at least one pricing tier before creating a subscription.
            </p>
            <Link href="/products/new">
              <Button size="sm">Create Product</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main selection forms */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Customer Selection */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center">
                    1
                  </div>
                  <CardTitle className="text-base">Select Customer</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full"
                >
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </Select>

                {selectedCustomer && (
                  <div className="p-3 bg-gray-50 rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{selectedCustomer.name}</p>
                      <p className="text-gray-500">{selectedCustomer.email}</p>
                    </div>
                    {selectedCustomer.phone && (
                      <span className="text-gray-500">{selectedCustomer.phone}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Product & Plan Selection */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center">
                    2
                  </div>
                  <CardTitle className="text-base">Choose Product & Plan</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Product
                  </label>
                  <Select
                    value={selectedProductId}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full"
                  >
                    {products.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.prices?.length || 0} pricing tiers)
                      </option>
                    ))}
                  </Select>
                </div>

                {selectedProduct && selectedProduct.prices && selectedProduct.prices.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Pricing Tier
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedProduct.prices.map((price) => {
                        const isSelected = selectedPriceId === price._id;
                        return (
                          <div
                            key={price._id}
                            onClick={() => setSelectedPriceId(price._id)}
                            className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/50"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm text-gray-900 capitalize">
                                  {price.nickname || `${price.interval} Plan`}
                                </p>
                                <span className="text-xs text-gray-500 capitalize">
                                  per {price.interval.replace("_", " ")}
                                </span>
                              </div>
                              <span className="font-bold text-sm text-gray-900">
                                {formatCurrency(price.amount, price.currency)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Schedule & Notes */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center">
                    3
                  </div>
                  <CardTitle className="text-base">Subscription Schedule</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Billing cycle calculation commences from this date.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Internal Notes (Optional)
                  </label>
                  <Textarea
                    placeholder="e.g. Special promotional discount agreed, corporate client"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Order Summary Card */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader className="bg-gray-50/60 pb-3">
                <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Subscription Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Customer</span>
                    <span className="font-medium text-gray-900 truncate max-w-[150px]">
                      {selectedCustomer?.name || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Product</span>
                    <span className="font-medium text-gray-900">
                      {selectedProduct?.name || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Plan Tier</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {selectedPrice?.nickname || selectedPrice?.interval || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Billing Interval</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {selectedPrice?.interval.replace("_", " ") || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Starts On</span>
                    <span className="font-medium text-gray-900">
                      {startDate ? formatDate(startDate) : "-"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500">Next Renewal</span>
                    <span className="font-medium text-blue-600">
                      {computeNextRenewal() || "-"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-sm font-semibold text-gray-800">Recurring Total</span>
                    <span className="text-xl font-bold text-gray-900">
                      {selectedPrice
                        ? formatCurrency(selectedPrice.amount, selectedPrice.currency)
                        : "₹0.00"}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting || !selectedCustomerId || !selectedPriceId}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Activating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Activate Subscription
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      )}
    </div>
  );
}
