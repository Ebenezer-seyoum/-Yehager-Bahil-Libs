import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../../middleware/auth.js";
import { db } from "../../lib/db/drizzle.js";
import { cartItems, events, familyGroups, familyMembers, measurements, orders, products, uploadedDesigns } from "../../lib/db/schema.js";
import type { AppBindings } from "../../types/hono.js";

const createGroupSchema = z.object({
  groupName: z.string().min(1).max(160),
  eventId: z.string().uuid().optional(),
  groupType: z.enum(["family_group", "event_group"]).optional(),
  productId: z.string().uuid().optional(),
  uploadedDesignId: z.string().uuid().optional(),
});

function isChildRelation(relation?: string | null) {
  const normalized = String(relation ?? "").toLowerCase();
  return ["son", "daughter", "child", "children", "kid", "kids"].some((token) => normalized.includes(token));
}

const groupIdParam = z.object({
  groupId: z.string().uuid(),
});
const updateGroupSchema = z.object({
  groupName: z.string().min(1).max(160).optional(),
  productId: z.string().uuid().nullable().optional(),
  uploadedDesignId: z.string().uuid().nullable().optional(),
});

const createMemberSchema = z.object({
  name: z.string().min(1).max(160),
  relation: z.string().optional(),
  age: z.coerce.number().int().min(0).max(17).nullable().optional(),
  gender: z.enum(["male", "female", "unisex"]),
  measurements: z.record(z.string(), z.unknown()).optional(),
  measurementId: z.string().uuid().optional(),
}).superRefine((body, ctx) => {
  if (isChildRelation(body.relation) && body.age == null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["age"], message: "Age is required for child family members." });
  }
});

const memberParam = z.object({
  groupId: z.string().uuid(),
  memberId: z.string().uuid(),
});

const updateMemberSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  relation: z.string().optional(),
  age: z.coerce.number().int().min(0).max(17).nullable().optional(),
  gender: z.enum(["male", "female", "unisex"]).optional(),
  measurements: z.record(z.string(), z.unknown()).optional(),
  measurementId: z.string().uuid().nullable().optional(),
  productId: z.string().uuid().nullable().optional(),
}).superRefine((body, ctx) => {
  if (isChildRelation(body.relation) && body.age == null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["age"], message: "Age is required for child family members." });
  }
});

export const familyGroupsRouter = new Hono<AppBindings>();
const requiredMeasurements = ["chest", "waist", "hips", "shoulderWidth", "armLength", "torsoLength"];

familyGroupsRouter.post("/", requireAuth, zValidator("json", createGroupSchema), async (c) => {
  const authUser = c.get("authUser");
  if (!authUser?.email) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const body = c.req.valid("json");

  const event = body.eventId ? await db.query.events.findFirst({
    where: and(eq(events.id, body.eventId), eq(events.isActive, true)),
  }) : null;
  if (body.eventId && !event) throw new HTTPException(404, { message: "Event not found" });
  const product = body.productId ? await db.query.products.findFirst({
    where: and(eq(products.id, body.productId), eq(products.isActive, true)),
  }) : null;
  if (body.productId && !product) throw new HTTPException(404, { message: "Product not found" });
  const design = body.uploadedDesignId ? await db.query.uploadedDesigns.findFirst({
    where: and(eq(uploadedDesigns.id, body.uploadedDesignId), eq(uploadedDesigns.userEmail, authUser.email)),
  }) : null;
  if (body.uploadedDesignId && !design) throw new HTTPException(404, { message: "Custom design not found" });

  const existing = await db.query.familyGroups.findFirst({
    where: body.eventId
      ? and(eq(familyGroups.eventId, body.eventId), eq(familyGroups.leadEmail, authUser.email))
      : and(eq(familyGroups.groupName, body.groupName), eq(familyGroups.leadEmail, authUser.email)),
  });
  if (existing) {
    return c.json({ data: existing });
  }

  const [group] = await db
    .insert(familyGroups)
    .values({
      groupName: body.groupName,
      eventId: body.eventId,
      eventName: event?.name,
      groupType: body.groupType ?? (body.eventId ? "event_group" : "family_group"),
      selectionType: body.productId ? "catalog_product" : body.uploadedDesignId ? "custom_design" : event?.selectionType,
      productId: body.productId ?? event?.productId,
      uploadedDesignId: body.uploadedDesignId ?? event?.uploadedDesignId,
      productName: product?.name ?? design?.designTitle ?? event?.productName,
      productImage: product?.images?.[0] ?? design?.frontImageUrl,
      leadEmail: authUser.email,
      leadName: authUser.email.split("@")[0],
    })
    .returning();

  return c.json({ data: group }, 201);
});

