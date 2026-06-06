import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.toString();
    const path = query ? `/api/v1/admin/users?${query}` : "/api/v1/admin/users?limit=500";
    const data = await apiRequest(path);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Users fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
