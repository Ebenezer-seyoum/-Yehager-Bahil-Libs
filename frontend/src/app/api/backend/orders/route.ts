import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    
    // For admin orders endpoint (the backend route for admin getting orders is /api/v1/orders)
    const qs = limit ? `?limit=${limit}` : "";
    const data = await apiRequest(`/api/v1/orders${qs}`);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
