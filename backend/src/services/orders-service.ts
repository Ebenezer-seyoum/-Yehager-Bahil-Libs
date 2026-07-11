import { HTTPException } from "hono/http-exception";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { auditLogs, cartItems, eventParticipants, events, familyMembers, measurements, orderNotes, orders, products, systemAlerts, uploadedDesigns } from "../lib/db/schema.js";
import { PERMISSIONS } from "../lib/auth/permissions.js";
import { deleteCartItemsByIdsForUser, listCartItemsByIdsForUser } from "../repositories/cart-repository.js";
import {
  getOrderById,
  getOrderByIdForUser,
  listAllOrders,
  listOrdersByUserEmail,
  markEtbPaymentProof,
} from "../repositories/orders-repository.js";
import { getUserByEmail } from "../repositories/users-repository.js";
import { getUsdEtbRate } from "../repositories/exchange-rates-repository.js";
import {
  buildCheckoutLines,
  computeEmsShipping,
  computeEtbTotals,
  computeTotals,
  generateOrderNumber,
  moneyToNumber,
  numberToMoney,
} from "./checkout-utils.js";
import { sendAdminOrderCreatedEmail, sendAdminOrderStatusChangedEmail, sendAdminPaymentReceivedEmail, sendOrderStatusEmail } from "./email-service.js";
import { calculateCouponDiscount, markCouponRedeemed } from "./discounts-service.js";
import { awardCustomerCreditForPaidOrder } from "./customer-credits-service.js";
import { hasPermission } from "./permissions-service.js";

const ORDER_STATUS_VALUES = [
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
] as const;
const PAYMENT_STATUS_VALUES = ["pending", "paid", "failed", "refunded", "unpaid"] as const;
const NOTE_TYPE_VALUES = ["customer", "admin", "tailor", "delivery"] as const;
const NOTE_MIN_LENGTH = 3;
const NOTE_MAX_LENGTH = 1000;
const NOTE_AUTHOR_EDIT_WINDOW_MS = 15 * 60 * 1000;
const DELIVERY_STATUS_VALUES = [
  "not_started",
  "packing",
  "packed",
  "assigned_to_ems",
  "handed_to_ems",
  "in_transit",
  "at_hub",
  "out_for_delivery",
  "delivered",
  "failed_attempt",
  "returned",
  "moved_to_pickup_desk",
  "ready_for_pickup",
  "customer_notified",
  "waiting_customer",
  "picked_up",
  "cancelled_pickup",
] as const;
type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];
type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];
type DeliveryStatus = (typeof DELIVERY_STATUS_VALUES)[number];
type NoteType = (typeof NOTE_TYPE_VALUES)[number];

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUS_VALUES as readonly string[]).includes(value);
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUS_VALUES as readonly string[]).includes(value);
}

function isNoteType(value: string): value is NoteType {
  return (NOTE_TYPE_VALUES as readonly string[]).includes(value);
}

function isDeliveryStatus(value: string): value is DeliveryStatus {
  return (DELIVERY_STATUS_VALUES as readonly string[]).includes(value);
}

function isDeliveryReadyStatus(status?: string | null, deliveryStatus?: string | null) {
  const main = String(status ?? "").toLowerCase();
  const delivery = String(deliveryStatus ?? "not_started").toLowerCase();
  return ["fulfilled", "shipped", "ready_for_pickup", "delivered"].includes(main) || delivery !== "not_started";
}

export async function getOrdersForCurrentUser(userEmail?: string, limit = 50) {
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  return listOrdersByUserEmail(userEmail, limit);
}

