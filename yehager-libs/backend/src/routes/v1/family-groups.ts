import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../../middleware/auth.js";
import { db } from "../../lib/db/drizzle.js";
import { cartItems, events, familyGroups, familyMembers, products } from "../../lib/db/schema.js";
import type { AppBindings } from "../../types/hono.js";

const createGroupSchema = z.object({
  groupName: z.string().min(1).max(160),
  eventId: z.string().uuid(),
});

const groupIdParam = z.object({
  groupId: z.string().uuid(),
});
const updateGroupSchema = z.object({
  groupName: z.string().min(1).max(160),
});

const createMemberSchema = z.object({
  name: z.string().min(1).max(160),
  relation: z.string().optional(),
  gender: z.enum(["male", "female", "unisex"]),
  measurements: z.record(z.string(), z.unknown()).optional(),
});

const memberParam = z.object({
  groupId: z.string().uuid(),
  memberId: z.string().uuid(),
});

const updateMemberSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  relation: z.string().optional(),
  gender: z.enum(["male", "female", "unisex"]).optional(),
  measurements: z.record(z.string(), z.unknown()).optional(),
  productId: z.string().uuid().nullable().optional(),
});

export const familyGroupsRouter = new Hono<AppBindings>();

familyGroupsRouter.post("/", requireAuth, zValidator("json", createGroupSchema), async (c) => {
  const authUser = c.get("authUser");
  if (!authUser?.email) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const body = c.req.valid("json");

  const event = await db.query.events.findFirst({
    where: and(eq(events.id, body.eventId), eq(events.isActive, true)),
  });
  if (!event) {
    throw new HTTPException(404, { message: "Event not found" });
  }

  const existing = await db.query.familyGroups.findFirst({
    where: and(eq(familyGroups.eventId, body.eventId), eq(familyGroups.leadEmail, authUser.email)),
  });
  if (existing) {
    return c.json({ data: existing });
  }

  const [group] = await db
    .insert(familyGroups)
    .values({
      groupName: body.groupName,
      eventId: body.eventId,
      eventName: event.name,
      leadEmail: authUser.email,
      leadName: authUser.email.split("@")[0],
    })
    .returning();

  return c.json({ data: group }, 201);
});

familyGroupsRouter.get("/:groupId", requireAuth, zValidator("param", groupIdParam), async (c) => {
  const authUser = c.get("authUser");
  const { groupId } = c.req.valid("param");

  const group = await db.query.familyGroups.findFirst({
    where: and(eq(familyGroups.id, groupId), eq(familyGroups.leadEmail, authUser?.email ?? "")),
  });
  if (!group) {
    throw new HTTPException(404, { message: "Family group not found" });
  }

  const members = await db.query.familyMembers.findMany({
    where: eq(familyMembers.familyGroupId, groupId),
    orderBy: [desc(familyMembers.createdAt)],
  });

  return c.json({ data: { group, members } });
});

familyGroupsRouter.patch("/:groupId", requireAuth, zValidator("param", groupIdParam), zValidator("json", updateGroupSchema), async (c) => {
  const authUser = c.get("authUser");
  const { groupId } = c.req.valid("param");
  const body = c.req.valid("json");

  const [row] = await db
    .update(familyGroups)
    .set({
      groupName: body.groupName,
      updatedAt: new Date(),
    })
    .where(and(eq(familyGroups.id, groupId), eq(familyGroups.leadEmail, authUser?.email ?? "")))
    .returning();

  if (!row) {
    throw new HTTPException(404, { message: "Family group not found" });
  }

  return c.json({ data: row });
});

familyGroupsRouter.post("/:groupId/members", requireAuth, zValidator("param", groupIdParam), zValidator("json", createMemberSchema), async (c) => {
  const authUser = c.get("authUser");
  const { groupId } = c.req.valid("param");
  const body = c.req.valid("json");

  const group = await db.query.familyGroups.findFirst({
    where: and(eq(familyGroups.id, groupId), eq(familyGroups.leadEmail, authUser?.email ?? "")),
  });
  if (!group) {
    throw new HTTPException(404, { message: "Family group not found" });
  }

  const [member] = await db
    .insert(familyMembers)
    .values({
      familyGroupId: group.id,
      eventId: group.eventId,
      name: body.name,
      relation: body.relation,
      gender: body.gender,
      measurements: body.measurements,
    })
    .returning();

  return c.json({ data: member }, 201);
});