familyGroupsRouter.get("/mine", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  if (!authUser?.email) throw new HTTPException(401, { message: "Unauthorized" });
  const [groups, members, userCart, userOrders] = await Promise.all([
    db.query.familyGroups.findMany({
      where: and(eq(familyGroups.leadEmail, authUser.email), eq(familyGroups.groupType, "family_group")),
      orderBy: [desc(familyGroups.updatedAt)],
    }),
    db.query.familyMembers.findMany({ orderBy: [desc(familyMembers.createdAt)] }),
    db.query.cartItems.findMany({ where: eq(cartItems.userEmail, authUser.email) }),
    db.query.orders.findMany({ where: eq(orders.userEmail, authUser.email), orderBy: [desc(orders.createdAt)] }),
  ]);

  const data = groups.map((group) => {
    const groupMembers = members.filter((member) => member.familyGroupId === group.id);
    const readyMembers = groupMembers.filter((member) => requiredMeasurements.every((field) => {
      const value = member.measurements?.[field];
      return value !== null && value !== undefined && String(value).trim() !== "";
    })).length;
    const inCart = userCart.some((item) => item.itemMetadata?.group_id === group.id);
    const ordered = userOrders.some((order) => order.items.some((item) => {
      const metadata = item.item_metadata as Record<string, unknown> | undefined;
      return metadata?.group_id === group.id;
    }));
    const paid = userOrders.some((order) => order.paymentStatus === "paid" && order.items.some((item) => {
      const metadata = item.item_metadata as Record<string, unknown> | undefined;
      return metadata?.group_id === group.id;
    }));
    const hasOutfit = Boolean(group.productId || group.uploadedDesignId);
    const allReady = groupMembers.length > 0 && readyMembers === groupMembers.length;
    const currentStep = paid || ordered ? 4 : allReady || inCart ? 3 : hasOutfit ? 2 : 1;
    return { ...group, memberCount: groupMembers.length, readyMemberCount: readyMembers, inCart, ordered, paid, currentStep };
  });
  return c.json({ data });
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
  const selectedDesign = group.uploadedDesignId ? await db.query.uploadedDesigns.findFirst({
    where: eq(uploadedDesigns.id, group.uploadedDesignId),
  }) : null;

  return c.json({ data: { group, members, selectedDesign } });
});

