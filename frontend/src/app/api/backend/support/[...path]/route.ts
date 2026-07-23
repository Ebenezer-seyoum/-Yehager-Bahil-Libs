import { NextRequest, NextResponse } from "next/server";
import { mintBackendAccessToken } from "@/lib/backend-token";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  try {
    const { path } = await context.params;
    const backendUrl = process.env.BACKEND_API_URL;
    if (!backendUrl) throw new Error("BACKEND_API_URL is required");
    const token = await mintBackendAccessToken();
    const target = `${backendUrl}/api/v1/support/${path.join("/")}${new URL(request.url).search}`;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
    if (body !== undefined) headers["Content-Type"] = request.headers.get("Content-Type") || "application/json";
    const response = await fetch(target, { method: request.method, headers, body, cache: "no-store" });
    const payload = await response.text();
    return new NextResponse(payload, { status: response.status, headers: { "Content-Type": response.headers.get("Content-Type") || "application/json" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Support request failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
