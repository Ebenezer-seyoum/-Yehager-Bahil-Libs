import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await apiRequest("/api/v1/admin/roles", { method: "POST", body }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Role creation failed" }, { status: 500 });
  }
}
