import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET() {
  try { return NextResponse.json(await apiRequest("/api/v1/users/me/dashboard-preferences")); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load dashboard preferences" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try { return NextResponse.json(await apiRequest("/api/v1/users/me/dashboard-preferences", { method: "PATCH", body: await request.json() })); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save dashboard preferences" }, { status: 500 }); }
}
