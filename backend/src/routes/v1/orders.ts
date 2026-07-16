import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../../middleware/auth.js";
import { requireAnyPermission, requirePermission } from "../../middleware/permissions.js";
import { PERMISSIONS } from "../../lib/auth/permissions.js";
import {
  createOrderNote,
  deleteOrderNote,
  createCheckoutIntent,
  getOrderDetailsForAdmin,
  getOrderDetailsForCurrentUser,
  getOrdersForAdmin,
  getOrdersForCurrentUser,
  listOrderNotes,
  previewCheckoutCoupon,
  submitEtbPaymentProof,
  updateOrderNote,
  updateOrderAdminState,
} from "../../services/orders-service.js";
import { systemAlerts } from "../../lib/db/schema.js";
import { db } from "../../lib/db/drizzle.js";
import { and, eq, sql } from "drizzle-orm";
import type { AppBindings } from "../../types/hono.js";
import { getUserByEmail } from "../../repositories/users-repository.js";
import { getEffectivePermissionsForUser } from "../../services/permissions-service.js";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});
const ORDER_READ_PERMISSIONS = [
  PERMISSIONS.ORDERS_VIEW,
  PERMISSIONS.CUSTOMERS_VIEW,
  PERMISSIONS.PAYMENTS_VIEW,
  PERMISSIONS.TRANSACTIONS_VIEW,
  PERMISSIONS.RETURNS_VIEW,
  PERMISSIONS.SHIPPING_VIEW,
  PERMISSIONS.DOCUMENTS_VIEW,
];
const checkoutIntentSchema = z.object({
  cartItemIds: z.array(z.string().uuid()).min(1),
  fulfillmentType: z.enum(["mail", "pickup"]).optional(),
  paymentMethod: z.enum(["stripe_usd", "etb_bank_transfer"]).optional(),
  paymentCurrency: z.enum(["USD", "ETB"]).optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  useEventOwnerAddress: z.boolean().optional(),
  carrier: z.string().optional(),
  pickupLocation: z.string().optional(),
  pickupPersonName: z.string().optional(),
  pickupPersonPhone: z.string().optional(),
  remarks: z.string().max(1000).optional(),
  couponCode: z.string().trim().max(64).optional(),
});
const couponPreviewSchema = z.object({
  cartItemIds: z.array(z.string().uuid()).min(1),
  fulfillmentType: z.enum(["mail", "pickup"]).optional(),
  carrier: z.string().optional(),
  couponCode: z.string().trim().min(1).max(64),
});
const etbProofSchema = z.object({
  paymentProofUrl: z.string().url(),
});
const adminUpdateSchema = z.object({
  status: z
    .enum([
      "pending",
      "processing",
      "fulfilled",
      "tailoring",
      "quality_check",
      "shipped",
      "delivered",
      "ready_for_pickup",
      "picked_up",
      "cancelled",
    ])
    .optional(),
  paymentStatus: z.enum(["pending", "awaiting_verification", "paid", "failed", "refunded", "unpaid"]).optional(),
  fulfillmentType: z.enum(["mail", "pickup"]).optional(),
  carrier: z.string().trim().max(120).optional(),
  deliveryStatus: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().max(120).optional().nullable(),
  deliveryNote: z.string().trim().max(1000).optional(),
});
const noteSchema = z.object({
  noteType: z.enum(["admin", "tailor", "delivery", "customer"]),
  note: z.string().trim().min(3).max(1000),
});
const notePatchSchema = z.object({
  note: z.string().trim().min(3).max(1000),
});

export const ordersRouter = new Hono<AppBindings>();

ordersRouter.get("/me", requireAuth, zValidator("query", querySchema), async (c) => {
  const authUser = c.get("authUser");
  const { limit } = c.req.valid("query");
  const data = await getOrdersForCurrentUser(authUser?.email, limit ?? 50);
  return c.json({ data });
});

