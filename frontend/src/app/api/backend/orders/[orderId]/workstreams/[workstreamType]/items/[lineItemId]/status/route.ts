import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      orderId: string;
      workstreamType: string;
      lineItemId: string;
    }>;
  },
) {
  try {
    const { orderId, workstreamType, lineItemId } = await params;
    const body = await request.json();
    const response = await apiRequest(
      `/api/v1/orders/${encodeURIComponent(orderId)}/workstreams/${encodeURIComponent(workstreamType)}/items/${encodeURIComponent(lineItemId)}/status`,
      {
        method: "PATCH",
        body,
      },
    );
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Order line-item status update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
