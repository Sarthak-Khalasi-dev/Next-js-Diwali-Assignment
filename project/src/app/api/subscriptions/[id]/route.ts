import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Subscription, Customer, Product, Price } from "@/models";
import { SubscriptionStatus } from "@/models/Subscription";

// Ensure models are registered for populate
void Customer;
void Product;
void Price;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/subscriptions/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const subscription = await Subscription.findById(id)
      .populate("customer")
      .populate("product")
      .populate("price");

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    return NextResponse.json(subscription);
  } catch (error: unknown) {
    console.error("GET /api/subscriptions/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/subscriptions/[id] - Lifecycle management (pause, resume, cancel, change-plan)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { action, priceId, reason, status: directStatus } = body;

    const subscription = await Subscription.findById(id)
      .populate("customer")
      .populate("product")
      .populate("price");

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const now = new Date();

    if (action === "pause") {
      subscription.status = "paused";
      subscription.pausedAt = now;
      subscription.history.push({
        action: "Paused",
        date: now,
        details: reason ? `Paused: ${reason}` : "Subscription paused by administrator",
      });
    } else if (action === "resume") {
      subscription.status = "active";
      subscription.pausedAt = null;
      subscription.history.push({
        action: "Resumed",
        date: now,
        details: reason ? `Resumed: ${reason}` : "Subscription resumed",
      });
    } else if (action === "cancel") {
      subscription.status = "cancelled";
      subscription.cancelledAt = now;
      subscription.history.push({
        action: "Cancelled",
        date: now,
        details: reason ? `Cancelled: ${reason}` : "Subscription cancelled",
      });
    } else if (action === "change_plan" && priceId) {
      const newPrice = await Price.findById(priceId);
      if (!newPrice) {
        return NextResponse.json({ error: "Target price plan not found" }, { status: 404 });
      }

      const oldPriceNickname = (subscription.price as unknown as { nickname?: string; interval?: string })?.nickname || "previous plan";
      const newPriceNickname = newPrice.nickname || `${newPrice.interval} plan`;

      subscription.price = newPrice._id;
      subscription.history.push({
        action: "Plan Changed",
        date: now,
        details: `Plan changed from ${oldPriceNickname} to ${newPriceNickname}${reason ? ` (${reason})` : ""}`,
      });

      // Recalculate next billing date if interval changes
      const nextBilling = new Date(now);
      if (newPrice.interval === "monthly") {
        nextBilling.setMonth(nextBilling.getMonth() + 1);
      } else if (newPrice.interval === "yearly") {
        nextBilling.setFullYear(nextBilling.getFullYear() + 1);
      }
      subscription.nextBillingDate = nextBilling;
    } else if (directStatus) {
      const validStatuses: SubscriptionStatus[] = ["active", "paused", "cancelled", "past_due"];
      if (!validStatuses.includes(directStatus as SubscriptionStatus)) {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }

      subscription.status = directStatus as SubscriptionStatus;
      if (directStatus === "cancelled") subscription.cancelledAt = now;
      if (directStatus === "paused") subscription.pausedAt = now;
      if (directStatus === "active") subscription.pausedAt = null;

      subscription.history.push({
        action: `Status changed to ${directStatus}`,
        date: now,
        details: reason || `Status updated directly to ${directStatus}`,
      });
    } else {
      return NextResponse.json({ error: "Valid action or status is required" }, { status: 400 });
    }

    await subscription.save();

    const updated = await Subscription.findById(id)
      .populate("customer")
      .populate("product")
      .populate("price");

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("PATCH /api/subscriptions/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/subscriptions/[id] - Update subscription details
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { nextBillingDate, status, notes } = body;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (nextBillingDate) {
      subscription.nextBillingDate = new Date(nextBillingDate);
    }

    if (status) {
      subscription.status = status;
    }

    if (notes) {
      subscription.history.push({
        action: "Note Added",
        date: new Date(),
        details: notes,
      });
    }

    await subscription.save();

    const updated = await Subscription.findById(id)
      .populate("customer")
      .populate("product")
      .populate("price");

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error("PUT /api/subscriptions/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/subscriptions/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;

    const subscription = await Subscription.findById(id);
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    await Subscription.findByIdAndDelete(id);

    return NextResponse.json({ message: "Subscription deleted successfully" });
  } catch (error: unknown) {
    console.error("DELETE /api/subscriptions/[id] error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
