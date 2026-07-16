import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function POST(_: Request, { params }: { params: Promise<{ productId: string; decision: string }> }) {
  try {
    const { productId, decision } = await params;
    if (decision !== "approve" && decision !== "decline") {
      return NextResponse.json({ error: "Invalid estimated price decision" }, { status: 400 });
    }
    return NextResponse.json(await apiRequest(`/api/v1/admin/products/${productId}/estimated-prices/${decision}`, { method: "POST" }));
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Estimated price decision failed";
    const statusMatch = raw.match(/^API error (\d+):/);
    const status = statusMatch ? Number(statusMatch[1]) : 500;
    return NextResponse.json({ error: raw.replace(/^API error \d+:\s*/, "") }, { status: status >= 400 && status <= 599 ? status : 500 });
  }
}
