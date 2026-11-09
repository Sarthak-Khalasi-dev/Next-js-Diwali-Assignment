import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";

// GET /api/customers - List all customers with search, sort, and pagination
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const country = searchParams.get("country")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "12")));

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { "billingAddress.city": { $regex: search, $options: "i" } },
      ];
    }

    if (country && country !== "ALL") {
      query["billingAddress.country"] = { $regex: `^${country}$`, $options: "i" };
    }

    const sortOptions: Record<string, 1 | -1> = {};
    if (["name", "email", "createdAt", "updatedAt"].includes(sortBy)) {
      sortOptions[sortBy] = sortOrder;
    } else {
      sortOptions.createdAt = -1;
    }

    const [customers, total, countries] = await Promise.all([
      Customer.find(query)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query),
      Customer.distinct("billingAddress.country"),
    ]);

    // Filter out blank or empty countries
    const uniqueCountries = countries.filter(Boolean);

    return NextResponse.json({
      customers,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      availableCountries: uniqueCountries,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/customers - Create a new customer
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Check for duplicate email
    const existing = await Customer.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "A customer with this email already exists" },
        { status: 409 }
      );
    }

    const customer = await Customer.create({
      name,
      email,
      phone: body.phone ? body.phone.trim() : "",
      billingAddress: {
        street: body.billingAddress?.street ? body.billingAddress.street.trim() : "",
        city: body.billingAddress?.city ? body.billingAddress.city.trim() : "",
        state: body.billingAddress?.state ? body.billingAddress.state.trim() : "",
        zipCode: body.billingAddress?.zipCode ? body.billingAddress.zipCode.trim() : "",
        country: body.billingAddress?.country ? body.billingAddress.country.trim() : "India",
      },
      notes: body.notes ? body.notes.trim() : "",
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { error: "A customer with this email already exists" },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
