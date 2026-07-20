import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../../middleware/auth.js";
import {
  listNotificationsForUser,
  markNotificationsReadForUser,
  notificationSummaryForUser,
} from "../../services/notifications-service.js";
import type { AppBindings } from "../../types/hono.js";

const listSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

const categorySchema = z.enum([
  "orders",
  "custom_orders",
  "custom_designs",
  "payments",
  "shipping",
  "returns",
  "catalog_prices",
  "support",
  "alerts",
]);

const readSchema = z
  .object({
    alertIds: z.array(z.string().uuid()).max(200).optional(),
    entityId: z.string().trim().min(1).max(255).optional(),
    category: categorySchema.optional(),
    all: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.all || value.entityId || value.category || value.alertIds?.length), {
    message: "Select at least one notification",
  });

export const notificationsRouter = new Hono<AppBindings>();

notificationsRouter.use("/*", requireAuth);

notificationsRouter.get("/", zValidator("query", listSchema), async (c) => {
  const authUser = c.get("authUser");
  const { limit } = c.req.valid("query");
  return c.json({ data: await listNotificationsForUser(authUser?.email ?? "", limit) });
});

notificationsRouter.get("/summary", async (c) => {
  const authUser = c.get("authUser");
  return c.json({ data: await notificationSummaryForUser(authUser?.email ?? "") });
});

notificationsRouter.patch("/read", zValidator("json", readSchema), async (c) => {
  const authUser = c.get("authUser");
  const result = await markNotificationsReadForUser(authUser?.email ?? "", c.req.valid("json"));
  return c.json({ data: result });
});
