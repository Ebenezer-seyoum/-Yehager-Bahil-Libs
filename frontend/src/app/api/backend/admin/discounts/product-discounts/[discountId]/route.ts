import { NextRequest, NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

function statusFromMessage(message: string) {
  const match = message.match(/API error (\d+):/);
  return match ? Number(match[1]) : 500;
}

function readableMessage(message: string) {
  const [, body] = message.split(/API error \d+:\s*/);
  if (!body) return message;
  try {
    const parsed = JSON.parse(body);
    return parsed?.message ?? parsed?.error?.message ?? parsed?.error ?? message;
  } catch {
    return body || message;
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ discountId: string }> }) {
  try {
    const { discountId } = await params;
    const body = await request.json();
    return NextResponse.json(await apiRequest(`/api/v1/admin/discounts/product-discounts/${discountId}`, { method: "PATCH", body }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product discount update failed";
    return NextResponse.json({ error: readableMessage(message) }, { status: statusFromMessage(message) });
  }
}
