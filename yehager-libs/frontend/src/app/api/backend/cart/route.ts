import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET() {
  try {
    const response = await apiRequest("/api/v1/cart");
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cart lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
