import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { getSignedUploadParams } from "../../lib/storage/cloudinary.js";
import type { AppBindings } from "../../types/hono.js";

const uploadSignatureSchema = z.object({
  folder: z.string().min(1),
  publicId: z.string().optional(),
});

export const uploadsRouter = new Hono<AppBindings>();

uploadsRouter.post(
  "/sign",
  requireAuth,
  zValidator("json", uploadSignatureSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const data = await getSignedUploadParams(payload.folder, payload.publicId);
    return c.json({ data }, 201);
  },
);
