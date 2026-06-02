import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { PERMISSIONS } from "../../lib/auth/permissions.js";
import type { AppBindings } from "../../types/hono.js";
import {
  createUploadedDesignSubmission,
  getUploadedDesignForAdmin,
  getUploadedDesignForCurrentUser,
  getUploadedDesignSummaryCounts,
  listUploadedDesignsForAdmin,
  listUploadedDesignsForCurrentUser,
  reviewUploadedDesign,
  setUploadedDesignInReview,
} from "../../services/uploaded-designs-service.js";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

const adminQuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

const createSchema = z.object({
  designTitle: z.string().min(3).max(160),
  inspirationNote: z.string().max(2000).optional(),
  frontImageUrl: z.string().url(),
  sideImageUrl: z.string().url().optional(),
  backImageUrl: z.string().url().optional(),
  fabricType: z.string().max(120).optional(),
  embroideryStyle: z.string().max(120).optional(),
  colorPreference: z.string().max(120).optional(),
  measurementSnapshot: z.record(z.string(), z.unknown()).optional(),
  contactPhone: z.string().max(40).optional(),
  contactTelegram: z.string().max(80).optional(),
  contactAddress: z.record(z.string(), z.unknown()).optional(),
});

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().max(2000).optional(),
  quotedPriceUsd: z.number().nonnegative().optional(),
});

export const uploadedDesignsRouter = new Hono<AppBindings>();

uploadedDesignsRouter.post("/", requireAuth, zValidator("json", createSchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  const data = await createUploadedDesignSubmission({
    userEmail: authUser?.email,
    userId: authUser?.sub,
    designTitle: body.designTitle,
    inspirationNote: body.inspirationNote,
    frontImageUrl: body.frontImageUrl,
    sideImageUrl: body.sideImageUrl,
    backImageUrl: body.backImageUrl,
    fabricType: body.fabricType,
    embroideryStyle: body.embroideryStyle,
    colorPreference: body.colorPreference,
    measurementSnapshot: body.measurementSnapshot,
    contactPhone: body.contactPhone,
    contactTelegram: body.contactTelegram,
    contactAddress: body.contactAddress,
  });
  return c.json({ data }, 201);
});

uploadedDesignsRouter.get("/me", requireAuth, zValidator("query", querySchema), async (c) => {
  const authUser = c.get("authUser");
  const { limit } = c.req.valid("query");
  const data = await listUploadedDesignsForCurrentUser(authUser?.email, limit ?? 50);
  return c.json({ data });
});

uploadedDesignsRouter.get("/me/:designId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const designId = c.req.param("designId");
  const data = await getUploadedDesignForCurrentUser({ designId, userEmail: authUser?.email });
  return c.json({ data });
});

uploadedDesignsRouter.get(
  "/admin",
  requireAuth,
  requirePermission(PERMISSIONS.UPLOADED_DESIGNS_VIEW),
  zValidator("query", adminQuerySchema),
  async (c) => {
    const { status, limit } = c.req.valid("query");
    const data = await listUploadedDesignsForAdmin({ status, limit: limit ?? 100 });
    const counts = await getUploadedDesignSummaryCounts();
    return c.json({ data, counts });
  },
);

uploadedDesignsRouter.get(
  "/admin/:designId",
  requireAuth,
  requirePermission(PERMISSIONS.UPLOADED_DESIGNS_VIEW),
  async (c) => {
    const designId = c.req.param("designId");
    const data = await getUploadedDesignForAdmin(designId);
    return c.json({ data });
  },
);

uploadedDesignsRouter.patch(
  "/admin/:designId/in-review",
  requireAuth,
  requirePermission(PERMISSIONS.UPLOADED_DESIGNS_REVIEW),
  async (c) => {
    const authUser = c.get("authUser");
    const designId = c.req.param("designId");
    const data = await setUploadedDesignInReview({
      designId,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

uploadedDesignsRouter.patch(
  "/admin/:designId/review",
  requireAuth,
  requirePermission(PERMISSIONS.UPLOADED_DESIGNS_REVIEW),
  zValidator("json", reviewSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const designId = c.req.param("designId");
    const body = c.req.valid("json");
    const data = await reviewUploadedDesign({
      designId,
      decision: body.decision,
      reason: body.reason,
      quotedPriceUsd: body.quotedPriceUsd,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);
