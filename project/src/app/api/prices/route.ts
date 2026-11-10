import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { Price, Product } from "@/models";

// GET /api/prices - List prices with optional filtering
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    void Product; // Ensure Product model is registered for populate

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || searchParams.get("product");
    const interval = searchParams.get("interval")?.trim().toLowerCase();
    const isActive = searchParams.get("isActive");

    const query: Record<string, unknown> = {};

    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return NextResponse.json({ error: "Invalid product ID format" }, { status: 400 });
      }
      query.product = productId;
    }

    if (interval && ["monthly", "yearly", "one_time"].includes(interval)) {
      query.interval = interval;
    }

    if (isActive !== null && isActive !== undefined && isActive !== "") {
      query.isActive = isActive === "true";
    }

    const prices = await Price.find(query)
      .populate("product", "name isActive")
      .sort({ amount: 1 })
      .lean();

    return NextResponse.json({ prices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/prices - Create a new price plan for a product
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const productId = body.productId || body.product;
    const amount = Number(body.amount);
    const interval = body.interval?.trim().toLowerCase();
    const currency = (body.currency || "INR").trim().toUpperCase();
    const nickname = (body.nickname || "").trim();
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ error: "Valid product ID is required" }, { status: 400 });
    }

    if (isNaN(amount) || amount < 0) {
      return NextResponse.json(
        { error: "Amount must be a non-negative number" },
        { status: 400 }
      );
    }

    if (!["monthly", "yearly", "one_time"].includes(interval)) {
      return NextResponse.json(
        { error: "Interval must be 'monthly', 'yearly', or 'one_time'" },
        { status: 400 }
      );
    }

    // Verify parent product exists
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ error: "Associated product not found" }, { status: 404 });
    }

    const defaultNickname =
      nickname ||
      `${interval === "one_time" ? "One-time" : interval === "monthly" ? "Monthly" : "Yearly"} Plan`;

    const price = await Price.create({
      product: product._id,
      amount,
      currency,
      interval,
      nickname: defaultNickname,
      isActive,
    });

    return NextResponse.json(
      {
        message: "Pricing plan created successfully",
        price,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
