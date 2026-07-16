import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

function errorResponse(error: unknown, fallback: string) {
  const raw = error instanceof Error ? error.message : fallback;
  const statusMatch = raw.match(/^API error (\d+):/);
  const status = statusMatch ? Number(statusMatch[1]) : 500;
  const message = raw.replace(/^API error \d+:\s*/, "").replace(/^\{"(?:error|message)":"|"\}$/g, "") || fallback;
  return NextResponse.json({ error: message }, { status: status >= 400 && status <= 599 ? status : 500 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;
    const body = await request.json();
    return NextResponse.json(await apiRequest(`/api/v1/admin/products/${productId}/estimated-prices`, { method: "PATCH", body }));
  } catch (error) {
    return errorResponse(error, "Estimated price update failed");
  }
}
