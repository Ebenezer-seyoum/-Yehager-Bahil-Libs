import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

export async function GET(_: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;
    const response = await apiRequest(`/api/v1/admin/products/${productId}`);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;
    const body = await request.json();
    const response = await apiRequest(`/api/v1/admin/products/${productId}`, {
      method: "PATCH",
      body,
    });
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;
    const response = await apiRequest(`/api/v1/admin/products/${productId}`, {
      method: "DELETE",
    });
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product archive failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
