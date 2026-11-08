"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Save, Trash2, AlertCircle, Loader2 } from "lucide-react";

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
  const [error, setError] = useState("");
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

  useEffect(() => {
    async function fetchCustomer() {
      try {
        setLoading(true);
        setError("");
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
        const message = err instanceof Error ? err.message : "Failed to load customer";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchCustomer();
    }
  }, [id]);

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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update customer");
      }

      setSuccessMessage("Customer updated successfully!");
      setTimeout(() => {
        router.push("/customers");
      }, 900);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update customer";
      setError(message);
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
      setError(message);
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
        <p className="text-gray-500 font-medium">Loading customer details...</p>
      </div>
    );
  }

  if (error && !form.name) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-red-900 mb-1">Failed to Load Customer</h2>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <Link href="/customers">
              <Button variant="outline">Back to Customers</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/customers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Customer</h1>
          <p className="text-sm text-gray-500">Update customer profile and billing information</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete Customer
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-medium">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Customer contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Acme Corp or John Doe"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="email"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <Input
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Internal Notes
                </label>
                <Textarea
                  placeholder="Important notes about this customer..."
                  rows={4}
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Billing Address */}
          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
              <CardDescription>Address used for invoice tax and receipts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <Input
                  placeholder="123 Main Street, Suite 400"
                  value={form.billingAddress.street}
                  onChange={(e) => updateForm("billingAddress.street", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input
                    placeholder="Mumbai"
                    value={form.billingAddress.city}
                    onChange={(e) => updateForm("billingAddress.city", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal / Zip Code
                  </label>
                  <Input
                    placeholder="400001"
                    value={form.billingAddress.zipCode}
                    onChange={(e) => updateForm("billingAddress.zipCode", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
          <Link href="/customers">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Delete Customer</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong className="text-gray-900">{form.name}</strong>? This action cannot be undone and will permanently remove this customer profile.
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
          <p className="text-gray-500 font-medium">Loading customer details...</p>
        </div>
      }
    >
      <EditCustomerContent {...props} />
    </Suspense>
  );
}
