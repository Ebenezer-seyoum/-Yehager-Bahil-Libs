import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const user = await apiRequest<{ data: unknown | null }>("/api/v1/users/me/password", {
      method: "PATCH",
      body,
    });
    return NextResponse.json({ data: user.data ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: message.includes("401") ? 401 : 500 });
  }
}
