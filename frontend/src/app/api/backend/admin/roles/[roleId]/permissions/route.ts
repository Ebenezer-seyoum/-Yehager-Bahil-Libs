import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PUT(request: Request, { params }: { params: Promise<{ roleId: string }> }) {
  try {
    const { roleId } = await params;
    const body = await request.json();
    return NextResponse.json(
      await apiRequest(`/api/v1/admin/roles/${roleId}/permissions`, { method: "PUT", body }),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Role permission update failed" },
      { status: 500 },
    );
  }
}
