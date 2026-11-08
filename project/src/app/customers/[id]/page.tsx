"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

function CustomerDetailContent({ params }: CustomerDetailsPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

        setCustomer(data.customer);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load customer";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchCustomer();
    }
  }, [id]);

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
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
        <p className="text-gray-500 font-medium">Loading customer profile...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-red-900 mb-1">Customer Not Found</h2>
            <p className="text-sm text-red-700 mb-4">{error || "The customer could not be found."}</p>
            <Link href="/customers">
              <Button variant="outline">Back to Customer List</Button>
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/customers"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Active Customer
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/customers/${customer._id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit Customer
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Profile Info */}
        <Card className="lg:col-span-1 border-gray-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100">
              <div className="w-20 h-20 rounded-2xl bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-2xl shadow-sm mb-4">
                {initials}
              </div>
              <h2 className="text-lg font-bold text-gray-900">{customer.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{customer.email}</p>
            </div>

            <div className="pt-6 space-y-4 text-sm">
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Contact Information
                </span>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{customer.email}</span>
                  </div>
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Joined {new Date(customer.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                  Billing Address
                </span>
                <div className="flex items-start gap-2 text-gray-700 mt-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    {customer.billingAddress?.street && <p>{customer.billingAddress.street}</p>}
                    <p>
                      {[customer.billingAddress?.city, customer.billingAddress?.state, customer.billingAddress?.zipCode]
                        .filter(Boolean)
                        .join(", ") || "No street/city specified"}
                    </p>
                    {customer.billingAddress?.country && <p>{customer.billingAddress.country}</p>}
                  </div>
                </div>
              </div>

              {customer.notes && (
                <div className="pt-4 border-t border-gray-100">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                    Internal Notes
                  </span>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs mt-2 whitespace-pre-wrap">
                    {customer.notes}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Activity / Subscriptions / Invoices Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscriptions Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-blue-600" />
                  Subscriptions
                </CardTitle>
                <CardDescription>Active plans and recurring billing cycles</CardDescription>
              </div>
              <Link href="/subscriptions">
                <Button variant="outline" size="sm">
                  View Subscriptions
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 bg-gray-50/70 rounded-lg border border-dashed border-gray-200">
                <p className="text-sm font-medium text-gray-600">No active subscriptions yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Subscribe this customer to a plan in Phase 3.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  Invoices
                </CardTitle>
                <CardDescription>Billed invoices, amounts, and payment statuses</CardDescription>
              </div>
              <Link href="/invoices">
                <Button variant="outline" size="sm">
                  View Invoices
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 bg-gray-50/70 rounded-lg border border-dashed border-gray-200">
                <p className="text-sm font-medium text-gray-600">No invoices issued yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Generated invoices will appear here in Phase 4.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payments Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  Payments
                </CardTitle>
                <CardDescription>Payment transaction history</CardDescription>
              </div>
              <Link href="/payments">
                <Button variant="outline" size="sm">
                  View Payments
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 bg-gray-50/70 rounded-lg border border-dashed border-gray-200">
                <p className="text-sm font-medium text-gray-600">No payments recorded yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Payment records will be logged here in Phase 5.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Delete Customer</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong className="text-gray-900">{customer.name}</strong>? This will permanently delete this customer profile.
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
