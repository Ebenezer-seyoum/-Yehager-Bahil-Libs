import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { getSignedReadUrl, getSignedUploadParams } from "../../lib/storage/s3.js";
import type { AppBindings } from "../../types/hono.js";

const uploadSignatureSchema = z.object({
  folder: z.string().min(1),
  fileName: z.string().min(1).optional(),
  contentType: z.string().min(1).optional(),
});

export const uploadsRouter = new Hono<AppBindings>();

uploadsRouter.post(
  "/sign",
  requireAuth,
  zValidator("json", uploadSignatureSchema),
  async (c) => {
    const payload = c.req.valid("json");
    const data = await getSignedUploadParams(payload.folder, payload.fileName, payload.contentType);
    return c.json({ data }, 201);
  },
);

const readUrlSchema = z.object({
  key: z.string().min(1),
});

uploadsRouter.post(
  "/read-url",
  requireAuth,
  zValidator("json", readUrlSchema),
  async (c) => {
    const { key } = c.req.valid("json");
    const url = await getSignedReadUrl(key);
    return c.json({ url });
  },
);
