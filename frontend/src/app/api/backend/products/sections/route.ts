import { NextResponse } from "next/server";
import { backendPublicRequest } from "@/lib/backend-public";

export async function GET() {
  try {
    return NextResponse.json(await backendPublicRequest("/api/v1/products/sections"));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Collections failed" }, { status: 500 });
  }
}
