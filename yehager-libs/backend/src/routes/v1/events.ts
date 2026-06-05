import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../../middleware/auth.js";
import { db } from "../../lib/db/drizzle.js";
import { events, eventParticipants, familyGroups, familyMembers, orders, products, uploadedDesigns } from "../../lib/db/schema.js";
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
  selectionType: z.enum(["catalog_product", "custom_design"]).optional(),
  uploadedDesignId: z.string().uuid().optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
});

export const eventsRouter = new Hono<AppBindings>();

eventsRouter.get("/", zValidator("query", listSchema), async (c) => {
  const { limit } = c.req.valid("query");

  const rows = await db.query.events.findMany({
    where: eq(events.isActive, true),
    orderBy: [desc(events.createdAt)],
    limit: limit ?? 80,
  });

  return c.json({ data: rows });
});
const updateEventSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  productId: z.string().uuid().nullable().optional(),
  uploadedDesignId: z.string().uuid().nullable().optional(),
});

eventsRouter.get("/mine", requireAuth, zValidator("query", listSchema), async (c) => {
  const authUser = c.get("authUser");
  const { limit } = c.req.valid("query");
  if (!authUser?.email) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  const rows = await db.query.events.findMany({
    where: and(eq(events.isActive, true), eq(events.ownerEmail, authUser.email)),
    orderBy: [desc(events.createdAt)],
    limit: limit ?? 80,
  });
  const [participants, eventOrders] = await Promise.all([
    db.query.eventParticipants.findMany(),
    db.query.orders.findMany(),
  ]);
  return c.json({
    data: rows.map((event) => {
      const eventParticipantsRows = participants.filter((participant) => participant.eventId === event.id);
      const ordersRows = eventOrders.filter((order) => order.eventId === event.id);
      const participantCount = eventParticipantsRows.length;
      const orderCount = ordersRows.length;
      const paidCount = ordersRows.filter((order) => order.paymentStatus === "paid").length;
      const hasOutfit = Boolean(event.productId || event.uploadedDesignId);
      const currentStep = orderCount > 0 || paidCount > 0 ? 4 : participantCount > 0 ? 3 : hasOutfit ? 2 : 1;
      return { ...event, participantCount, orderCount, paidCount, currentStep };
    }),
  });
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
      selectionType: body.selectionType ?? (body.productId ? "catalog_product" : body.uploadedDesignId ? "custom_design" : undefined),
      uploadedDesignId: body.uploadedDesignId,
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

eventsRouter.patch("/:eventId", requireAuth, zValidator("param", idParamSchema), zValidator("json", updateEventSchema), async (c) => {
  const authUser = c.get("authUser");
  const { eventId } = c.req.valid("param");
  const body = c.req.valid("json");

  let sourcePatch: Record<string, unknown> = {};
  let groupSourcePatch: Record<string, unknown> = {};
  if (body.productId) {
    const product = await db.query.products.findFirst({ where: and(eq(products.id, body.productId), eq(products.isActive, true)) });
    if (!product) throw new HTTPException(404, { message: "Product not found" });
    sourcePatch = { selectionType: "catalog_product", productId: product.id, productName: product.name, uploadedDesignId: null };
    groupSourcePatch = { ...sourcePatch, productImage: product.images?.[0] ?? null };
  } else if (body.uploadedDesignId) {
    const design = await db.query.uploadedDesigns.findFirst({
      where: and(eq(uploadedDesigns.id, body.uploadedDesignId), eq(uploadedDesigns.userEmail, authUser?.email ?? "")),
    });
    if (!design) throw new HTTPException(404, { message: "Custom design not found" });
    sourcePatch = { selectionType: "custom_design", uploadedDesignId: design.id, productId: null, productName: design.designTitle };
    groupSourcePatch = { ...sourcePatch, productImage: design.frontImageUrl };
  }

  const [row] = await db
    .update(events)
    .set({ name: body.name, ...sourcePatch, updatedAt: new Date() })
    .where(and(eq(events.id, eventId), eq(events.ownerEmail, authUser?.email ?? "")))
    .returning();
  if (!row) throw new HTTPException(404, { message: "Event not found" });
  if (Object.keys(groupSourcePatch).length) {
    await db.update(familyGroups).set({ ...groupSourcePatch, updatedAt: new Date() }).where(eq(familyGroups.eventId, eventId));
  }
  return c.json({ data: row });
});

eventsRouter.get("/:eventId/dashboard", requireAuth, zValidator("param", idParamSchema), async (c) => {
  const { eventId } = c.req.valid("param");
  const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
  const [participants, groups, members, eventOrders, selectedDesign] = await Promise.all([
    db.query.eventParticipants.findMany({
      where: eq(eventParticipants.eventId, eventId),
      orderBy: [desc(eventParticipants.createdAt)],
    }),
    db.query.familyGroups.findMany({
      where: eq(familyGroups.eventId, eventId),
      orderBy: [desc(familyGroups.createdAt)],
    }),
    db.query.familyMembers.findMany({
      where: eq(familyMembers.eventId, eventId),
      orderBy: [desc(familyMembers.createdAt)],
    }),
    db.query.orders.findMany({
      where: eq(orders.eventId, eventId),
      orderBy: [desc(orders.createdAt)],
    }),
    event?.uploadedDesignId ? db.query.uploadedDesigns.findFirst({ where: eq(uploadedDesigns.id, event.uploadedDesignId) }) : null,
  ]);

  return c.json({
    data: {
      participants,
      familyGroups: groups,
      familyMembers: members,
      orders: eventOrders,
      selectedDesign,
    },
  });
});
