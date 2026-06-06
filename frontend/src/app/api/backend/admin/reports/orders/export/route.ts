import { NextResponse } from "next/server";
import { mintBackendAccessToken } from "@/lib/backend-token";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const backendUrl = process.env.BACKEND_API_URL;
    if (!backendUrl) throw new Error("BACKEND_API_URL is required");
    const token = await mintBackendAccessToken();
    const response = await fetch(`${backendUrl}/api/v1/admin/reports/orders/export?${url.searchParams.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Report export failed with ${response.status}`);
    }
    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": response.headers.get("content-disposition") ?? "attachment",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Report export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
