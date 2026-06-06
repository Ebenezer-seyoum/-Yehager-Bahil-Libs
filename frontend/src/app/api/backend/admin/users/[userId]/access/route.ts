import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PUT(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const body = await request.json();
    return NextResponse.json(await apiRequest(`/api/v1/admin/users/${userId}/access`, { method: "PUT", body }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Access assignment failed" },
      { status: 500 },
    );
  }
}

