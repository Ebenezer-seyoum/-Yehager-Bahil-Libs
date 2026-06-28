import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const user = await apiRequest("/api/v1/users/me/presence", {
      method: "POST",
      body,
    });
    return NextResponse.json(user);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Presence update failed";
    return NextResponse.json({ error: message }, { status: message.includes("401") ? 401 : 500 });
  }
}
