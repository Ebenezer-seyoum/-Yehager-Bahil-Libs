import { NextResponse } from "next/server";
import { mintBackendAccessToken } from "@/lib/backend-token";

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_API_URL;
    if (!backendUrl) {
      throw new Error("BACKEND_API_URL is required");
    }

    const token = await mintBackendAccessToken();
    const url = new URL(request.url);
    const response = await fetch(`${backendUrl}/api/v1/admin/reports?${url.searchParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`Reports fetch failed with ${response.status}: ${message}`);
    }

    const body = await response.json();
    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reports fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
