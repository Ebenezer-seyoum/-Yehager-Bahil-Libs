import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET() {
  try { return NextResponse.json(await apiRequest("/api/v1/admin/pricing-rules")); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Pricing rules fetch failed" }, { status: 500 }); }
}