export async function getOrderDetailsForCurrentUser(payload: { orderId: string; userEmail?: string }) {
  if (!payload.userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const order = await getOrderByIdForUser({ orderId: payload.orderId, userEmail: payload.userEmail });
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  return enrichOrderMeasurements(order);
}

export async function getOrdersForAdmin(limit = 100) {
  return listAllOrders(limit);
}

export async function getOrderDetailsForAdmin(orderId: string) {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  return enrichOrderMeasurements(order);
}

function measurementRecord(row: typeof measurements.$inferSelect) {
  return {
    gender: row.gender,
    chest: row.chest,
    waist: row.waist,
    hips: row.hips,
    shoulderWidth: row.shoulderWidth,
    armLength: row.armLength,
    torsoLength: row.torsoLength,
    inseam: row.inseam,
    neck: row.neck,
    ...(row.measurementDetails ?? {}),
  };
}

function imageList(...values: unknown[]) {
  const images: string[] = [];
  const visit = (value: unknown) => {
    if (!value) return;
    if (typeof value === "string") {
      if (value.trim()) images.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === "object") {
      const row = value as Record<string, unknown>;
      visit(row.url ?? row.imageUrl ?? row.image_url ?? row.src ?? row.path);
    }
  };
  values.forEach(visit);
  return [...new Set(images)];
}

async function enrichOrderMeasurements<T extends { items: Array<Record<string, unknown>>; eventId?: string | null }>(order: T) {
  const items = Array.isArray(order.items) ? order.items : [];
  const productIds = [
    ...new Set(
      items
        .map((item) => item.product_id ?? item.productId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const uploadedDesignIds = [
    ...new Set(
      items
        .map((item) => item.uploaded_design_id ?? item.uploadedDesignId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const groupIds = [
    ...new Set(
      items
        .map((item) => {
          const metadata = (item.item_metadata ?? item.itemMetadata ?? {}) as Record<string, unknown>;
          return metadata.group_id ?? metadata.groupId;
        })
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const measurementIds = [
    ...new Set(
      items
        .map((item) => item.measurement_id ?? item.measurementId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];
  const savedMeasurements = measurementIds.length
    ? await db.query.measurements.findMany({
        where: inArray(measurements.id, measurementIds),
      })
    : [];
  const productRows = productIds.length
    ? await db.query.products.findMany({
        where: inArray(products.id, productIds),
      })
    : [];
  const designRows = uploadedDesignIds.length
    ? await db.query.uploadedDesigns.findMany({
        where: inArray(uploadedDesigns.id, uploadedDesignIds),
      })
    : [];
  const measurementsById = new Map(savedMeasurements.map((row) => [row.id, measurementRecord(row)]));
  const productsById = new Map(productRows.map((row) => [row.id, row]));
  const designsById = new Map(designRows.map((row) => [row.id, row]));
  const enrichedItems = items.map((item) => {
    const measurementId = item.measurement_id ?? item.measurementId;
    const savedMeasurement = typeof measurementId === "string" ? measurementsById.get(measurementId) : undefined;
    const productId = item.product_id ?? item.productId;
    const uploadedDesignId = item.uploaded_design_id ?? item.uploadedDesignId;
    const product = typeof productId === "string" ? productsById.get(productId) : undefined;
    const design = typeof uploadedDesignId === "string" ? designsById.get(uploadedDesignId) : undefined;
    const metadata = (item.item_metadata ?? item.itemMetadata ?? {}) as Record<string, unknown>;
    const productImages = imageList(product?.images, item.product_images, item.productImages, metadata.product_images, metadata.productImages);
    const customDesignImages = imageList(
      design?.frontImageUrl,
      design?.sideImageUrl,
      design?.backImageUrl,
      design?.detailImageUrl,
      metadata.front_image_url,
      metadata.frontImageUrl,
      metadata.side_image_url,
      metadata.sideImageUrl,
      metadata.back_image_url,
      metadata.backImageUrl,
      metadata.detail_image_url,
      metadata.detailImageUrl,
      metadata.custom_design_images,
      metadata.customDesignImages,
    );
    return {
      ...item,
      productImage: item.productImage ?? item.product_image ?? productImages[0] ?? customDesignImages[0] ?? null,
      product_image: item.product_image ?? item.productImage ?? productImages[0] ?? customDesignImages[0] ?? null,
      productImages,
      product_images: productImages,
      customDesignImages,
      custom_design_images: customDesignImages,
      measurementSnapshot: item.measurementSnapshot ?? item.measurement_snapshot ?? savedMeasurement ?? null,
      measurement_snapshot: item.measurement_snapshot ?? item.measurementSnapshot ?? savedMeasurement ?? null,
    };
  });
  const memberFilters = [
    order.eventId ? eq(familyMembers.eventId, order.eventId) : undefined,
    groupIds.length ? inArray(familyMembers.familyGroupId, groupIds) : undefined,
  ].filter((filter): filter is NonNullable<typeof filter> => Boolean(filter));
  const members = memberFilters.length
    ? await db.query.familyMembers.findMany({
        where: memberFilters.length === 1 ? memberFilters[0] : or(...memberFilters),
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      })
    : [];

  return {
    ...order,
    items: enrichedItems,
    members: members.map((member) => ({
      id: member.id,
      familyGroupId: member.familyGroupId,
      eventId: member.eventId,
      name: member.name,
      relation: member.relation,
      age: member.age,
      gender: member.gender,
      productId: member.productId,
      productName: member.productName,
      productImage: member.productImage,
      measurements: member.measurements ?? {},
      measurementSnapshot: member.measurements ?? {},
      measurement_snapshot: member.measurements ?? {},
    })),
  };
}

function normalizeNoteText(note: string) {
  return note.trim().replace(/\s+\n/g, "\n");
}

function validateOrderNote(noteType: string, note: string): asserts noteType is NoteType {
  if (!isNoteType(noteType)) {
    throw new HTTPException(400, { message: `Invalid note type: ${noteType}` });
  }
  const length = normalizeNoteText(note).length;
  if (length < NOTE_MIN_LENGTH) {
    throw new HTTPException(400, { message: `Note must be at least ${NOTE_MIN_LENGTH} characters.` });
  }
  if (length > NOTE_MAX_LENGTH) {
    throw new HTTPException(400, { message: `Note cannot exceed ${NOTE_MAX_LENGTH} characters.` });
  }
}

async function currentStaffUser(userEmail?: string) {
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const user = await getUserByEmail(userEmail);
  if (!user) {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  return user;
}

async function canManageOrderNotes(userId: string, role?: string | null) {
  return role === "admin" || role === "manager" || hasPermission(userId, PERMISSIONS.ORDER_NOTES_MANAGE);
}

async function canCreateNoteType(userId: string, role: string | null | undefined, noteType: NoteType) {
  if (role === "admin" || role === "manager") return true;
  if (noteType === "customer") return false;
  if (noteType === "admin") return hasPermission(userId, PERMISSIONS.ORDER_NOTES_ADMIN_CREATE);
  if (noteType === "tailor") return hasPermission(userId, PERMISSIONS.ORDER_NOTES_TAILOR_CREATE);
  if (noteType === "delivery") return hasPermission(userId, PERMISSIONS.ORDER_NOTES_DELIVERY_CREATE);
  return false;
}

export async function listOrderNotes(orderId: string) {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  return db.query.orderNotes.findMany({
    where: and(eq(orderNotes.orderId, orderId), isNull(orderNotes.deletedAt)),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
}

export async function createOrderNote(payload: { orderId: string; noteType: string; note: string; userEmail?: string }) {
  validateOrderNote(payload.noteType, payload.note);
  const order = await getOrderById(payload.orderId);
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  const user = await currentStaffUser(payload.userEmail);
  if (!(await canCreateNoteType(user.id, user.role, payload.noteType))) {
    throw new HTTPException(403, { message: "You do not have permission to add this note type." });
  }
  const [note] = await db
    .insert(orderNotes)
    .values({
      orderId: payload.orderId,
      noteType: payload.noteType,
      note: normalizeNoteText(payload.note),
      createdByUserId: user.id,
      createdByName: user.name,
      createdByEmail: user.email,
      createdByRole: user.role,
    })
    .returning();
  return note;
}

export async function updateOrderNote(payload: { orderId: string; noteId: string; note: string; userEmail?: string }) {
  validateOrderNote("admin", payload.note);
  const current = await db.query.orderNotes.findFirst({
    where: and(eq(orderNotes.id, payload.noteId), eq(orderNotes.orderId, payload.orderId), isNull(orderNotes.deletedAt)),
  });
  if (!current) {
    throw new HTTPException(404, { message: "Note not found" });
  }
  const user = await currentStaffUser(payload.userEmail);
  const canManage = await canManageOrderNotes(user.id, user.role);
  const isAuthor = current.createdByUserId === user.id;
  const createdAt = current.createdAt instanceof Date ? current.createdAt : new Date(current.createdAt);
  const withinEditWindow = Date.now() - createdAt.getTime() <= NOTE_AUTHOR_EDIT_WINDOW_MS;
  if (!canManage && (!isAuthor || !withinEditWindow)) {
    throw new HTTPException(403, { message: "Edit time expired. Add a correction note if needed." });
  }
  const now = new Date();
  const [updated] = await db
    .update(orderNotes)
    .set({
      note: normalizeNoteText(payload.note),
      editedAt: now,
      updatedAt: now,
    })
    .where(eq(orderNotes.id, payload.noteId))
    .returning();
  return updated;
}

export async function deleteOrderNote(payload: { orderId: string; noteId: string; userEmail?: string }) {
  const current = await db.query.orderNotes.findFirst({
    where: and(eq(orderNotes.id, payload.noteId), eq(orderNotes.orderId, payload.orderId), isNull(orderNotes.deletedAt)),
  });
  if (!current) {
    throw new HTTPException(404, { message: "Note not found" });
  }
  const user = await currentStaffUser(payload.userEmail);
  if (!(await canManageOrderNotes(user.id, user.role))) {
    throw new HTTPException(403, { message: "Only admin or manager can delete notes." });
  }
  const [updated] = await db
    .update(orderNotes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(orderNotes.id, payload.noteId))
    .returning();
  return updated;
}

export async function updateOrderAdminState(payload: {
  orderId: string;
  performedBy?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentType?: "mail" | "pickup";
  carrier?: string;
  deliveryStatus?: string;
  trackingNumber?: string;
  deliveryNote?: string;
}) {
  const order = await getOrderById(payload.orderId);
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  if (
    !payload.status &&
    !payload.paymentStatus &&
    !payload.fulfillmentType &&
    !payload.carrier &&
    !payload.deliveryStatus &&
    payload.trackingNumber === undefined
  ) {
    throw new HTTPException(400, { message: "At least one field must be updated" });
  }
  if (payload.status && !isOrderStatus(payload.status)) {
    throw new HTTPException(400, { message: `Invalid order status: ${payload.status}` });
  }
  if (payload.paymentStatus && !isPaymentStatus(payload.paymentStatus)) {
    throw new HTTPException(400, { message: `Invalid payment status: ${payload.paymentStatus}` });
  }
  if (payload.deliveryStatus && !isDeliveryStatus(payload.deliveryStatus)) {
    throw new HTTPException(400, { message: `Invalid delivery status: ${payload.deliveryStatus}` });
  }

  const nextStatus = payload.status ?? order.status;
  const nextPayment = payload.paymentStatus ?? order.paymentStatus;
  if (
    ["fulfilled", "shipped", "delivered", "ready_for_pickup", "picked_up"].includes(nextStatus) &&
    nextPayment !== "paid"
  ) {
    throw new HTTPException(400, { message: "Order must be paid before moving into fulfillment-complete states" });
  }

  const statusChanged = Boolean(payload.deliveryStatus && payload.deliveryStatus !== order.deliveryStatus);
  const changedAt = statusChanged ? new Date() : undefined;
  const previousTimeline = Array.isArray(order.deliveryTimeline) ? order.deliveryTimeline : [];
  const deliveryTimeline = statusChanged
    ? [
        ...previousTimeline,
        {
          status: payload.deliveryStatus!,
          mainStatus: nextStatus,
          note: payload.deliveryNote,
          changedBy: payload.performedBy ?? "admin",
          changedAt: changedAt!.toISOString(),
          trackingNumber: payload.trackingNumber ?? order.trackingNumber ?? undefined,
        },
      ]
    : undefined;

  const [updated] = await db
    .update(orders)
    .set({
      status: payload.status ?? undefined,
      paymentStatus: payload.paymentStatus ?? undefined,
      fulfillmentType: payload.fulfillmentType ?? undefined,
      carrier: payload.carrier ?? undefined,
      deliveryStatus: payload.deliveryStatus ?? undefined,
      trackingNumber: payload.trackingNumber ?? undefined,
      deliveryStatusChangedBy: statusChanged ? payload.performedBy ?? "admin" : undefined,
      deliveryStatusChangedAt: changedAt,
      deliveryTimeline,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, payload.orderId))
    .returning();

  if (nextPayment === "paid" && order.paymentStatus !== "paid" && Array.isArray(order.items)) {
    await awardCustomerCreditForPaidOrder(updated, payload.performedBy ?? "admin");

    const uploadedDesignIds = order.items
      .map((item) =>
        typeof item === "object" && item
          ? (item as Record<string, unknown>).uploaded_design_id
          : undefined,
      )
      .filter((id): id is string => typeof id === "string");
    if (uploadedDesignIds.length) {
      await db
        .update(uploadedDesigns)
        .set({
          status: "completed_request",
          approvedOrderId: order.id,
          updatedAt: new Date(),
        })
        .where(inArray(uploadedDesigns.id, uploadedDesignIds));
    }
  }

  await db.insert(auditLogs).values({
    action: "order_admin_state_updated",
    category: "order",
    severity: "info",
    entityType: "order",
    entityId: payload.orderId,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin updated order state",
    metadata: {
      previous: {
        status: order.status,
        payment_status: order.paymentStatus,
        fulfillment_type: order.fulfillmentType,
        delivery_status: order.deliveryStatus,
        tracking_number: order.trackingNumber,
      },
      current: {
        status: updated.status,
        payment_status: updated.paymentStatus,
        fulfillment_type: updated.fulfillmentType,
        delivery_status: updated.deliveryStatus,
        tracking_number: updated.trackingNumber,
      },
    },
  });

  const orderChanged =
    (payload.status && payload.status !== order.status) ||
    (payload.paymentStatus && payload.paymentStatus !== order.paymentStatus) ||
    (payload.fulfillmentType && payload.fulfillmentType !== order.fulfillmentType) ||
    (payload.deliveryStatus && payload.deliveryStatus !== order.deliveryStatus);
  if (orderChanged) {
    const wasDeliveryReady = isDeliveryReadyStatus(order.status, order.deliveryStatus);
    const isDeliveryReady = isDeliveryReadyStatus(updated.status, updated.deliveryStatus);
    if (!wasDeliveryReady && isDeliveryReady) {
      const existingAlert = await db.query.systemAlerts.findFirst({
        where: and(eq(systemAlerts.type, "shipping_delivery_ready"), eq(systemAlerts.entityId, payload.orderId), eq(systemAlerts.isResolved, false)),
      });
      if (!existingAlert) {
        await db.insert(systemAlerts).values({
          title: `Order ready for delivery #${updated.orderNumber}`,
          message: `${updated.customerName} is ready for ${updated.fulfillmentType === "pickup" ? "office pickup" : "EMS delivery"}.`,
          type: "shipping_delivery_ready",
          severity: "info",
          entityId: updated.id,
        });
      }
    }

    await sendOrderStatusEmail({
      to: updated.userEmail,
      customerName: updated.customerName,
      orderNumber: updated.orderNumber,
      status: updated.status,
      deliveryStatus: updated.deliveryStatus,
      paymentStatus: updated.paymentStatus,
      fulfillmentType: updated.fulfillmentType,
      carrier: updated.carrier,
      trackingNumber: updated.trackingNumber,
    });
    await sendAdminOrderStatusChangedEmail({
      orderId: updated.id,
      orderNumber: updated.orderNumber,
      customerName: updated.customerName,
      customerEmail: updated.userEmail,
      previousStatus: order.status,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
      deliveryStatus: updated.deliveryStatus,
      carrier: updated.carrier,
      trackingNumber: updated.trackingNumber,
      changedBy: payload.performedBy ?? "admin",
    });
  }

  return updated;
}

export async function createCheckoutIntent(payload: {
  userEmail?: string;
  cartItemIds: string[];
  fulfillmentType?: "mail" | "pickup";
  paymentMethod?: "stripe_usd" | "etb_bank_transfer";
  paymentCurrency?: "USD" | "ETB";
  shippingAddress?: Record<string, unknown>;
  useEventOwnerAddress?: boolean;
  carrier?: string;
  pickupLocation?: string;
  pickupPersonName?: string;
  pickupPersonPhone?: string;
  remarks?: string;
  couponCode?: string;
}) {
  const userEmail = payload.userEmail;
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  if (!payload.cartItemIds.length) {
    throw new HTTPException(400, { message: "At least one cart item is required" });
  }

  const paymentMethod = payload.paymentMethod ?? "stripe_usd";
  const paymentCurrency = payload.paymentCurrency ?? "USD";

  if (paymentCurrency === "ETB" && paymentMethod !== "etb_bank_transfer") {
    throw new HTTPException(400, { message: "ETB orders must use etb_bank_transfer" });
  }
  if (paymentMethod === "etb_bank_transfer" && paymentCurrency !== "ETB") {
    throw new HTTPException(400, { message: "Bank transfer orders must use ETB currency" });
  }
  if (paymentMethod === "stripe_usd" && paymentCurrency !== "USD") {
    throw new HTTPException(400, { message: "Stripe checkout orders must use USD" });
  }

  const result = await db.transaction(async (tx) => {
    const cartRows = await listCartItemsByIdsForUser({
      itemIds: payload.cartItemIds,
      userEmail,
    });
    if (!cartRows.length) {
      throw new HTTPException(404, { message: "No matching cart items found" });
    }

    const eventIds = [...new Set(cartRows.map((row) => row.eventId).filter((id): id is string => Boolean(id)))];
    const primaryEventId = eventIds.length === 1 ? eventIds[0] : undefined;
    const primaryEvent = primaryEventId
      ? await tx.query.events.findFirst({
          where: eq(events.id, primaryEventId),
        })
      : undefined;

    const lineInputs = cartRows.map((row) => {
      return {
        cartItemId: row.id,
        productId: row.productId,
        productName: row.productName,
        quantity: row.quantity,
        trustedUnitPriceUsd: row.priceUsd,
        measurementId: row.measurementId,
        measurementSnapshot: row.measurementSnapshot,
        itemType: row.itemType,
        uploadedDesignId: row.uploadedDesignId,
        itemMetadata: row.itemMetadata,
      };
    });

    const lines = buildCheckoutLines(lineInputs);
    const isCustomOrder = lines.some((line) => line.itemType === "custom_design" || line.uploadedDesignId);
    const orderType = isCustomOrder ? "custom_order" : "catalog_order";
    const orderMode = lines.some((line) => line.itemType === "group_order") || primaryEventId ? "group" : "individual";
    const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0);
    const fulfillmentType = payload.fulfillmentType ?? "mail";
    const carrier = fulfillmentType === "pickup" ? "pickup" : payload.carrier ?? "Ethiopian Mail Service";
    const shippingCostUsd =
      fulfillmentType === "mail" && carrier === "Ethiopian Mail Service" ? computeEmsShipping(totalItems) : 0;
    const baseTotals = computeTotals(lines, shippingCostUsd);
    const couponResult = await calculateCouponDiscount({
      code: payload.couponCode,
      subtotalUsd: baseTotals.subtotalUsd,
      shippingCostUsd,
      orderType,
    });
    const discountAmountUsd = couponResult.discountAmountUsd;
    const totals = {
      ...baseTotals,
      discountAmountUsd,
      totalUsd: Math.max(baseTotals.totalUsd - discountAmountUsd, 0),
    };

    let totalEtb: string | undefined;
    let etbExchangeRate: string | undefined;
    if (paymentCurrency === "ETB") {
      const rateRow = await getUsdEtbRate(tx);
      if (!rateRow) {
        throw new HTTPException(503, { message: "USD→ETB exchange rate is not configured" });
      }
      const rateNum = moneyToNumber(rateRow.rate);
      const etb = computeEtbTotals(totals.totalUsd, rateNum);
      totalEtb = etb.totalEtb;
      etbExchangeRate = etb.etbExchangeRate;
    }

    const user = await getUserByEmail(userEmail);
    const customerName = user?.name ?? userEmail.split("@")[0];
    const orderNumber = generateOrderNumber();

    const shippingAddress =
      payload.useEventOwnerAddress && primaryEvent?.shippingAddress
        ? primaryEvent.shippingAddress
        : payload.shippingAddress;

    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        userId: user?.id,
        userEmail,
        customerName,
        items: lines.map((line) => ({
          cart_item_id: line.cartItemId,
          product_id: line.productId,
          product_name: line.productName,
          quantity: line.quantity,
          unit_price_usd: line.unitPriceUsd,
          line_total_usd: line.lineTotalUsd,
          measurement_id: line.measurementId,
          measurement_snapshot: line.measurementSnapshot,
          item_type: line.itemType ?? "product",
          uploaded_design_id: line.uploadedDesignId,
          item_metadata: line.itemMetadata,
          pricing_snapshot:
            line.itemMetadata && typeof line.itemMetadata === "object"
              ? (line.itemMetadata as Record<string, unknown>).pricing_snapshot
              : undefined,
        })),
        subtotalUsd: numberToMoney(baseTotals.subtotalUsd),
        discountAmountUsd: numberToMoney(discountAmountUsd),
        couponCode: couponResult.coupon?.code,
        couponId: couponResult.coupon?.id,
        totalUsd: numberToMoney(totals.totalUsd),
        shippingCostUsd: numberToMoney(totals.shippingCostUsd),
        orderType,
        orderMode,
        totalEtb,
        etbExchangeRate,
        status: "pending",
        paymentStatus: "pending",
        paymentMethod,
        paymentCurrency,
        fulfillmentType,
        carrier,
        pickupLocation: fulfillmentType === "pickup" ? payload.pickupLocation : undefined,
        pickupPersonName: fulfillmentType === "pickup" ? payload.pickupPersonName : undefined,
        pickupPersonPhone: fulfillmentType === "pickup" ? payload.pickupPersonPhone : undefined,
        shippingAddress,
        useEventOwnerAddress: Boolean(payload.useEventOwnerAddress),
        eventId: primaryEventId,
        eventName: primaryEvent?.name,
        remarks: payload.remarks,
      })
      .returning();

    const uploadedDesignIds = lines
      .map((line) => line.uploadedDesignId)
      .filter((id): id is string => Boolean(id));
    if (uploadedDesignIds.length) {
      await tx
        .update(uploadedDesigns)
        .set({
          approvedOrderId: order.id,
          updatedAt: new Date(),
        })
        .where(inArray(uploadedDesigns.id, uploadedDesignIds));
    }
    if (couponResult.coupon?.id) {
      await markCouponRedeemed(couponResult.coupon.id);
    }

    await tx
      .delete(cartItems)
      .where(and(inArray(cartItems.id, payload.cartItemIds), eq(cartItems.userEmail, userEmail)));

    await tx.insert(auditLogs).values({
      action: "checkout_intent_created",
      category: "order",
      severity: "info",
      entityType: "order",
      entityId: order.id,
      performedBy: userEmail,
      details: `Checkout intent created with ${lines.length} item(s)`,
      metadata: {
        order_number: order.orderNumber,
        order_type: orderType,
        order_mode: orderMode,
        cart_item_ids: payload.cartItemIds,
        total_usd: totals.totalUsd,
        subtotal_usd: baseTotals.subtotalUsd,
        discount_amount_usd: discountAmountUsd,
        coupon_code: couponResult.coupon?.code ?? null,
        total_etb: totalEtb,
        etb_exchange_rate: etbExchangeRate,
        payment_currency: paymentCurrency,
      },
    });

    return {
      order,
      totals,
      lines,
    };
  });
  await sendOrderStatusEmail({
    to: result.order.userEmail,
    customerName: result.order.customerName,
    orderNumber: result.order.orderNumber,
    status: result.order.status,
    paymentStatus: result.order.paymentStatus,
    fulfillmentType: result.order.fulfillmentType,
  });
  await sendAdminOrderCreatedEmail({
    orderId: result.order.id,
    orderNumber: result.order.orderNumber,
    customerName: result.order.customerName,
    customerEmail: result.order.userEmail,
    status: result.order.status,
    paymentStatus: result.order.paymentStatus,
    totalUsd: result.order.totalUsd,
    paymentMethod: result.order.paymentMethod,
  });
  return result;
}

export async function previewCheckoutCoupon(payload: {
  userEmail?: string;
  cartItemIds: string[];
  fulfillmentType?: "mail" | "pickup";
  carrier?: string;
  couponCode?: string;
}) {
  const userEmail = payload.userEmail;
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  if (!payload.cartItemIds.length) {
    throw new HTTPException(400, { message: "At least one cart item is required" });
  }

  const cartRows = await listCartItemsByIdsForUser({
    itemIds: payload.cartItemIds,
    userEmail,
  });
  if (!cartRows.length) {
    throw new HTTPException(404, { message: "No matching cart items found" });
  }

  const lines = buildCheckoutLines(
    cartRows.map((row) => ({
      cartItemId: row.id,
      productId: row.productId,
      productName: row.productName,
      quantity: row.quantity,
      trustedUnitPriceUsd: row.priceUsd,
      measurementId: row.measurementId,
      measurementSnapshot: row.measurementSnapshot,
      itemType: row.itemType,
      uploadedDesignId: row.uploadedDesignId,
      itemMetadata: row.itemMetadata,
    })),
  );

  const orderType = lines.some((line) => line.itemType === "custom_design" || line.uploadedDesignId)
    ? "custom_order"
    : "catalog_order";
  const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0);
  const fulfillmentType = payload.fulfillmentType ?? "mail";
  const carrier = fulfillmentType === "pickup" ? "pickup" : payload.carrier ?? "Ethiopian Mail Service";
  const shippingCostUsd =
    fulfillmentType === "mail" && carrier === "Ethiopian Mail Service" ? computeEmsShipping(totalItems) : 0;
  const baseTotals = computeTotals(lines, shippingCostUsd);
  const couponResult = await calculateCouponDiscount({
    code: payload.couponCode,
    subtotalUsd: baseTotals.subtotalUsd,
    shippingCostUsd,
    orderType,
  });
  const discountAmountUsd = couponResult.discountAmountUsd;

  return {
    code: couponResult.coupon?.code ?? null,
    discountAmountUsd: numberToMoney(discountAmountUsd),
    subtotalUsd: numberToMoney(baseTotals.subtotalUsd),
    shippingCostUsd: numberToMoney(baseTotals.shippingCostUsd),
    totalUsd: numberToMoney(Math.max(baseTotals.totalUsd - discountAmountUsd, 0)),
    freeShipping: couponResult.freeShipping,
  };
}

export async function submitEtbPaymentProof(payload: {
  orderId: string;
  userEmail?: string;
  paymentProofUrl: string;
}) {
  if (!payload.userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  const order = await getOrderByIdForUser({ orderId: payload.orderId, userEmail: payload.userEmail });
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  if (order.paymentMethod !== "etb_bank_transfer" || order.paymentCurrency !== "ETB") {
    throw new HTTPException(400, { message: "Order is not an ETB bank-transfer order" });
  }
  if (order.paymentStatus !== "pending") {
    throw new HTTPException(400, { message: "Payment proof can only be submitted for pending ETB orders" });
  }

  const updated = await markEtbPaymentProof({
    orderId: payload.orderId,
    userEmail: payload.userEmail,
    paymentProofUrl: payload.paymentProofUrl,
  });
  if (!updated) {
    throw new HTTPException(404, { message: "Order not found" });
  }

  const cartItemIds = Array.isArray(order.items)
    ? order.items
        .map((item) => (typeof item === "object" && item ? (item as Record<string, unknown>).cart_item_id : undefined))
        .filter((id): id is string => typeof id === "string")
    : [];
  await deleteCartItemsByIdsForUser({ ids: cartItemIds, userEmail: payload.userEmail });

  await db.insert(auditLogs).values({
    action: "etb_payment_proof_submitted",
    category: "payment",
    severity: "info",
    entityType: "order",
    entityId: updated.id,
    performedBy: payload.userEmail,
    details: `ETB payment proof submitted for order ${updated.orderNumber}`,
    metadata: {
      payment_proof_url: payload.paymentProofUrl,
    },
  });

  await db.insert(systemAlerts).values({
    title: `ETB payment proof submitted for #${updated.orderNumber}`,
    message: `Payment proof uploaded by ${updated.userEmail}; awaiting verification.`,
    type: "payment_review",
    severity: "info",
    entityId: updated.id,
  });

  await sendOrderStatusEmail({
    to: updated.userEmail,
    customerName: updated.customerName,
    orderNumber: updated.orderNumber,
    status: updated.status,
    paymentStatus: updated.paymentStatus,
    fulfillmentType: updated.fulfillmentType,
    showCancellationPolicy: true,
  });

  await sendAdminPaymentReceivedEmail({
    orderId: updated.id,
    orderNumber: updated.orderNumber,
    customerName: updated.customerName,
    customerEmail: updated.userEmail,
    status: updated.status,
    paymentStatus: updated.paymentStatus,
    totalUsd: updated.totalUsd,
    paymentMethod: updated.paymentMethod,
  });

  if (updated.eventId) {
    await db
      .update(eventParticipants)
      .set({
        orderId: updated.id,
        orderStatus: "ordered",
        paymentStatus: "awaiting_verification",
        updatedAt: new Date(),
      })
      .where(and(eq(eventParticipants.eventId, updated.eventId), eq(eventParticipants.participantEmail, updated.userEmail)));
  }

  return updated;
}

export async function deleteOrderForAdmin(payload: { orderId: string; performedBy?: string }) {
  const order = await getOrderById(payload.orderId);
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }

  // Clear approved_order_id on any uploaded designs referencing this order
  await db
    .update(uploadedDesigns)
    .set({ approvedOrderId: null, updatedAt: new Date() })
    .where(eq(uploadedDesigns.approvedOrderId, payload.orderId));

  // Clear order references in event participants
  await db
    .update(eventParticipants)
    .set({ orderId: null, updatedAt: new Date() })
    .where(eq(eventParticipants.orderId, payload.orderId));

  // Delete audit logs referencing this order
  await db.delete(auditLogs).where(
    and(eq(auditLogs.entityType, "order"), eq(auditLogs.entityId, payload.orderId)),
  );

  // Delete the order (order_notes cascade automatically via DB FK)
  const [deleted] = await db.delete(orders).where(eq(orders.id, payload.orderId)).returning();
  if (!deleted) {
    throw new HTTPException(404, { message: "Order not found" });
  }

  // Log the deletion
  await db.insert(auditLogs).values({
    action: "order_deleted",
    category: "admin",
    severity: "warning",
    entityType: "order",
    entityId: deleted.id,
    performedBy: payload.performedBy ?? "admin",
    details: `Admin deleted order ${deleted.orderNumber}`,
    metadata: { orderNumber: deleted.orderNumber, userEmail: deleted.userEmail, totalUsd: deleted.totalUsd },
  });

  return deleted;
}