familyGroupsRouter.delete("/:groupId/members/:memberId", requireAuth, zValidator("param", memberParam), async (c) => {
  const authUser = c.get("authUser");
  const { groupId, memberId } = c.req.valid("param");

  const group = await db.query.familyGroups.findFirst({
    where: and(eq(familyGroups.id, groupId), eq(familyGroups.leadEmail, authUser?.email ?? "")),
  });
  if (!group) {
    throw new HTTPException(404, { message: "Family group not found" });
  }

  const [row] = await db
    .delete(familyMembers)
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.familyGroupId, groupId)))
    .returning({ id: familyMembers.id });

  if (!row) {
    throw new HTTPException(404, { message: "Family member not found" });
  }

  return c.body(null, 204);
});

familyGroupsRouter.patch(
  "/:groupId/members/:memberId",
  requireAuth,
  zValidator("param", memberParam),
  zValidator("json", updateMemberSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { groupId, memberId } = c.req.valid("param");
    const body = c.req.valid("json");

    const group = await db.query.familyGroups.findFirst({
      where: and(eq(familyGroups.id, groupId), eq(familyGroups.leadEmail, authUser?.email ?? "")),
    });
    if (!group) {
      throw new HTTPException(404, { message: "Family group not found" });
    }

    let productName: string | null | undefined;
    let productImage: string | null | undefined;
    let priceUsd: string | null | undefined;
    if (body.productId) {
      const product = await db.query.products.findFirst({
        where: and(eq(products.id, body.productId), eq(products.isActive, true)),
      });
      if (!product) {
        throw new HTTPException(404, { message: "Product not found" });
      }
      productName = product.name;
      productImage = product.images?.[0] ?? null;
      priceUsd = product.priceUsd;
    } else if (body.productId === null) {
      productName = null;
      productImage = null;
      priceUsd = null;
    }

    const [row] = await db
      .update(familyMembers)
      .set({
        name: body.name,
        relation: body.relation,
        gender: body.gender,
        measurements: body.measurements,
        productId: body.productId === undefined ? undefined : body.productId,
        productName,
        productImage,
        priceUsd,
        updatedAt: new Date(),
      })
      .where(and(eq(familyMembers.id, memberId), eq(familyMembers.familyGroupId, groupId)))
      .returning();

    if (!row) {
      throw new HTTPException(404, { message: "Family member not found" });
    }
    return c.json({ data: row });
  },
);

familyGroupsRouter.post("/:groupId/add-to-cart", requireAuth, zValidator("param", groupIdParam), async (c) => {
  const authUser = c.get("authUser");
  if (!authUser?.email) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  const { groupId } = c.req.valid("param");
  const group = await db.query.familyGroups.findFirst({
    where: and(eq(familyGroups.id, groupId), eq(familyGroups.leadEmail, authUser.email)),
  });
  if (!group) {
    throw new HTTPException(404, { message: "Family group not found" });
  }

  const members = await db.query.familyMembers.findMany({
    where: eq(familyMembers.familyGroupId, groupId),
    orderBy: [desc(familyMembers.createdAt)],
  });
  if (!members.length) {
    throw new HTTPException(400, { message: "No family members to add" });
  }

  const fallbackEventProduct = await db.query.events.findFirst({
    where: eq(events.id, group.eventId),
  });

  const rowsToInsert = [];
  for (const member of members) {
    const memberProductId = member.productId ?? fallbackEventProduct?.productId ?? null;
    if (!memberProductId) continue;

    const product = await db.query.products.findFirst({
      where: and(eq(products.id, memberProductId), eq(products.isActive, true)),
    });
    if (!product) continue;

    rowsToInsert.push({
      userEmail: authUser.email,
      productId: product.id,
      productName: `${product.name} — ${member.name}`,
      productImage: member.productImage ?? product.images?.[0],
      priceUsd: product.priceUsd,
      quantity: 1,
      itemType: "group_order",
      itemMetadata: {
        type: "group_order",
        group_id: group.id,
        group_name: group.groupName,
        member_id: member.id,
        member_name: member.name,
        member_gender: member.gender,
      },
      measurementSnapshot: member.measurements ?? {},
      eventId: group.eventId,
      eventName: group.eventName,
    });
  }

  if (!rowsToInsert.length) {
    throw new HTTPException(400, { message: "No valid product assignments found on family members" });
  }

  await db.insert(cartItems).values(rowsToInsert);

  return c.json({ data: { added: rowsToInsert.length } }, 201);
});
