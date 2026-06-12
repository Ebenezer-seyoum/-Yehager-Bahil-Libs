import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(request: Request, { params }: { params: Promise<{ sectionId: string }> }) {
  try {
    const { sectionId } = await params;
    const body = await request.json();
    return NextResponse.json(await apiRequest(`/api/v1/admin/homepage-sections/${sectionId}`, { method: "PATCH", body }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Region update failed" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ sectionId: string }> }) {
  try {
    const { sectionId } = await params;
    return NextResponse.json(await apiRequest(`/api/v1/admin/homepage-sections/${sectionId}`, { method: "DELETE" }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Region delete failed" }, { status: 500 });
  }
}
