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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json(await apiRequest("/api/v1/admin/discounts/product-discounts", { method: "POST", body }), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product discount creation failed";
    return NextResponse.json({ error: readableMessage(message) }, { status: statusFromMessage(message) });
  }
}
