import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/api-client";

function backendStatus(message: string) {
  const match = message.match(/^API error (\d+):/);
  const status = match ? Number(match[1]) : 500;
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

function backendMessage(message: string, fallback: string) {
  const body = message.replace(/^API error \d+:\s*/, "").trim();
  if (!body) return fallback;
  try {
    const parsed = JSON.parse(body) as { error?: unknown; message?: unknown };
    const value = parsed.error ?? parsed.message;
    if (typeof value === "string" && value.trim()) return value.trim();
  } catch {
    // Use the plain backend response below.
  }
  return body || fallback;
}

export async function GET(_: Request, { params }: { params: Promise<{ productId: string }> }) {
  try {
    const { productId } = await params;
    const response = await apiRequest(`/api/v1/admin/products/${productId}`);
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product lookup failed";
    return NextResponse.json({ error: backendMessage(message, "Product lookup failed") }, { status: backendStatus(message) });
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
    return NextResponse.json({ error: backendMessage(message, "Product update failed") }, { status: backendStatus(message) });
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
    return NextResponse.json({ error: backendMessage(message, "Product archive failed") }, { status: backendStatus(message) });
  }
}
