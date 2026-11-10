import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { Price, Subscription } from "@/models";

// GET /api/prices/:id - Retrieve price details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid price ID format" }, { status: 400 });
    }

    const price = await Price.findById(id).populate("product", "name isActive").lean();

    if (!price) {
      return NextResponse.json({ error: "Price plan not found" }, { status: 404 });
    }

    const activeSubscriptionsCount = await Subscription.countDocuments({
      price: id,
      status: "active",
    });

    return NextResponse.json({
      price,
      stats: {
        activeSubscriptionsCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/prices/:id - Update price plan
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid price ID format" }, { status: 400 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.nickname !== undefined) {
      updateData.nickname = body.nickname.trim();
    }

    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json(
          { error: "Amount must be a non-negative number" },
          { status: 400 }
        );
      }
      updateData.amount = amount;
    }

    if (body.interval !== undefined) {
      if (!["monthly", "yearly", "one_time"].includes(body.interval)) {
        return NextResponse.json(
          { error: "Interval must be 'monthly', 'yearly', or 'one_time'" },
          { status: 400 }
        );
      }
      updateData.interval = body.interval;
    }

    if (body.currency !== undefined) {
      updateData.currency = body.currency.trim().toUpperCase() || "INR";
    }

    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }

    const updatedPrice = await Price.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("product", "name isActive").lean();

    if (!updatedPrice) {
      return NextResponse.json({ error: "Price plan not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Price plan updated successfully",
      price: updatedPrice,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/prices/:id - Toggle price active/inactive
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid price ID format" }, { status: 400 });
    }

    const body = await request.json();

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "Field 'isActive' must be a boolean" },
        { status: 400 }
      );
    }

    const updatedPrice = await Price.findByIdAndUpdate(
      id,
      { isActive: body.isActive },
      { new: true }
    ).lean();

    if (!updatedPrice) {
      return NextResponse.json({ error: "Price plan not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: `Price plan ${updatedPrice.isActive ? "activated" : "deactivated"} successfully`,
      price: updatedPrice,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/prices/:id - Delete a price plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid price ID format" }, { status: 400 });
    }

    // Check if any subscriptions are currently using this price
    const activeSubCount = await Subscription.countDocuments({
      price: id,
      status: { $in: ["active", "paused"] },
    });

    if (activeSubCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete pricing plan: It is currently active on ${activeSubCount} subscription(s). Deactivate the plan instead so new subscriptions cannot use it.`,
        },
        { status: 409 }
      );
    }

    const deletedPrice = await Price.findByIdAndDelete(id);

    if (!deletedPrice) {
      return NextResponse.json({ error: "Price plan not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Price plan deleted successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
