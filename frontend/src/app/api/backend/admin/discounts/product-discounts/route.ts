import { NextRequest, NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json(await apiRequest("/api/v1/admin/discounts/product-discounts", { method: "POST", body }), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product discount creation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
