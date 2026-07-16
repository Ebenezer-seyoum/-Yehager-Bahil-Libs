import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.toString();
  try { return NextResponse.json(await apiRequest(`/api/v1/admin/pricing-rules${query ? `?${query}` : ""}`)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Pricing rules fetch failed" }, { status: 500 }); }
}

export async function PUT(request: Request) {
  try {
    return NextResponse.json(await apiRequest("/api/v1/admin/pricing-rules", {
      method: "PUT",
      body: await request.json(),
    }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pricing rules update failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const query = new URL(request.url).searchParams.toString();
  try {
    return NextResponse.json(await apiRequest(`/api/v1/admin/pricing-rules${query ? `?${query}` : ""}`, {
      method: "DELETE",
    }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pricing rule overrides could not be reset" },
      { status: 400 },
    );
  }
}
