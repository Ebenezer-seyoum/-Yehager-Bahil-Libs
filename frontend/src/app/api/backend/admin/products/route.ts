import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.toString();
    const path = query ? `/api/v1/admin/products?${query}` : "/api/v1/admin/products?limit=500";
    const data = await apiRequest(path);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Products fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await apiRequest("/api/v1/admin/products", {
      method: "POST",
      body,
    });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
