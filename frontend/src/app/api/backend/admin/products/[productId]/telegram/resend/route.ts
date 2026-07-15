import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function POST(_: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;
    return NextResponse.json(await apiRequest(`/api/v1/admin/products/${productId}/telegram/resend`, { method: "POST" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram resend failed";
    const match = message.match(/^API error (\d+):/);
    const status = match ? Number(match[1]) : 500;
    return NextResponse.json({ error: message.replace(/^API error \d+:\s*/, "") || "Telegram resend failed" }, { status: status >= 400 && status <= 599 ? status : 500 });
  }
}
