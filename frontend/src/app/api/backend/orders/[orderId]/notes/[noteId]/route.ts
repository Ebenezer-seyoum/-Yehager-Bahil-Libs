import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

function apiError(error: unknown, fallback: string) {
  const rawMessage = error instanceof Error ? error.message : fallback;
  const match = typeof rawMessage === "string" ? rawMessage.match(/API error (\d{3}):\s*([\s\S]*)$/) : null;
  const maybeError = error as { status?: unknown; cause?: { status?: unknown } };
  const rawStatus = match ? Number(match[1]) : (maybeError.status ?? maybeError.cause?.status ?? 500);
  const status = typeof rawStatus === "number" ? rawStatus : Number(rawStatus);
  const message = match ? match[2].trim() : rawMessage;
  return NextResponse.json({ error: message }, { status: Number.isFinite(status) ? status : 500 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string; noteId: string }> }) {
  try {
    const { orderId, noteId } = await params;
    const body = await request.json();
    return NextResponse.json(await apiRequest(`/api/v1/orders/${orderId}/notes/${noteId}`, { method: "PATCH", body }));
  } catch (error) {
    return apiError(error, "Order note update failed");
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ orderId: string; noteId: string }> }) {
  try {
    const { orderId, noteId } = await params;
    return NextResponse.json(await apiRequest(`/api/v1/orders/${orderId}/notes/${noteId}`, { method: "DELETE" }));
  } catch (error) {
    return apiError(error, "Order note delete failed");
  }
}
