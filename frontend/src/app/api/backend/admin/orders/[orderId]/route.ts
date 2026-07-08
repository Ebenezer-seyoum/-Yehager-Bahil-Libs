import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function DELETE(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const response = await apiRequest(`/api/v1/admin/orders/${orderId}`, {
      method: "DELETE",
    });
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
