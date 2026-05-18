import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function POST() {
  try {
    const user = await apiRequest<{ data: unknown }>("/api/v1/users/me/sync", {
      method: "POST",
    });

    return NextResponse.json({ status: "ok", data: user.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isUnauthorized = message.includes("401");
    return NextResponse.json(
      { status: isUnauthorized ? "auth_required" : "error", message },
      { status: isUnauthorized ? 401 : 500 },
    );
  }
}
