import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const response = await apiRequest("/api/v1/exchange-rate", { method: "PATCH", body });
    return NextResponse.json(response);
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Exchange-rate update failed";
    const match = rawMessage.match(/API error (\d{3}):\s*([\s\S]*)$/);
    const status = match ? Number(match[1]) : 500;
    const message = match ? match[2].trim() : rawMessage;
    return NextResponse.json({ error: message }, { status: Number.isFinite(status) ? status : 500 });
  }
}
