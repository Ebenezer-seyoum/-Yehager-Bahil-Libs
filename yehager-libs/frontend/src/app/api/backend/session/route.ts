import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET() {
  try {
    const session = await apiRequest<{ user: { sub?: string; email?: string; role?: string } }>("/api/v1/auth/session");
    const user = await apiRequest<{ data: unknown | null }>("/api/v1/users/me");

    return NextResponse.json({
      status: "authenticated",
      authUser: session.user ?? null,
      profile: user.data ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isUnauthorized = message.includes("401");

    return NextResponse.json(
      {
        status: isUnauthorized ? "auth_required" : "unknown_error",
        message,
      },
      { status: isUnauthorized ? 401 : 500 },
    );
  }
}
