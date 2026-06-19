import { NextResponse } from "next/server";
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
    return parsed?.message ?? parsed?.error ?? message;
  } catch {
    return body || message;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await apiRequest("/api/v1/orders/coupon-preview", { method: "POST", body }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Coupon preview failed";
    return NextResponse.json({ error: readableMessage(message) }, { status: statusFromMessage(message) });
  }
}
