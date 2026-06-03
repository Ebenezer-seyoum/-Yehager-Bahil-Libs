import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET() {
  try {
    const response = await apiRequest("/api/v1/uploaded-designs/me?limit=100");
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load uploaded designs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await apiRequest("/api/v1/uploaded-designs", {
      method: "POST",
      body,
    });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit uploaded design";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
