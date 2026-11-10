"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import {
  Package,
  Plus,
  Trash2,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";

interface InitialPricePlan {
  nickname: string;
  interval: "monthly" | "yearly" | "one_time";
  amount: string;
  currency: string;
  isActive: boolean;
}

export default function NewProductPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [prices, setPrices] = useState<InitialPricePlan[]>([
    {
      nickname: "Basic Monthly",
      interval: "monthly",
      amount: "499",
      currency: "INR",
      isActive: true,
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddPrice = (intervalType: "monthly" | "yearly" | "one_time" = "monthly") => {
    let defaultNickname = "Monthly Plan";
    let defaultAmount = "999";
    if (intervalType === "yearly") {
      defaultNickname = "Annual Plan";
      defaultAmount = "9999";
    } else if (intervalType === "one_time") {
      defaultNickname = "Lifetime Access";
      defaultAmount = "4999";
    }

    setPrices((prev) => [
      ...prev,
      {
        nickname: defaultNickname,
        interval: intervalType,
        amount: defaultAmount,
        currency: "INR",
        isActive: true,
      },
    ]);
  };

  const handleRemovePrice = (index: number) => {
    setPrices((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePriceChange = (
    index: number,
    field: keyof InitialPricePlan,
    value: unknown
  ) => {
    setPrices((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Product name is required");
      return;
    }

    // Validate prices
    for (let i = 0; i < prices.length; i++) {
      const p = prices[i];
      const amountNum = parseFloat(p.amount);
      if (isNaN(amountNum) || amountNum < 0) {
        setError(`Plan #${i + 1} has an invalid price amount.`);
        return;
      }
    }

    try {
      setLoading(true);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        isActive,
        prices: prices.map((p) => ({
          nickname: p.nickname.trim(),
          interval: p.interval,
          amount: parseFloat(p.amount),
          currency: p.currency,
          isActive: p.isActive,
        })),
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create product");
      }

      router.push(`/products/${data.product._id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create product";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Back Button */}
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Create New Product
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Define product details and configure your pricing tiers (monthly, yearly, or one-time).
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Product Information */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
              <Package className="h-5 w-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">
                Product Details
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Product Name *
              </label>
              <Input
                placeholder="e.g. Pro SaaS Suite, Cloud Storage Plan, Consulting Pack"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-base font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                rows={3}
                placeholder="Describe what features, limits, or benefits are included with this product..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="pt-2 flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">Product Status</p>
                <p className="text-xs text-gray-500">
                  When enabled, this product is visible in subscription creation flows.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Pricing Plans */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Pricing Plans & Billing Cycles
                  </h2>
                  <p className="text-xs text-gray-500">
                    Set up monthly, annual, or one-time payment options for this product.
                  </p>
                </div>
              </div>

              {/* Quick Add Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddPrice("monthly")}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-600" /> + Monthly
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddPrice("yearly")}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5 text-purple-600" /> + Yearly
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddPrice("one_time")}
                  className="text-xs"
                >
                  <Plus className="h-3.5 w-3.5 text-amber-600" /> + One-Time
                </Button>
              </div>
            </div>

            {prices.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">No pricing plans added</p>
                <p className="text-xs text-gray-400 mt-1 mb-3">
                  Products should have at least one pricing plan to be subscribable.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddPrice("monthly")}
                >
                  <Plus className="h-4 w-4" /> Add Price Plan
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {prices.map((plan, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        Tier #{index + 1}
                      </span>
                      {prices.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePrice(index)}
                          className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove Tier
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Tier / Plan Name
                        </label>
                        <Input
                          placeholder="e.g. Standard, Pro, Enterprise"
                          value={plan.nickname}
                          onChange={(e) =>
                            handlePriceChange(index, "nickname", e.target.value)
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Billing Cycle *
                        </label>
                        <Select
                          value={plan.interval}
                          onChange={(e) =>
                            handlePriceChange(
                              index,
                              "interval",
                              e.target.value as "monthly" | "yearly" | "one_time"
                            )
                          }
                        >
                          <option value="monthly">Monthly Recurring (/mo)</option>
                          <option value="yearly">Yearly Recurring (/yr)</option>
                          <option value="one_time">One-time / Lifetime</option>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Price ({plan.currency} ₹) *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={plan.amount}
                          onChange={(e) =>
                            handlePriceChange(index, "amount", e.target.value)
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id={`plan-active-${index}`}
                        checked={plan.isActive}
                        onChange={(e) =>
                          handlePriceChange(index, "isActive", e.target.checked)
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <label
                        htmlFor={`plan-active-${index}`}
                        className="text-xs text-gray-600"
                      >
                        Plan is active and immediately selectable for subscriptions
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/products">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" /> Save Product
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
