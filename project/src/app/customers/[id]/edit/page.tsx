"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Save, Trash2, AlertCircle, Loader2, CheckCircle2, User, MapPin } from "lucide-react";

interface EditCustomerPageProps {
  params: Promise<{ id: string }>;
}

function EditCustomerContent({ params }: EditCustomerPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  useEffect(() => {
    async function fetchCustomer() {
      try {
        setLoading(true);
        setServerError("");
        const res = await fetch(`/api/customers/${id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Customer not found");
        }

        const customer = data.customer;
        setForm({
          name: customer.name || "",
          email: customer.email || "",
          phone: customer.phone || "",
          billingAddress: {
            street: customer.billingAddress?.street || "",
            city: customer.billingAddress?.city || "",
            state: customer.billingAddress?.state || "",
            zipCode: customer.billingAddress?.zipCode || "",
            country: customer.billingAddress?.country || "India",
          },
          notes: customer.notes || "",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load customer profile";
        setServerError(message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchCustomer();
    }
  }, [id]);

  function validateField(field: string, value: string): string | undefined {
    if (field === "name") {
      const trimmed = value.trim();
      if (!trimmed) return "Customer name cannot be empty.";
      if (trimmed.length < 2) return "Name must be at least 2 characters long.";
      if (trimmed.length > 100) return "Name cannot exceed 100 characters.";
    }

    if (field === "email") {
      const trimmed = value.trim();
      if (!trimmed) return "Email address cannot be empty.";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) return "Please enter a valid email address.";
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
    setSuccessMessage("");

    if (!validateAll()) {
      return;
    }

    setSaving(true);

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

      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update customer");
      }

      setSuccessMessage("Customer profile updated successfully!");
      setTimeout(() => {
        router.push(`/customers/${id}`);
      }, 700);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update customer";
      setServerError(message);
    } finally {
      setSaving(false);
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
      const message = err instanceof Error ? err.message : "Failed to delete customer";
      setServerError(message);
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
        <p className="text-gray-600 font-medium">Loading customer profile...</p>
      </div>
    );
  }

  if (serverError && !form.name) {
    return (
      <div className="max-w-xl mx-auto py-16">
        <Card className="border-red-200 bg-red-50 shadow-sm">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-900 mb-1">Customer Not Found</h2>
            <p className="text-sm text-red-700 mb-6">{serverError}</p>
            <Link href="/customers">
              <Button variant="outline">Back to Customers</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Header Bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <Link
            href={`/customers/${id}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customer Profile
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Edit Customer
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Update contact details, billing address, or staff notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Customer
          </Button>
        </div>
      </div>

      {serverError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-900">Update Failed</h4>
            <p className="text-sm text-red-700 mt-0.5">{serverError}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 shadow-xs">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium">{successMessage} Returning to profile...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
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
                  placeholder="e.g. Acme Corporation"
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
                  placeholder="Staff remarks regarding terms, client requests, or preferences..."
                  rows={4}
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  className={errors.notes ? "border-red-400 focus:ring-red-400 text-sm" : "text-sm"}
                />
                {errors.notes && <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.notes}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Billing Address */}
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
                  placeholder="123 Main Street"
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
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Link href={`/customers/${id}`}>
            <Button type="button" variant="outline" className="border-gray-300">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Confirm Delete Customer</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong className="text-gray-900">{form.name}</strong>?
            This will permanently remove this customer profile.
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
                Deleting...
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

export default function EditCustomerPage(props: EditCustomerPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-gray-500 font-medium">Loading editor...</p>
        </div>
      }
    >
      <EditCustomerContent {...props} />
    </Suspense>
  );
}