familyGroupsRouter.patch("/:groupId", requireAuth, zValidator("param", groupIdParam), zValidator("json", updateGroupSchema), async (c) => {
  const authUser = c.get("authUser");
  const { groupId } = c.req.valid("param");
  const body = c.req.valid("json");

  let sourcePatch: Record<string, unknown> = {};
  if (body.productId) {
    const product = await db.query.products.findFirst({ where: and(eq(products.id, body.productId), eq(products.isActive, true)) });
    if (!product) throw new HTTPException(404, { message: "Product not found" });
    sourcePatch = { selectionType: "catalog_product", productId: product.id, productName: product.name, productImage: product.images?.[0], uploadedDesignId: null };
  } else if (body.uploadedDesignId) {
    const design = await db.query.uploadedDesigns.findFirst({ where: and(eq(uploadedDesigns.id, body.uploadedDesignId), eq(uploadedDesigns.userEmail, authUser?.email ?? "")) });
    if (!design) throw new HTTPException(404, { message: "Custom design not found" });
    sourcePatch = { selectionType: "custom_design", uploadedDesignId: design.id, productId: null, productName: design.designTitle, productImage: design.frontImageUrl };
  }
  const [row] = await db
    .update(familyGroups)
    .set({
      groupName: body.groupName,
      ...sourcePatch,
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

  let measurementSnapshot = body.measurements;
  if (body.measurementId) {
    const saved = await db.query.measurements.findFirst({
      where: and(eq(measurements.id, body.measurementId), eq(measurements.userEmail, authUser?.email ?? "")),
    });
    if (!saved) throw new HTTPException(404, { message: "Saved measurement not found" });
    measurementSnapshot = {
      chest: saved.chest, waist: saved.waist, hips: saved.hips, shoulderWidth: saved.shoulderWidth,
      armLength: saved.armLength, torsoLength: saved.torsoLength, inseam: saved.inseam, neck: saved.neck,
      ...(saved.measurementDetails ?? {}),
    };
  }

  const [member] = await db
    .insert(familyMembers)
    .values({
      familyGroupId: group.id,
      eventId: group.eventId,
      name: body.name,
      relation: body.relation,
      age: body.age,
      gender: body.gender,
      measurements: measurementSnapshot,
      measurementId: body.measurementId,
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

    let measurementSnapshot = body.measurements;
    if (body.measurementId) {
      const saved = await db.query.measurements.findFirst({
        where: and(eq(measurements.id, body.measurementId), eq(measurements.userEmail, authUser?.email ?? "")),
      });
      if (!saved) throw new HTTPException(404, { message: "Saved measurement not found" });
      measurementSnapshot = {
        chest: saved.chest, waist: saved.waist, hips: saved.hips, shoulderWidth: saved.shoulderWidth,
        armLength: saved.armLength, torsoLength: saved.torsoLength, inseam: saved.inseam, neck: saved.neck,
        ...(saved.measurementDetails ?? {}),
      };
    }
    const [row] = await db
      .update(familyMembers)
      .set({
        name: body.name,
        relation: body.relation,
        age: body.age === undefined ? undefined : body.age,
        gender: body.gender,
        measurements: measurementSnapshot,
        measurementId: body.measurementId === undefined ? undefined : body.measurementId,
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

  const fallbackEventProduct = group.eventId ? await db.query.events.findFirst({
    where: eq(events.id, group.eventId),
  }) : null;

  const rowsToInsert = [];
  for (const member of members) {
    const memberProductId = member.productId ?? group.productId ?? fallbackEventProduct?.productId ?? null;
    const designId = member.uploadedDesignId ?? group.uploadedDesignId ?? fallbackEventProduct?.uploadedDesignId ?? null;
    if (!memberProductId && !designId) continue;

    const product = memberProductId ? await db.query.products.findFirst({
      where: and(eq(products.id, memberProductId), eq(products.isActive, true)),
    }) : null;
    const design = designId ? await db.query.uploadedDesigns.findFirst({ where: eq(uploadedDesigns.id, designId) }) : null;
    if (!product && (!design || design.status !== "awaiting_payment" || !design.quotedPriceUsd)) continue;

    rowsToInsert.push({
      userEmail: authUser.email,
      productId: product?.id,
      productName: `${product?.name ?? design?.designTitle ?? "Custom Design"} — ${member.name}`,
      productImage: member.productImage ?? product?.images?.[0] ?? design?.frontImageUrl,
      priceUsd: product ? product.priceUsd : design!.quotedPriceUsd!,
      quantity: 1,
      itemType: "group_order",
      uploadedDesignId: design?.id,
      itemMetadata: {
        type: "group_order",
        group_id: group.id,
        group_name: group.groupName,
        member_id: member.id,
        member_name: member.name,
        member_gender: member.gender,
        member_age: member.age,
        selection_type: design ? "custom_design" : "catalog_product",
        uploaded_design_id: design?.id,
      },
      measurementSnapshot: member.measurements ?? {},
      eventId: group.eventId,
      eventName: group.eventName,
    });
  }

  if (!rowsToInsert.length) {
    throw new HTTPException(400, { message: "No valid product assignments found on family members" });
  }

  await db
    .delete(cartItems)
    .where(and(
      eq(cartItems.userEmail, authUser.email),
      eq(cartItems.itemType, "group_order"),
      sql`${cartItems.itemMetadata}->>'group_id' = ${group.id}`,
    ));
  await db.insert(cartItems).values(rowsToInsert);

  return c.json({ data: { added: rowsToInsert.length } }, 201);
});
