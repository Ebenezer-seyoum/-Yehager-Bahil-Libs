import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const response = await apiRequest(`/api/v1/orders/me/${orderId}/etb-proof`, {
      method: "POST",
      body,
    });
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ETB proof submission failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
