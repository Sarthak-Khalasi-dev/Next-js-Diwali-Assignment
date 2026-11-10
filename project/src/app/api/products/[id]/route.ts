import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { Product, Price, Subscription } from "@/models";

// GET /api/products/:id - Retrieve product, its prices, and usage statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID format" }, { status: 400 });
    }

    const product = await Product.findById(id).lean();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch prices for this product and related subscriptions count
    const [prices, subscriptionsCount, activeSubscriptionsCount] = await Promise.all([
      Price.find({ product: id }).sort({ amount: 1 }).lean(),
      Subscription.countDocuments({ product: id }),
      Subscription.countDocuments({ product: id, status: "active" }),
    ]);

    return NextResponse.json({
      product,
      prices,
      stats: {
        totalPrices: prices.length,
        activePrices: prices.filter((p) => p.isActive).length,
        subscriptionsCount,
        activeSubscriptionsCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/products/:id - Update product fields
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID format" }, { status: 400 });
    }

    const body = await request.json();

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Product name cannot be empty" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.description !== undefined) updateData.description = body.description.trim();
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive);

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const prices = await Price.find({ product: id }).sort({ amount: 1 }).lean();

    return NextResponse.json({
      message: "Product updated successfully",
      product: {
        ...updatedProduct,
        prices,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/products/:id - Quick toggle active/inactive status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID format" }, { status: 400 });
    }

    const body = await request.json();

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "Field 'isActive' must be a boolean" },
        { status: 400 }
      );
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: body.isActive },
      { new: true }
    ).lean();

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: `Product ${product.isActive ? "activated" : "deactivated"} successfully`,
      product,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/products/:id - Delete product and associated prices
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid product ID format" }, { status: 400 });
    }

    // Check if any subscriptions reference this product
    const activeSubscriptionsCount = await Subscription.countDocuments({
      product: id,
      status: { $in: ["active", "paused"] },
    });

    if (activeSubscriptionsCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete product: It is currently linked to ${activeSubscriptionsCount} active or paused subscription(s). Please cancel those subscriptions or deactivate the product instead.`,
        },
        { status: 409 }
      );
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Delete associated prices first
    await Price.deleteMany({ product: id });
    await Product.findByIdAndDelete(id);

    return NextResponse.json({
      message: "Product and associated prices deleted successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
