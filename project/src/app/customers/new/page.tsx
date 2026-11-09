"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, AlertCircle, Loader2, CheckCircle2, User, Mail, Phone, MapPin, FileText } from "lucide-react";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    billingAddress: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India",
    },
    notes: "",
  });

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    zipCode?: string;
    notes?: string;
  }>({});

  function validateField(field: string, value: string): string | undefined {
    if (field === "name") {
      const trimmed = value.trim();
      if (!trimmed) return "Customer or company name is required.";
      if (trimmed.length < 2) return "Name must be at least 2 characters long.";
      if (trimmed.length > 100) return "Name cannot exceed 100 characters.";
    }

    if (field === "email") {
      const trimmed = value.trim();
      if (!trimmed) return "Email address is required.";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) return "Please enter a valid email address (e.g. name@domain.com).";
    }

    if (field === "phone") {
      const trimmed = value.trim();
      if (trimmed) {
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/;
        if (!phoneRegex.test(trimmed)) {
          return "Please enter a valid phone number format.";
        }
      }
    }

    if (field === "billingAddress.zipCode") {
      const trimmed = value.trim();
      if (trimmed && trimmed.length > 15) {
        return "Postal code cannot exceed 15 characters.";
      }
    }

    if (field === "notes") {
      if (value.length > 1000) {
        return "Internal notes cannot exceed 1000 characters.";
      }
    }

    return undefined;
  }

  function updateForm(field: string, value: string) {
    if (field.startsWith("billingAddress.")) {
      const addressField = field.split(".")[1];
      setForm((prev) => ({
        ...prev,
        billingAddress: { ...prev.billingAddress, [addressField]: value },
      }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }

    // Live validation cleanup
    const errorKey = field.startsWith("billingAddress.") ? field.split(".")[1] : field;
    const error = validateField(field, value);
    setErrors((prev) => ({
      ...prev,
      [errorKey]: error,
    }));
  }

  function validateAll(): boolean {
    const newErrors: typeof errors = {};

    const nameErr = validateField("name", form.name);
    if (nameErr) newErrors.name = nameErr;

    const emailErr = validateField("email", form.email);
    if (emailErr) newErrors.email = emailErr;

    const phoneErr = validateField("phone", form.phone);
    if (phoneErr) newErrors.phone = phoneErr;

    const zipErr = validateField("billingAddress.zipCode", form.billingAddress.zipCode);
    if (zipErr) newErrors.zipCode = zipErr;

    const notesErr = validateField("notes", form.notes);
    if (notesErr) newErrors.notes = notesErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    if (!validateAll()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        billingAddress: {
          street: form.billingAddress.street.trim(),
          city: form.billingAddress.city.trim(),
          state: form.billingAddress.state.trim(),
          zipCode: form.billingAddress.zipCode.trim(),
          country: form.billingAddress.country.trim() || "India",
        },
        notes: form.notes.trim(),
      };

      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create customer");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/customers/${data.customer._id}`);
      }, 700);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create customer";
      setServerError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers Directory
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Add New Customer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create an account profile to manage subscriptions, generate invoices, and log payments.
        </p>
      </div>

      {serverError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-900">Unable to create customer</h4>
            <p className="text-sm text-red-700 mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium">Customer created successfully! Redirecting to profile...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100 flex flex-row items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <User className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Basic Details</CardTitle>
                <CardDescription>Primary identity and contact info</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Full Name / Organization <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Acme Corporation or Jane Doe"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  className={errors.name ? "border-red-400 focus:ring-red-400" : ""}
                />
                {errors.name && <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  required
                  placeholder="billing@acme.com"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  className={errors.email ? "border-red-400 focus:ring-red-400" : ""}
                />
                {errors.email && <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.email}</p>}
                <p className="text-xs text-gray-400 mt-1">Invoices and renewal alerts will be sent here.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  className={errors.phone ? "border-red-400 focus:ring-red-400" : ""}
                />
                {errors.phone && <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.phone}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Internal Notes
                  </label>
                  <span className="text-xs text-gray-400">{form.notes.length}/1000</span>
                </div>
                <Textarea
                  placeholder="Private remarks (e.g. VIP client, preferred billing cycle, accounting contact)..."
                  rows={4}
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  className={errors.notes ? "border-red-400 focus:ring-red-400 text-sm" : "text-sm"}
                />
                {errors.notes && <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.notes}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Billing Address Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-gray-100 flex flex-row items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Billing Address</CardTitle>
                <CardDescription>Address used on tax invoices</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  Street Address
                </label>
                <Input
                  placeholder="e.g. 102 Business Tower, Sector 5"
                  value={form.billingAddress.street}
                  onChange={(e) => updateForm("billingAddress.street", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    City
                  </label>
                  <Input
                    placeholder="Mumbai"
                    value={form.billingAddress.city}
                    onChange={(e) => updateForm("billingAddress.city", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    State / Province
                  </label>
                  <Input
                    placeholder="Maharashtra"
                    value={form.billingAddress.state}
                    onChange={(e) => updateForm("billingAddress.state", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Postal / ZIP Code
                  </label>
                  <Input
                    placeholder="400001"
                    value={form.billingAddress.zipCode}
                    onChange={(e) => updateForm("billingAddress.zipCode", e.target.value)}
                    className={errors.zipCode ? "border-red-400 focus:ring-red-400" : ""}
                  />
                  {errors.zipCode && <p className="text-xs text-red-600 mt-1 font-medium">{errors.zipCode}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Country
                  </label>
                  <Input
                    placeholder="India"
                    value={form.billingAddress.country}
                    onChange={(e) => updateForm("billingAddress.country", e.target.value)}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/50 text-xs text-blue-800 flex items-start gap-2 mt-4">
                <FileText className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  Address fields will be dynamically mapped to generated PDF invoices and GST compliance filings.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href="/customers">
            <Button type="button" variant="outline" className="border-gray-300">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading || success}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Customer
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
