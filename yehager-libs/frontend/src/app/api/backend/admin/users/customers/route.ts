import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  return NextResponse.json(
    await apiRequest("/api/v1/admin/users/customers", {
      method: "POST",
      body: body ?? {},
    }),
  );
}

