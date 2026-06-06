import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension) {
      return NextResponse.json({ error: "Only JPG, PNG, WebP, or GIF images are allowed" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Each image must be 10MB or smaller" }, { status: 400 });
    }

    const folder = String(formData.get("folder") ?? "products").replace(/[^a-z0-9-_]/gi, "").toLowerCase() || "products";
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await mkdir(uploadDir, { recursive: true });

    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({ data: { secure_url: `/uploads/${folder}/${filename}` } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Local image upload failed" }, { status: 500 });
  }
}