ordersRouter.get("/me/:orderId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const orderId = c.req.param("orderId");
  const data = await getOrderDetailsForCurrentUser({ orderId, userEmail: authUser?.email });
  return c.json({ data });
});

ordersRouter.post("/checkout-intent", requireAuth, zValidator("json", checkoutIntentSchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  const data = await createCheckoutIntent({
    userEmail: authUser?.email,
    cartItemIds: body.cartItemIds,
    fulfillmentType: body.fulfillmentType,
    paymentMethod: body.paymentMethod,
    paymentCurrency: body.paymentCurrency,
    shippingAddress: body.shippingAddress,
    useEventOwnerAddress: body.useEventOwnerAddress,
    carrier: body.carrier,
    pickupLocation: body.pickupLocation,
    pickupPersonName: body.pickupPersonName,
    pickupPersonPhone: body.pickupPersonPhone,
    remarks: body.remarks,
    couponCode: body.couponCode,
  });
  return c.json({ data }, 201);
});

ordersRouter.post("/coupon-preview", requireAuth, zValidator("json", couponPreviewSchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  const data = await previewCheckoutCoupon({
    userEmail: authUser?.email,
    cartItemIds: body.cartItemIds,
    fulfillmentType: body.fulfillmentType,
    carrier: body.carrier,
    couponCode: body.couponCode,
  });
  return c.json({ data });
});

ordersRouter.post("/me/:orderId/etb-proof", requireAuth, zValidator("json", etbProofSchema), async (c) => {
  const authUser = c.get("authUser");
  const orderId = c.req.param("orderId");
  const body = c.req.valid("json");
  const data = await submitEtbPaymentProof({
    orderId,
    userEmail: authUser?.email,
    paymentProofUrl: body.paymentProofUrl,
  });
  return c.json({ data });
});

ordersRouter.get("/", requireAuth, requireAnyPermission(ORDER_READ_PERMISSIONS), zValidator("query", querySchema), async (c) => {
  const { limit } = c.req.valid("query");
  const data = await getOrdersForAdmin(limit ?? 100);
  return c.json({ data });
});

ordersRouter.get("/admin/:orderId", requireAuth, requireAnyPermission(ORDER_READ_PERMISSIONS), async (c) => {
  const orderId = c.req.param("orderId");
  const data = await getOrderDetailsForAdmin(orderId);

  await db
    .update(systemAlerts)
    .set({
      isResolved: true,
      resolvedBy: "admin_viewed_order",
      updatedAt: new Date(),
    })
    .where(
      and(
        sql`${systemAlerts.type} IN ('new_order', 'new_catalog_order', 'payment_review', 'payment_proof_uploaded', 'refund_issue', 'refund_requested', 'return_refund', 'refund_pending', 'shipping_delivery_ready')`,
        eq(systemAlerts.entityId, orderId)
      )
    );

  return c.json({ data });
});

ordersRouter.get("/:orderId/notes", requireAuth, requirePermission(PERMISSIONS.ORDER_NOTES_VIEW), async (c) => {
  const orderId = c.req.param("orderId");
  const data = await listOrderNotes(orderId);
  return c.json({ data });
});

ordersRouter.post(
  "/:orderId/notes",
  requireAuth,
  requireAnyPermission([
    PERMISSIONS.ORDER_NOTES_ADMIN_CREATE,
    PERMISSIONS.ORDER_NOTES_TAILOR_CREATE,
    PERMISSIONS.ORDER_NOTES_DELIVERY_CREATE,
    PERMISSIONS.ORDER_NOTES_MANAGE,
  ]),
  zValidator("json", noteSchema),
  async (c) => {
  const authUser = c.get("authUser");
  const orderId = c.req.param("orderId");
  const body = c.req.valid("json");
  const data = await createOrderNote({
    orderId,
    noteType: body.noteType,
    note: body.note,
    userEmail: authUser?.email,
  });
  return c.json({ data }, 201);
  },
);

