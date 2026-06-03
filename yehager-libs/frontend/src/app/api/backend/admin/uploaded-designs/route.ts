import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = searchParams.get("limit") ?? "200";
    const query = new URLSearchParams({ limit });
    if (status) query.set("status", status);
    const response = await apiRequest(`/api/v1/uploaded-designs/admin?${query.toString()}`);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load uploaded designs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
