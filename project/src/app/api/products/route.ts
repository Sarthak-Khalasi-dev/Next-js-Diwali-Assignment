import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Product, Price } from "@/models";
import { BillingInterval } from "@/models/Price";

interface PriceInput {
  amount: number;
  currency?: string;
  interval: BillingInterval;
  nickname?: string;
  isActive?: boolean;
}

// GET /api/products - List products with filters, pagination, and attached prices
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    // Ensure Price model is registered
    void Price;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim().toLowerCase() || "all";
    const interval = searchParams.get("interval")?.trim().toLowerCase() || "all";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "12")));

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    // If interval filter is requested, find product IDs that have matching prices
    if (interval && interval !== "all" && ["monthly", "yearly", "one_time"].includes(interval)) {
      const matchingPriceProductIds = await Price.distinct("product", {
        interval: interval as BillingInterval,
      });
      query._id = { $in: matchingPriceProductIds };
    }

    const sortOptions: Record<string, 1 | -1> = {};
    if (["name", "createdAt", "updatedAt"].includes(sortBy)) {
      sortOptions[sortBy] = sortOrder;
    } else {
      sortOptions.createdAt = -1;
    }

    const [products, total, totalProductsCount, activeProductsCount, inactiveProductsCount, totalPricesCount] =
      await Promise.all([
        Product.find(query)
          .sort(sortOptions)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Product.countDocuments(query),
        Product.countDocuments(),
        Product.countDocuments({ isActive: true }),
        Product.countDocuments({ isActive: false }),
        Price.countDocuments(),
      ]);

    // Fetch prices for the returned products
    const productIds = products.map((p) => p._id);
    const prices = await Price.find({ product: { $in: productIds } })
      .sort({ amount: 1 })
      .lean();

    // Map prices by product ID
    const pricesByProduct: Record<string, typeof prices> = {};
    prices.forEach((price) => {
      const prodId = price.product.toString();
      if (!pricesByProduct[prodId]) {
        pricesByProduct[prodId] = [];
      }
      pricesByProduct[prodId].push(price);
    });

    const productsWithPrices = products.map((product) => ({
      ...product,
      prices: pricesByProduct[product._id.toString()] || [],
    }));

    return NextResponse.json({
      products: productsWithPrices,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      stats: {
        totalProducts: totalProductsCount,
        activeProducts: activeProductsCount,
        inactiveProducts: inactiveProductsCount,
        totalPrices: totalPricesCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/products - Create a product with optional pricing plans
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const name = body.name?.trim();
    const description = (body.description || "").trim();
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
    const prices: PriceInput[] = Array.isArray(body.prices) ? body.prices : [];

    if (!name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    // Validate prices if provided
    for (const p of prices) {
      if (typeof p.amount !== "number" || isNaN(p.amount) || p.amount < 0) {
        return NextResponse.json(
          { error: "Price amount must be a positive number" },
          { status: 400 }
        );
      }
      if (!["monthly", "yearly", "one_time"].includes(p.interval)) {
        return NextResponse.json(
          { error: "Price interval must be 'monthly', 'yearly', or 'one_time'" },
          { status: 400 }
        );
      }
    }

    // Create product
    const product = await Product.create({
      name,
      description,
      isActive,
    });

    // Create associated prices if any
    let createdPrices: unknown[] = [];
    if (prices.length > 0) {
      const priceDocs = prices.map((p: PriceInput) => ({
        product: product._id,
        amount: Number(p.amount),
        currency: (p.currency || "INR").toUpperCase(),
        interval: p.interval,
        nickname: (p.nickname || "").trim() || `${p.interval === "one_time" ? "One-time" : p.interval === "monthly" ? "Monthly" : "Yearly"} Plan`,
        isActive: p.isActive !== undefined ? Boolean(p.isActive) : true,
      }));

      createdPrices = await Price.insertMany(priceDocs);
    }

    return NextResponse.json(
      {
        message: "Product created successfully",
        product: {
          ...product.toObject(),
          prices: createdPrices,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
