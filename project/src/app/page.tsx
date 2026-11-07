import {
  LayoutDashboard,
  Users,
  Package,
  CreditCard,
  FileText,
  Wallet,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const stats = [
  {
    title: "Total Revenue",
    value: "₹0",
    description: "All time",
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "Active Subscriptions",
    value: "0",
    description: "Currently active",
    icon: CreditCard,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Total Customers",
    value: "0",
    description: "Registered",
    icon: Users,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    title: "Pending Invoices",
    value: "0",
    description: "Awaiting payment",
    icon: FileText,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
];

const quickLinks = [
  { name: "Manage Customers", href: "/customers", icon: Users, description: "Add and manage customer profiles" },
  { name: "Products & Pricing", href: "/products", icon: Package, description: "Create products and pricing plans" },
  { name: "Subscriptions", href: "/subscriptions", icon: CreditCard, description: "Track recurring subscriptions" },
  { name: "Invoices", href: "/invoices", icon: FileText, description: "Generate and manage invoices" },
  { name: "Payments", href: "/payments", icon: Wallet, description: "Record and track payments" },
];

export default function DashboardPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome to BillWise — your billing & subscription management platform
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.name} href={link.href}>
              <Card className="hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-gray-50 p-2 rounded-lg group-hover:bg-blue-50 transition-colors">
                        <link.icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{link.name}</p>
                        <p className="text-sm text-gray-500">{link.description}</p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Coming Soon Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-blue-600" />
            Analytics & Charts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-gray-400">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Revenue charts and analytics will appear here</p>
              <p className="text-xs mt-1">Start by adding customers and creating subscriptions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
