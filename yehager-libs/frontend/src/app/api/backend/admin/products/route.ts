import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
