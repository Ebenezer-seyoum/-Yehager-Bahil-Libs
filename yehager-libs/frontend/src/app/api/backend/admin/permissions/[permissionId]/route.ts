import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(request: Request, { params }: { params: Promise<{ permissionId: string }> }) {
  try {
    const { permissionId } = await params;
    const body = await request.json();
    return NextResponse.json(await apiRequest(`/api/v1/admin/permissions/${permissionId}`, { method: "PATCH", body }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Permission update failed" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ permissionId: string }> }) {
  try {
    const { permissionId } = await params;
    return NextResponse.json(await apiRequest(`/api/v1/admin/permissions/${permissionId}`, { method: "DELETE" }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Permission delete failed" }, { status: 500 });
  }
}
