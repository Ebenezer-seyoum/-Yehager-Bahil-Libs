import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET() {
  try {
    return NextResponse.json(await apiRequest("/api/v1/admin/settings"));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    return NextResponse.json(await apiRequest("/api/v1/admin/settings", { method: "PATCH", body: await request.json() }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save settings";
    return NextResponse.json({ error: message }, { status: message.includes("403") ? 403 : 500 });
  }
}
