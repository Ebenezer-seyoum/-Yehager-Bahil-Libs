import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH() {
  try {
    const response = await apiRequest("/api/v1/admin/alerts/mark-all-read", { method: "PATCH" });
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mark all as read failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
