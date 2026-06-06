import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(request: Request, { params }: { params: Promise<{ designId: string }> }) {
  try {
    const { designId } = await params;
    const body = await request.json();
    const response = await apiRequest(`/api/v1/uploaded-designs/admin/${designId}/review`, {
      method: "PATCH",
      body,
    });
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to review uploaded design";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
