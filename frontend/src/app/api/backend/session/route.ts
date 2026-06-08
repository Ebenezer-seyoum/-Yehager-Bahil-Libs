import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET() {
  try {
    // Trigger a background sync but don't await it — keep the session check fast
    void apiRequest("/api/v1/users/me/sync", {
      method: "POST",
    }).catch(() => {
      /* ignore background sync errors to avoid blocking auth checks */
    });

    const session = await apiRequest<{ user: { sub?: string; email?: string; role?: string } }>("/api/v1/auth/session");
    const user = await apiRequest<{ data: unknown | null }>("/api/v1/users/me");

    return NextResponse.json({
      status: "authenticated",
      authUser: session.user ?? null,
      profile: user.data ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isUnauthorized = message.includes("401") || message.includes("No authenticated user found");

    return NextResponse.json(
      {
        status: isUnauthorized ? "auth_required" : "unknown_error",
        message,
      },
      { status: isUnauthorized ? 401 : 500 },
    );
  }
}
