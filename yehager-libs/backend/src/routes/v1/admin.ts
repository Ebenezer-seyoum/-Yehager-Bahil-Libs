import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { db } from "../../lib/db/drizzle.js";
import { auditLogs, systemAlerts } from "../../lib/db/schema.js";
import type { AppBindings } from "../../types/hono.js";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

const alertParamSchema = z.object({
  alertId: z.string().uuid(),
});

const resolveAlertSchema = z.object({
  isResolved: z.boolean().optional(),
});

export const adminRouter = new Hono<AppBindings>();

adminRouter.use("/*", requireAuth, requireRole("admin"));

adminRouter.get("/alerts", zValidator("query", listQuerySchema), async (c) => {
  const { limit } = c.req.valid("query");
  const data = await db.query.systemAlerts.findMany({
    orderBy: [desc(systemAlerts.createdAt)],
    limit: limit ?? 100,
  });
  return c.json({ data });
});

adminRouter.patch("/alerts/:alertId", zValidator("param", alertParamSchema), zValidator("json", resolveAlertSchema), async (c) => {
  const authUser = c.get("authUser");
  const { alertId } = c.req.valid("param");
  const body = c.req.valid("json");
  const isResolved = body.isResolved ?? true;

  const [row] = await db
    .update(systemAlerts)
    .set({
      isResolved,
      resolvedBy: isResolved ? authUser?.email ?? "admin" : null,
      updatedAt: new Date(),
    })
    .where(eq(systemAlerts.id, alertId))
    .returning();

  if (!row) {
    throw new HTTPException(404, { message: "Alert not found" });
  }

  return c.json({ data: row });
});

adminRouter.get("/audit", zValidator("query", listQuerySchema), async (c) => {
  const { limit } = c.req.valid("query");
  const data = await db.query.auditLogs.findMany({
    orderBy: [desc(auditLogs.createdAt)],
    limit: limit ?? 150,
  });
  return c.json({ data });
});

adminRouter.get("/audit/:auditId", async (c) => {
  const auditId = c.req.param("auditId");
  const data = await db.query.auditLogs.findFirst({
    where: eq(auditLogs.id, auditId),
  });
  if (!data) {
    throw new HTTPException(404, { message: "Audit log not found" });
  }
  return c.json({ data });
});
