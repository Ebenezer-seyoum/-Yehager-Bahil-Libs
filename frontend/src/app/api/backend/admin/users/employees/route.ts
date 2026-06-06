import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await apiRequest("/api/v1/admin/users/employees", {
      method: "POST",
      body,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Employee create failed";
    const match = typeof rawMessage === "string" ? rawMessage.match(/API error (\d{3}):\s*([\s\S]*)$/) : null;
    const status = match ? Number(match[1]) : ((error as any)?.status ?? (error as any)?.cause?.status ?? 500);
    const message = match ? match[2].trim() : rawMessage;
    return NextResponse.json({ message }, { status: Number.isFinite(status) ? status : 500 });
  }
}
