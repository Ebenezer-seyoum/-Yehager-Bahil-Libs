import { NextRequest, NextResponse } from "next/server";
import { mintBackendAccessToken } from "@/lib/backend-token";

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

async function handleProxy(request: NextRequest, pathParts: string[]) {
  try {
    const backendUrl = process.env.BACKEND_API_URL;
    if (!backendUrl) {
      throw new Error("BACKEND_API_URL is required");
    }

    const token = await mintBackendAccessToken();
    const url = new URL(request.url);
    const subpath = pathParts.join("/");
    const targetUrl = `${backendUrl}/api/v1/admin/support/${subpath}${url.search ? url.search : ""}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    let body: any = undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.text();
      headers["Content-Type"] = request.headers.get("Content-Type") || "application/json";
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const resBody = await response.json();
    return NextResponse.json(resBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Support proxy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
