import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET(_: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const response = await apiRequest(`/api/v1/orders/admin/${orderId}`);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order notification update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
