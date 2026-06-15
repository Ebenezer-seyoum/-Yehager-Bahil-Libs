import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET() {
  try {
    return NextResponse.json(await apiRequest("/api/v1/admin/discounts"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discounts load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
