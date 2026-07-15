import { NextResponse } from "next/server";
import { backendPublicRequest } from "@/lib/backend-public";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(await backendPublicRequest("/api/v1/integrations/telegram/price-submit", { method: "POST", body }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Price submission failed" }, { status: 400 });
  }
}
