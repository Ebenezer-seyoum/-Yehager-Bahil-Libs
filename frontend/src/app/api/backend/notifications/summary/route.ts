import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET() {
  try {
    return NextResponse.json(await apiRequest("/api/v1/notifications/summary"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notification summary fetch failed" },
      { status: 500 },
    );
  }
}
