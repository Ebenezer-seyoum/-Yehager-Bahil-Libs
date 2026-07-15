import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(request: Request, { params }: { params: Promise<{ ruleKey: string }> }) {
  try {
    const { ruleKey } = await params;
    return NextResponse.json(await apiRequest(`/api/v1/admin/pricing-rules/${encodeURIComponent(ruleKey)}`, { method: "PATCH", body: await request.json() }));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Pricing rule update failed" }, { status: 400 }); }
}
