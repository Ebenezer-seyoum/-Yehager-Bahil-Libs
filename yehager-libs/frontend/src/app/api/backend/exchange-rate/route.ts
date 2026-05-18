import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const response = await apiRequest("/api/v1/exchange-rate", { method: "PATCH", body });
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Exchange-rate update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
