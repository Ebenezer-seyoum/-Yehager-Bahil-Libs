import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET() {
  try {
    return NextResponse.json(await apiRequest("/api/v1/admin/homepage-sections"));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Region list failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await apiRequest("/api/v1/admin/homepage-sections", { method: "POST", body }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Region creation failed" }, { status: 500 });
  }
}
