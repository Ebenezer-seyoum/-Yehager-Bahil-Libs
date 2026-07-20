import { NextRequest, NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json(
      await apiRequest("/api/v1/notifications/read", {
        method: "PATCH",
        body,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Notification update failed" },
      { status: 500 },
    );
  }
}
