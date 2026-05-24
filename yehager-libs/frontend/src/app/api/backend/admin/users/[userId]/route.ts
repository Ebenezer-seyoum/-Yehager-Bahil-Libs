import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {
    const data = await apiRequest(`/api/v1/admin/users/${userId}`);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "User fetch failed";
    const match = typeof rawMessage === "string" ? rawMessage.match(/API error (\d{3}):\s*([\s\S]*)$/) : null;
    const status = match ? Number(match[1]) : ((error as any)?.status ?? (error as any)?.cause?.status ?? 500);
    const message = match ? match[2].trim() : rawMessage;
    return NextResponse.json({ message }, { status: Number.isFinite(status) ? status : 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {
    const body = await request.json();
    const data = await apiRequest(`/api/v1/admin/users/${userId}`, {
      method: "PATCH",
      body,
    });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "User update failed";
    const match = typeof rawMessage === "string" ? rawMessage.match(/API error (\d{3}):\s*([\s\S]*)$/) : null;
    const status = match ? Number(match[1]) : ((error as any)?.status ?? (error as any)?.cause?.status ?? 500);
    const message = match ? match[2].trim() : rawMessage;
    return NextResponse.json({ message }, { status: Number.isFinite(status) ? status : 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  try {
    const data = await apiRequest(`/api/v1/admin/users/${userId}`, { method: "DELETE" });
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "User delete failed";
    const match = typeof rawMessage === "string" ? rawMessage.match(/API error (\d{3}):\s*([\s\S]*)$/) : null;
    const status = match ? Number(match[1]) : ((error as any)?.status ?? (error as any)?.cause?.status ?? 500);
    const message = match ? match[2].trim() : rawMessage;
    return NextResponse.json({ message }, { status: Number.isFinite(status) ? status : 500 });
  }
}
