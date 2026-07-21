import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const scope = searchParams.get("scope");
    
    // For admin orders endpoint (the backend route for admin getting orders is /api/v1/orders)
    const params = new URLSearchParams();
    if (limit) params.set("limit", limit);
    if (scope === "catalog" || scope === "custom") params.set("scope", scope);
    const qs = params.size ? `?${params.toString()}` : "";
    const data = await apiRequest(`/api/v1/orders${qs}`);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Orders fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
