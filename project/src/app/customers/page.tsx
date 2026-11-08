"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Trash2,
  ExternalLink,
  LayoutGrid,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Loader2,
  Building,
} from "lucide-react";
import Link from "next/link";

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  notes?: string;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(9);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setActionError("");
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedCountry && selectedCountry !== "ALL") params.set("country", selectedCountry);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load customers");
      }

      setCustomers(data.customers || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.availableCountries && Array.isArray(data.availableCountries)) {
        setAvailableCountries(data.availableCountries);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to load customers";
      setActionError(msg);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCountry, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedCountry(e.target.value);
    setPage(1);
  }

  function handleSortChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "newest") {
      setSortBy("createdAt");
      setSortOrder("desc");
    } else if (val === "oldest") {
      setSortBy("createdAt");
      setSortOrder("asc");
    } else if (val === "name-asc") {
      setSortBy("name");
      setSortOrder("asc");
    } else if (val === "name-desc") {
      setSortBy("name");
      setSortOrder("desc");
    }
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setSelectedCountry("ALL");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setActionError("");

    try {
      const res = await fetch(`/api/customers/${deleteTarget._id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete customer");
      }

      setDeleteTarget(null);
      // Refresh list
      fetchCustomers();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete customer";
      setActionError(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  // Consistent color for avatar initials
  const getAvatarBg = (name: string) => {
    const colors = [
      "bg-blue-100 text-blue-700 border-blue-200",
      "bg-purple-100 text-purple-700 border-purple-200",
      "bg-emerald-100 text-emerald-700 border-emerald-200",
      "bg-amber-100 text-amber-700 border-amber-200",
      "bg-rose-100 text-rose-700 border-rose-200",
      "bg-indigo-100 text-indigo-700 border-indigo-200",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <Badge variant="outline" className="font-semibold text-xs text-gray-600 bg-gray-50">
              {total} total
            </Badge>
          </div>
          <p className="text-gray-500 mt-1 text-sm">
            Manage your customer database, view billing details, and maintain accounts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/customers/new">
            <Button className="shadow-sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Customer
            </Button>
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError("")} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter and Controls Toolbar */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, phone, city..."
                value={search}
                onChange={handleSearchChange}
                className="pl-9 pr-8"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Country Filter */}
            <div className="flex items-center gap-2 min-w-[170px]">
              <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
              <Select
                value={selectedCountry}
                onChange={handleCountryChange}
                className="w-full text-sm"
              >
                <option value="ALL">All Countries</option>
                {availableCountries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            {/* Sort Options */}
            <div className="min-w-[170px]">
              <Select
                value={
                  sortBy === "createdAt" && sortOrder === "desc"
                    ? "newest"
                    : sortBy === "createdAt" && sortOrder === "asc"
                    ? "oldest"
                    : sortBy === "name" && sortOrder === "asc"
                    ? "name-asc"
                    : "name-desc"
                }
                onChange={handleSortChange}
                className="w-full text-sm"
              >
                <option value="newest">Newest Added</option>
                <option value="oldest">Oldest Added</option>
                <option value="name-asc">Name (A → Z)</option>
                <option value="name-desc">Name (Z → A)</option>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50 self-end lg:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded transition ${
                  viewMode === "grid"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded transition ${
                  viewMode === "table"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                title="Table view"
              >
                <TableIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(search || selectedCountry !== "ALL") && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex-wrap">
              <span className="font-medium">Active filters:</span>
              {search && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Keyword: {search}
                  <button onClick={() => setSearch("")} className="hover:text-blue-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedCountry !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  Country: {selectedCountry}
                  <button onClick={() => setSelectedCountry("ALL")} className="hover:text-blue-900">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline ml-auto"
              >
                Reset all
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer List Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
          <p className="text-gray-500 text-sm font-medium">Loading customers...</p>
        </div>
      ) : customers.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Users className="h-7 w-7 text-gray-400" />
            </div>
            {search || selectedCountry !== "ALL" ? (
              <>
                <p className="text-base font-semibold text-gray-800">No matching customers found</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  We couldn&apos;t find any customer matching your current search or filter criteria.
                </p>
                <Button variant="outline" onClick={resetFilters} className="mt-4">
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <p className="text-base font-semibold text-gray-800">No customers yet</p>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                  Get started by adding your first customer to bill and manage subscriptions.
                </p>
                <Link href="/customers/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Add Customer
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {customers.map((customer) => {
            const avatarClass = getAvatarBg(customer.name);
            const initials = customer.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <Card
                key={customer._id}
                className="hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <CardContent className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Avatar, Name, and Quick Edit */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border ${avatarClass} shadow-xs flex-shrink-0`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/customers/${customer._id}`}
                            className="font-semibold text-gray-900 hover:text-blue-600 transition block truncate"
                          >
                            {customer.name}
                          </Link>
                          <span className="text-xs text-gray-400">
                            Added {new Date(customer.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <Link href={`/customers/${customer._id}/edit`}>
                          <button
                            className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                            title="Edit customer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(customer)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-2 mt-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 truncate">
                        <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>

                      {customer.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      )}

                      {(customer.billingAddress?.city || customer.billingAddress?.country) && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">
                            {[customer.billingAddress?.city, customer.billingAddress?.country]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      href={`/customers/${customer._id}`}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      View Details
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <Link href={`/customers/${customer._id}/edit`}>
                      <span className="text-xs text-gray-500 hover:text-gray-800 font-medium cursor-pointer">
                        Edit
                      </span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="overflow-hidden border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-3.5">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Location
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Added On
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {customers.map((customer) => {
                  const initials = customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);
                  const avatarClass = getAvatarBg(customer.name);

                  return (
                    <tr key={customer._id} className="hover:bg-gray-50/80 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs border ${avatarClass}`}
                          >
                            {initials}
                          </div>
                          <div>
                            <Link
                              href={`/customers/${customer._id}`}
                              className="font-semibold text-gray-900 hover:text-blue-600 transition"
                            >
                              {customer.name}
                            </Link>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">
                              {customer.notes || "No notes"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer.email}</div>
                        <div className="text-xs text-gray-500">{customer.phone || "—"}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {[customer.billingAddress?.city, customer.billingAddress?.country]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/customers/${customer._id}`}>
                            <button
                              className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="View details"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </Link>
                          <Link href={`/customers/${customer._id}/edit`}>
                            <button
                              className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Edit customer"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(customer)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Delete customer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination Bar */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs sm:text-sm text-gray-500">
            Showing <strong className="text-gray-900">{(page - 1) * limit + 1}</strong> to{" "}
            <strong className="text-gray-900">{Math.min(page * limit, total)}</strong> of{" "}
            <strong className="text-gray-900">{total}</strong> customers
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-xs font-medium text-gray-600 px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
      >
        <DialogHeader>
          <DialogTitle>Delete Customer</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <strong className="text-gray-900">{deleteTarget?.name}</strong>? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setDeleteTarget(null)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
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
