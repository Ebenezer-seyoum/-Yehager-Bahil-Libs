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
  bicepCircumference: z.coerce.number().finite().positive().optional(),
  wristCircumference: z.coerce.number().finite().positive().optional(),
  pantsWaist: z.coerce.number().finite().positive().optional(),
  pantsHip: z.coerce.number().finite().positive().optional(),
  thighCircumference: z.coerce.number().finite().positive().optional(),
  waistToPantsLength: z.coerce.number().finite().positive().optional(),
  hemStyle: z.string().trim().max(80).optional(),
  pressingStyle: z.string().trim().max(80).optional(),
  tailorNote: z.string().trim().max(1000).optional(),
  label: z.string().min(1).max(200).optional(),
});

const measurementPatch = measurementFields.partial().extend({
  inseam: z.union([z.coerce.number().finite().positive(), z.null()]).optional(),
  neck: z.union([z.coerce.number().finite().positive(), z.null()]).optional(),
  bicepCircumference: z.union([z.coerce.number().finite().positive(), z.null()]).optional(),
  wristCircumference: z.union([z.coerce.number().finite().positive(), z.null()]).optional(),
  pantsWaist: z.union([z.coerce.number().finite().positive(), z.null()]).optional(),
  pantsHip: z.union([z.coerce.number().finite().positive(), z.null()]).optional(),
  thighCircumference: z.union([z.coerce.number().finite().positive(), z.null()]).optional(),
  waistToPantsLength: z.union([z.coerce.number().finite().positive(), z.null()]).optional(),
  hemStyle: z.union([z.string().trim().max(80), z.null()]).optional(),
  pressingStyle: z.union([z.string().trim().max(80), z.null()]).optional(),
  tailorNote: z.union([z.string().trim().max(1000), z.null()]).optional(),
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
