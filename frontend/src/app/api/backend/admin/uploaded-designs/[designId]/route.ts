import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET(_request: Request, { params }: { params: Promise<{ designId: string }> }) {
  try {
    const { designId } = await params;
    const response = await apiRequest(`/api/v1/uploaded-designs/admin/${designId}`);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load uploaded design";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
