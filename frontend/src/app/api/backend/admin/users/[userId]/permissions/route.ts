import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    return NextResponse.json(await apiRequest(`/api/v1/admin/users/${userId}/permissions`));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Permission load failed" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const body = await request.json();
    return NextResponse.json(await apiRequest(`/api/v1/admin/users/${userId}/permissions`, { method: "PUT", body }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Permission update failed" }, { status: 500 });
  }
}
