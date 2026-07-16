import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    return NextResponse.json(await apiRequest(
      `/api/v1/admin/products/${encodeURIComponent(productId)}/price-submission-viewed`,
      { method: "PATCH" },
    ));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Price notification update failed" },
      { status: 500 },
    );
  }
}
