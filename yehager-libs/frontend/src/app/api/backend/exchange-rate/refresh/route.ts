import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function POST() {
  try {
    const response = await apiRequest("/api/v1/exchange-rate/refresh", { method: "POST" });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Exchange-rate refresh failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