ordersRouter.patch("/:orderId/notes/:noteId", requireAuth, requirePermission(PERMISSIONS.ORDER_NOTES_MANAGE), zValidator("json", notePatchSchema), async (c) => {
  const authUser = c.get("authUser");
  const orderId = c.req.param("orderId");
  const noteId = c.req.param("noteId");
  const body = c.req.valid("json");
  const data = await updateOrderNote({
    orderId,
    noteId,
    note: body.note,
    userEmail: authUser?.email,
  });
  return c.json({ data });
});

ordersRouter.delete("/:orderId/notes/:noteId", requireAuth, requirePermission(PERMISSIONS.ORDER_NOTES_MANAGE), async (c) => {
  const authUser = c.get("authUser");
  const orderId = c.req.param("orderId");
  const noteId = c.req.param("noteId");
  const data = await deleteOrderNote({
    orderId,
    noteId,
    userEmail: authUser?.email,
  });
  return c.json({ data });
});

ordersRouter.get("/:orderId", requireAuth, requireAnyPermission(ORDER_READ_PERMISSIONS), async (c) => {
  const orderId = c.req.param("orderId");
  const data = await getOrderDetailsForAdmin(orderId);
  return c.json({ data });
});

ordersRouter.patch(
  "/:orderId/admin-state",
  requireAuth,
  requireAnyPermission([
    PERMISSIONS.ORDERS_EDIT,
    PERMISSIONS.ORDERS_STATUS_UPDATE,
    PERMISSIONS.PAYMENTS_VERIFY,
    PERMISSIONS.SHIPPING_EDIT,
  ]),
  zValidator("json", adminUpdateSchema),
  async (c) => {
  const authUser = c.get("authUser");
  const orderId = c.req.param("orderId");
  const body = c.req.valid("json");

  if (authUser?.email) {
    const currentUser = await getUserByEmail(authUser.email);
    if (!currentUser) throw new HTTPException(403, { message: "Forbidden" });

    if (currentUser.role !== "admin") {
      const permissions = await getEffectivePermissionsForUser(currentUser.id);
      const allowed = (permission: string) => permissions.includes(permission);
      const changesOrderStatus = body.status !== undefined;
      const changesPaymentStatus = body.paymentStatus !== undefined;
      const changesDelivery =
        body.fulfillmentType !== undefined ||
        body.carrier !== undefined ||
        body.deliveryStatus !== undefined ||
        body.trackingNumber !== undefined ||
        body.deliveryNote !== undefined;

      if (
        changesOrderStatus &&
        !allowed(PERMISSIONS.ORDERS_EDIT) &&
        !allowed(PERMISSIONS.ORDERS_STATUS_UPDATE) &&
        !allowed(PERMISSIONS.SHIPPING_EDIT)
      ) {
        throw new HTTPException(403, { message: "Forbidden" });
      }
      if (
        changesPaymentStatus &&
        !allowed(PERMISSIONS.ORDERS_EDIT) &&
        !allowed(PERMISSIONS.PAYMENTS_VERIFY)
      ) {
        throw new HTTPException(403, { message: "Forbidden" });
      }
      if (
        changesDelivery &&
        !allowed(PERMISSIONS.ORDERS_EDIT) &&
        !allowed(PERMISSIONS.SHIPPING_EDIT)
      ) {
        throw new HTTPException(403, { message: "Forbidden" });
      }
    }
  }

  const data = await updateOrderAdminState({
    orderId,
    performedBy: authUser?.email,
    status: body.status,
    paymentStatus: body.paymentStatus,
    fulfillmentType: body.fulfillmentType,
    carrier: body.carrier,
    deliveryStatus: body.deliveryStatus,
    trackingNumber: body.trackingNumber ?? undefined,
    deliveryNote: body.deliveryNote,
  });
  return c.json({ data });
  },
);
