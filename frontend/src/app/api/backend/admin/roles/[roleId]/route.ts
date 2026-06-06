import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(request: Request, { params }: { params: Promise<{ roleId: string }> }) {
  try {
    const { roleId } = await params;
    const body = await request.json();
    return NextResponse.json(await apiRequest(`/api/v1/admin/roles/${roleId}`, { method: "PATCH", body }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Role update failed" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ roleId: string }> }) {
  try {
    const { roleId } = await params;
    return NextResponse.json(await apiRequest(`/api/v1/admin/roles/${roleId}`, { method: "DELETE" }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Role delete failed" }, { status: 500 });
  }
}
