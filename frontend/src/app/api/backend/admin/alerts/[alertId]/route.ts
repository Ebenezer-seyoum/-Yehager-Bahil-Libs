import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(request: Request, { params }: { params: Promise<{ alertId: string }> }) {
  try {
    const { alertId } = await params;
    const body = await request.json();
    const response = await apiRequest(`/api/v1/admin/alerts/${alertId}`, { method: "PATCH", body });
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Alert update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
