import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import {
  createMyMeasurement,
  deleteMyMeasurement,
  getMyMeasurement,
  listMyMeasurements,
  patchMyMeasurement,
} from "../../services/measurements-service.js";
import type { AppBindings } from "../../types/hono.js";

const measurementFields = z.object({
  gender: z.string().min(1).max(64),
  chest: z.coerce.number().finite().positive(),
  waist: z.coerce.number().finite().positive(),
  hips: z.coerce.number().finite().positive(),
  shoulderWidth: z.coerce.number().finite().positive(),
  armLength: z.coerce.number().finite().positive(),
  torsoLength: z.coerce.number().finite().positive(),
  inseam: z.coerce.number().finite().positive().optional(),
  neck: z.coerce.number().finite().positive().optional(),
  label: z.string().min(1).max(200).optional(),
});

const measurementPatch = measurementFields.partial().extend({
  inseam: z.union([z.coerce.number().finite().positive(), z.null()]).optional(),
  neck: z.union([z.coerce.number().finite().positive(), z.null()]).optional(),
});

const idParam = z.object({
  measurementId: z.string().uuid(),
});

export const measurementsRouter = new Hono<AppBindings>();

measurementsRouter.get("/", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const data = await listMyMeasurements(authUser?.email);
  return c.json({ data });
});

measurementsRouter.post("/", requireAuth, zValidator("json", measurementFields), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  const data = await createMyMeasurement(authUser?.email, body);
  return c.json({ data }, 201);
});

measurementsRouter.get("/:measurementId", requireAuth, zValidator("param", idParam), async (c) => {
  const authUser = c.get("authUser");
  const { measurementId } = c.req.valid("param");
  const data = await getMyMeasurement(authUser?.email, measurementId);
  return c.json({ data });
});

measurementsRouter.patch(
  "/:measurementId",
  requireAuth,
  zValidator("param", idParam),
  zValidator("json", measurementPatch),
  async (c) => {
    const authUser = c.get("authUser");
    const { measurementId } = c.req.valid("param");
    const body = c.req.valid("json");
    const data = await patchMyMeasurement(authUser?.email, measurementId, body);
    return c.json({ data });
  },
);

measurementsRouter.delete("/:measurementId", requireAuth, zValidator("param", idParam), async (c) => {
  const authUser = c.get("authUser");
  const { measurementId } = c.req.valid("param");
  await deleteMyMeasurement(authUser?.email, measurementId);
  return c.body(null, 204);
});
