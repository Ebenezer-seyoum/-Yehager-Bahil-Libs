import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../../middleware/auth.js";
import { db } from "../../lib/db/drizzle.js";
import { events, eventParticipants } from "../../lib/db/schema.js";
import type { AppBindings } from "../../types/hono.js";

const listSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  mine: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

const idParamSchema = z.object({
  eventId: z.string().uuid(),
});

const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  eventDate: z.string().optional(),
  message: z.string().optional(),
  productId: z.string().uuid().optional(),
  productName: z.string().optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
});

export const eventsRouter = new Hono<AppBindings>();

eventsRouter.get("/", zValidator("query", listSchema), async (c) => {
  const { limit, mine } = c.req.valid("query");
  if (mine) {
    const authHeader = c.req.header("authorization");
    if (!authHeader) {
      throw new HTTPException(401, { message: "Unauthorized" });
    }
  }

  const rows = await db.query.events.findMany({
    where: eq(events.isActive, true),
    orderBy: [desc(events.createdAt)],
    limit: limit ?? 80,
  });

  return c.json({ data: rows });
});

eventsRouter.get("/:eventId", zValidator("param", idParamSchema), async (c) => {
  const { eventId } = c.req.valid("param");
  const row = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.isActive, true)),
  });
  if (!row) {
    throw new HTTPException(404, { message: "Event not found" });
  }
  return c.json({ data: row });
});

eventsRouter.post("/", requireAuth, zValidator("json", createEventSchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  if (!authUser?.email) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  const eventCode = `EVT-${Date.now().toString(36).toUpperCase()}`;
  const [row] = await db
    .insert(events)
    .values({
      name: body.name,
      ownerEmail: authUser.email,
      ownerName: authUser.email.split("@")[0],
      eventCode,
      eventDate: body.eventDate ? new Date(body.eventDate) : undefined,
      message: body.message,
      productId: body.productId,
      productName: body.productName,
      shippingAddress: body.shippingAddress,
      isActive: true,
    })
    .returning();

  return c.json({ data: row }, 201);
});

eventsRouter.post("/:eventId/join", requireAuth, zValidator("param", idParamSchema), async (c) => {
  const authUser = c.get("authUser");
  if (!authUser?.email) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  const { eventId } = c.req.valid("param");
  const event = await db.query.events.findFirst({
    where: and(eq(events.id, eventId), eq(events.isActive, true)),
  });
  if (!event) {
    throw new HTTPException(404, { message: "Event not found" });
  }

  const existing = await db.query.eventParticipants.findFirst({
    where: and(eq(eventParticipants.eventId, eventId), eq(eventParticipants.participantEmail, authUser.email)),
  });

  if (!existing) {
    await db.insert(eventParticipants).values({
      eventId,
      eventName: event.name,
      participantEmail: authUser.email,
      participantName: authUser.email.split("@")[0],
      orderStatus: "browsing",
      paymentStatus: "unpaid",
    });
  }

  return c.json({ data: { joined: true } }, 201);
});

eventsRouter.get("/:eventId/participants", requireAuth, zValidator("param", idParamSchema), async (c) => {
  const { eventId } = c.req.valid("param");
  const rows = await db.query.eventParticipants.findMany({
    where: eq(eventParticipants.eventId, eventId),
    orderBy: [desc(eventParticipants.createdAt)],
  });
  return c.json({ data: rows });
});
