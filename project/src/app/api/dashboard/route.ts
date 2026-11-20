import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Customer, Subscription, Invoice, Payment } from "@/models";

export async function GET() {
  try {
    await dbConnect();

    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // ── Core counts ──────────────────────────────────────────────
    const [
      totalCustomers,
      activeSubscriptions,
      pendingInvoicesCount,
    ] = await Promise.all([
      Customer.countDocuments({ status: "active" }),
      Subscription.countDocuments({ status: "active" }),
      Invoice.countDocuments({ status: { $in: ["pending", "overdue"] } }),
    ]);

    // ── Revenue ───────────────────────────────────────────────────
    const paidInvoices = await Invoice.find({ status: "paid" }).lean();
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

    const pendingAmountAgg = await Invoice.aggregate([
      { $match: { status: { $in: ["pending", "overdue"] } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const pendingAmount = pendingAmountAgg[0]?.total || 0;

    // ── MRR / ARR ─────────────────────────────────────────────────
    const activeSubs = await Subscription.find({ status: "active" })
      .populate("price", "amount billingCycle")
      .lean();

    let mrr = 0;
    activeSubs.forEach((sub) => {
      const price = sub.price as { amount?: number; billingCycle?: string } | null;
      if (!price) return;
      const amt = price.amount || 0;
      const cycle = price.billingCycle || "monthly";
      if (cycle === "monthly") mrr += amt;
      else if (cycle === "yearly") mrr += amt / 12;
      else if (cycle === "quarterly") mrr += amt / 3;
      else if (cycle === "weekly") mrr += amt * 4;
    });
    const arr = mrr * 12;

    // ── Monthly Revenue (last 6 months) ───────────────────────────
    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: "successful",
          paidAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$paidAt" },
            month: { $month: "$paidAt" },
          },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Fill in zero-revenue months
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueMap: Record<string, number> = {};
    monthlyRevenue.forEach((m) => {
      const key = `${m._id.year}-${String(m._id.month).padStart(2, "0")}`;
      revenueMap[key] = m.revenue;
    });

    const revenueChart: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      revenueChart.push({ month: monthNames[d.getMonth()], revenue: revenueMap[key] || 0 });
    }

    // ── Subscription distribution ─────────────────────────────────
    const subDistAgg = await Subscription.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const subscriptionDistribution = subDistAgg.reduce(
      (acc, item) => { acc[item._id] = item.count; return acc; },
      {} as Record<string, number>
    );

    // ── Upcoming renewals (next 4) ────────────────────────────────
    const upcomingRenewals = await Subscription.find({
      status: "active",
      nextBillingDate: { $gte: now },
    })
      .populate("customer", "name email")
      .populate("price", "amount billingCycle")
      .sort({ nextBillingDate: 1 })
      .limit(4)
      .lean();

    // ── Recent activity ───────────────────────────────────────────
    const [recentPayments, recentSubscriptions, recentInvoices] = await Promise.all([
      Payment.find({ status: "successful" })
        .populate("customer", "name")
        .sort({ paidAt: -1 })
        .limit(5)
        .lean(),
      Subscription.find()
        .populate("customer", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Invoice.find()
        .populate("customer", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    return NextResponse.json({
      stats: {
        totalRevenue,
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(arr * 100) / 100,
        totalCustomers,
        activeSubscriptions,
        pendingInvoices: pendingInvoicesCount,
        pendingAmount,
      },
      revenueChart,
      subscriptionDistribution,
      upcomingRenewals,
      recentActivity: {
        payments: recentPayments,
        subscriptions: recentSubscriptions,
        invoices: recentInvoices,
      },
    });
  } catch (err) {
    console.error("GET /api/dashboard error:", err);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
