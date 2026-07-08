import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

function apiError(error: unknown, fallback: string) {
  const rawMessage = error instanceof Error ? error.message : fallback;
  const match = typeof rawMessage === "string" ? rawMessage.match(/API error (\d{3}):\s*([\s\S]*)$/) : null;
  const status = match ? Number(match[1]) : ((error as any)?.status ?? (error as any)?.cause?.status ?? 500);
  const message = match ? match[2].trim() : rawMessage;
  return NextResponse.json({ message }, { status: Number.isFinite(status) ? status : 500 });
}

export async function POST(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {
    const data = await apiRequest(`/api/v1/admin/users/${userId}/password-reset-link`, { method: "POST" });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return apiError(error, "Employee password reset link failed");
  }
}
