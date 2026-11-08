import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BillWise — Billing & Subscription Management",
  description: "A centralized billing and subscription management platform for businesses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Suspense fallback={<div className="w-64 bg-white border-r border-gray-200 hidden lg:block" />}>
            <Sidebar />
          </Suspense>
          <main className="flex-1 lg:ml-64">
            <div className="p-6 lg:p-8 max-w-7xl mx-auto">
              <Suspense fallback={<div className="flex items-center justify-center p-12 text-gray-400">Loading...</div>}>
                {children}
              </Suspense>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
