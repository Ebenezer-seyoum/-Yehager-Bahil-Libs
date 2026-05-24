import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

function getStatusCode(error: unknown) {
  if (typeof error !== "object" || error === null) return 500;
  const typedError = error as { status?: unknown; cause?: { status?: unknown } };
  if (typeof typedError.status === "number") return typedError.status;
  if (typedError.cause && typeof typedError.cause.status === "number") return typedError.cause.status;
  return 500;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {
    const body = await request.json();
    const data = await apiRequest(`/api/v1/admin/users/${userId}/status`, {
      method: "PATCH",
      body,
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "User status update failed";
    const match = typeof rawMessage === "string" ? rawMessage.match(/API error (\d{3}):\s*([\s\S]*)$/) : null;
    const status = match ? Number(match[1]) : getStatusCode(error);
    const message = match ? match[2].trim() : rawMessage;
    return NextResponse.json({ message }, { status: Number.isFinite(status) ? status : 500 });
  }
}
