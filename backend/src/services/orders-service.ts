import { HTTPException } from "hono/http-exception";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { auditLogs, cartItems, customerCreditLedger, eventParticipants, events, familyMembers, measurements, orderLineItemEvents, orderLineItems, orderNotes, orders, orderWorkstreamEvents, orderWorkstreams, products, systemAlerts, uploadedDesigns } from "../lib/db/schema.js";
import { PERMISSIONS } from "../lib/auth/permissions.js";
import {
  allActiveLineItemsFulfilled,
  canTransitionWorkstreamStatus,
  canTransitionDeliveryStatus,
  classifyOrderLine,
  CUSTOMER_MAIN_STATUSES,
  deriveCustomerMainStatus,
  inferOrderType,
  initialWorkstreamStatus,
  isWorkstreamStatus,
  isDeliveryStatus as isWorkstreamDeliveryStatus,
  normalizeProductionStatus,
  PRODUCTION_STATUSES,
  rollUpLineItemStatus,
  rollUpOrderStatus,
  workstreamLabel,
  workstreamTrackingReference,
  workstreamTypesForLines,
  type ProductionStatus,
  type OrderWorkstreamType,
} from "../lib/orders/order-workstreams.js";
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
import { sendAdminOrderCreatedEmail, sendAdminOrderStatusChangedEmail, sendAdminPaymentReceivedEmail, sendOrderStatusEmail, sendOrderWorkstreamStatusEmail } from "./email-service.js";
import type { OrderEmailEvent } from "./email-service.js";
import { calculateCouponDiscount, markCouponRedeemed } from "./discounts-service.js";
import { awardCustomerCreditForPaidOrder, isOtherCreditLine, restoreCustomerCreditForOrder } from "./customer-credits-service.js";
import { hasPermission } from "./permissions-service.js";

const ORDER_STATUS_VALUES = CUSTOMER_MAIN_STATUSES;
const PAYMENT_STATUS_VALUES = ["pending", "awaiting_verification", "paid", "failed", "refunded", "unpaid"] as const;
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
  return enrichOrderWorkstreamItems(await enrichOrderMeasurements(order));
}

export async function getOrdersForAdmin(limit = 100, scope?: OrderWorkstreamType) {
  return listAllOrders(limit, scope);
}

export async function getOrderDetailsForAdmin(orderId: string, scope?: OrderWorkstreamType) {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  if (scope && !order.workstreams.some((workstream) => workstream.type === scope)) {
    throw new HTTPException(404, { message: `${workstreamLabel(scope)} order workstream not found` });
  }
  return enrichOrderWorkstreamItems(await enrichOrderMeasurements(order));
}

function enrichOrderWorkstreamItems<T extends { items?: unknown; workstreams?: unknown }>(order: T) {
  const items = Array.isArray(order.items)
    ? order.items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
  const workstreams = Array.isArray(order.workstreams)
    ? order.workstreams.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    : [];
  return {
    ...order,
    workstreams: workstreams.map((workstream) => {
      const type = workstream.type === "custom" ? "custom" : "catalog";
      const scopedLegacyItems = items.filter((item) => classifyOrderLine(item) === type);
      const normalizedItems = Array.isArray(workstream.items)
        ? workstream.items.filter(
            (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
          )
        : [];
      return {
        ...workstream,
        items: normalizedItems.length
          ? normalizedItems.map((line, scopedIndex) => {
              const sourceCartItemId = String(line.sourceCartItemId ?? line.source_cart_item_id ?? "");
              const position = Number(line.position ?? 0);
              const bySource = sourceCartItemId
                ? scopedLegacyItems.find((item) =>
                    String(item.cart_item_id ?? item.cartItemId ?? "") === sourceCartItemId,
                  )
                : undefined;
              const byPosition = position > 0 && classifyOrderLine(items[position - 1] ?? {}) === type
                ? items[position - 1]
                : undefined;
              const legacyItem = bySource ?? byPosition ?? scopedLegacyItems[scopedIndex] ?? {};
              return {
                ...legacyItem,
                ...line,
                id: line.id,
                orderId: line.orderId,
                workstreamId: line.workstreamId,
                sourceCartItemId: line.sourceCartItemId,
                position: line.position,
                status: line.status,
                version: line.version,
                lastStatusChangedAt: line.lastStatusChangedAt,
                lastStatusChangedBy: line.lastStatusChangedBy,
                assignedUserId: line.assignedUserId,
                dueAt: line.dueAt,
                measurementSnapshot:
                  line.measurementSnapshot ??
                  line.measurement_snapshot ??
                  legacyItem.measurementSnapshot ??
                  legacyItem.measurement_snapshot ??
                  null,
                measurement_snapshot:
                  line.measurement_snapshot ??
                  line.measurementSnapshot ??
                  legacyItem.measurement_snapshot ??
                  legacyItem.measurementSnapshot ??
                  null,
              };
            })
          : scopedLegacyItems,
      };
    }),
  };
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

function orderEmailEventForChange(
  previous: { status?: string | null; paymentStatus?: string | null; deliveryStatus?: string | null },
  next: { status?: string | null; paymentStatus?: string | null; deliveryStatus?: string | null },
  requested: { status?: string; paymentStatus?: string; deliveryStatus?: string },
): OrderEmailEvent {
  if (requested.paymentStatus && next.paymentStatus !== previous.paymentStatus) {
    if (next.paymentStatus === "awaiting_verification") return "payment_verification_pending";
    if (next.paymentStatus === "paid") return "payment_confirmed";
    if (next.paymentStatus === "failed") return "payment_failed";
    if (next.paymentStatus === "refunded") return "payment_refunded";
    return "payment_pending";
  }
  const status = String(next.status ?? "").toLowerCase();
  const delivery = String(next.deliveryStatus ?? "").toLowerCase();
  if (requested.status && next.status !== previous.status) {
    if (status === "ready_for_pickup") return "order_ready_for_pickup";
    if (status === "fulfilled") return "order_fulfilled";
    if (status === "delivered") return "order_delivered";
    if (status === "shipped") return "order_shipped";
    if (["processing", "tailoring", "quality_check"].includes(status)) return "order_in_production";
    if (status === "cancelled") return "order_cancelled";
  }
  if (requested.deliveryStatus && next.deliveryStatus !== previous.deliveryStatus) {
    if (["moved_to_pickup_desk", "ready_for_pickup", "customer_notified", "waiting_customer"].includes(delivery)) return "order_ready_for_pickup";
    if (["delivered", "picked_up"].includes(delivery)) return "order_delivered";
    if (delivery === "out_for_delivery") return "order_out_for_delivery";
    if (["assigned_to_ems", "handed_to_ems", "in_transit", "at_hub"].includes(delivery)) return "order_shipped";
    if (delivery === "cancelled_pickup" || delivery === "returned") return "order_cancelled";
  }
  return "order_status_updated";
}

function emailString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
}

function customerItemNumber(value: unknown, index: number) {
  const candidate = typeof value === "string" ? value.trim() : "";
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate);
  return candidate && !isUuid ? candidate : `#${String(index + 1).padStart(3, "0")}`;
}

async function orderDesignEmailDetails(
  order: Record<string, unknown> & { items?: unknown; eventId?: string | null },
  workstreamType?: OrderWorkstreamType,
) {
  const allItems = Array.isArray(order.items) ? order.items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
  const rawItems = workstreamType
    ? allItems.filter((item) => classifyOrderLine(item) === workstreamType)
    : allItems;
  const enrichedOrder = rawItems.length
    ? await enrichOrderMeasurements({ ...order, items: rawItems } as { items: Array<Record<string, unknown>>; eventId?: string | null })
    : order;
  const enrichedRecord = enrichedOrder as Record<string, unknown> & { items?: unknown; members?: unknown };
  const itemRows = Array.isArray(enrichedRecord.items) ? enrichedRecord.items as Array<Record<string, unknown>> : rawItems;
  const firstItem = itemRows[0] ?? {};
  const firstMetadata = firstItem.item_metadata ?? firstItem.itemMetadata;
  const metadata = firstMetadata && typeof firstMetadata === "object" ? firstMetadata as Record<string, unknown> : {};
  const imageUrls = itemRows.flatMap((item) => {
    const rawMetadata = item.item_metadata ?? item.itemMetadata;
    const itemMetadata = rawMetadata && typeof rawMetadata === "object" ? rawMetadata as Record<string, unknown> : {};
    return imageList(
      itemMetadata.front_image_url ?? itemMetadata.frontImageUrl,
      itemMetadata.side_image_url ?? itemMetadata.sideImageUrl,
      itemMetadata.back_image_url ?? itemMetadata.backImageUrl,
      itemMetadata.detail_image_url ?? itemMetadata.detailImageUrl,
      item.custom_design_images,
      item.customDesignImages,
    );
  }).filter((url, index, values) => values.indexOf(url) === index);
  const orderItems = itemRows.map((item, index) => {
    const rawMetadata = item.item_metadata ?? item.itemMetadata;
    const itemMetadata = rawMetadata && typeof rawMetadata === "object" ? rawMetadata as Record<string, unknown> : {};
    const itemImage = itemMetadata.image_url ?? itemMetadata.imageUrl ?? itemMetadata.product_image_url ?? itemMetadata.productImageUrl ?? item.productImage ?? item.product_image;
    const labeledCustomImages = [
      ["Front View", emailString(itemMetadata.front_image_url, itemMetadata.frontImageUrl)],
      ["Side View", emailString(itemMetadata.side_image_url, itemMetadata.sideImageUrl)],
      ["Back View", emailString(itemMetadata.back_image_url, itemMetadata.backImageUrl)],
      ["Detail / Close-Up", emailString(itemMetadata.detail_image_url, itemMetadata.detailImageUrl)],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));
    const customImages = imageList(
      labeledCustomImages.map(([, url]) => url),
      item.custom_design_images,
      item.customDesignImages,
    );
    const productImages = imageList(item.product_images, item.productImages, itemImage, item.image_url, item.product_image_url);
    const itemImages = customImages.length ? customImages : productImages;
    const measurementSnapshot = item.measurement_snapshot && typeof item.measurement_snapshot === "object"
      ? item.measurement_snapshot as Record<string, unknown>
      : item.measurementSnapshot && typeof item.measurementSnapshot === "object"
        ? item.measurementSnapshot as Record<string, unknown>
        : undefined;
    const rawQuantity = item.quantity ?? item.qty;
    const rawPrice = item.price_usd ?? item.priceUsd ?? item.line_total_usd ?? item.lineTotalUsd ?? item.unit_price_usd ?? item.unitPriceUsd ?? item.total_usd ?? item.totalUsd ?? item.unitPrice;
    const itemType = emailString(item.item_type, item.itemType, itemMetadata.type, order.orderType) ?? "standard_order";
    const memberName = emailString(itemMetadata.member_name, itemMetadata.memberName);
    return {
      name: emailString(itemMetadata.design_title, itemMetadata.designTitle, item.product_name, item.productName, item.name) ?? "Order item",
      itemNumber: customerItemNumber(itemMetadata.item_number ?? itemMetadata.sku ?? item.product_code ?? item.productCode ?? item.product_id ?? item.productId ?? item.id, index),
      quantity: typeof rawQuantity === "string" || typeof rawQuantity === "number" ? rawQuantity : 1,
      priceUsd: typeof rawPrice === "string" || typeof rawPrice === "number" ? rawPrice : null,
      imageUrl: typeof itemImage === "string" ? itemImage : typeof item.image_url === "string" ? item.image_url : typeof item.product_image_url === "string" ? item.product_image_url : undefined,
      imageUrls: itemImages,
      imageLabels: customImages.length ? itemImages.map((url, imageIndex) => labeledCustomImages.find(([, labeledUrl]) => labeledUrl === url)?.[0] ?? `View ${imageIndex + 1}`) : undefined,
      orderType: itemType,
      memberName,
      memberRole: emailString(itemMetadata.role_label, itemMetadata.member_gender, itemMetadata.memberGender),
      sizeOption: emailString(itemMetadata.size_option, itemMetadata.sizeOption),
      isGroupOrder: itemType === "group_order" || Boolean(memberName),
      measurements: measurementSnapshot,
      workstreamType: classifyOrderLine(item),
    };
  });
  const memberPricing = itemRows.flatMap((item) => {
    const rawMetadata = item.item_metadata ?? item.itemMetadata;
    const itemMetadata = rawMetadata && typeof rawMetadata === "object" ? rawMetadata as Record<string, unknown> : {};
    return Array.isArray(itemMetadata.member_pricing) ? itemMetadata.member_pricing as Array<Record<string, unknown>> : [];
  });
  const members = Array.isArray(enrichedRecord.members)
    ? enrichedRecord.members.filter((member): member is Record<string, unknown> => Boolean(member) && typeof member === "object")
    : [];
  const relevantMembers = memberPricing.length
    ? members.filter((member) => memberPricing.some((row) => row.member_id === member.id || String(row.member_name ?? "").toLowerCase() === String(member.name ?? "").toLowerCase()))
    : members;
  const groupMembers = relevantMembers.map((member) => {
    const pricing = memberPricing.find((row) => row.member_id === member.id || String(row.member_name ?? "").toLowerCase() === String(member.name ?? "").toLowerCase());
    const measurements = member.measurements && typeof member.measurements === "object" ? member.measurements as Record<string, unknown> : undefined;
    return {
      name: emailString(member.name),
      recipientType: emailString(member.relation, member.gender),
      priceUsd: pricing?.price_usd as string | number | null | undefined,
      measurements,
    };
  });
  const workstreamReferences = Array.isArray(order.workstreams)
    ? order.workstreams
        .filter((workstream): workstream is Record<string, unknown> => Boolean(workstream) && typeof workstream === "object")
        .map((workstream) => ({
          type: workstream.type === "custom" ? "custom" as const : "catalog" as const,
          trackingReference: emailString(workstream.trackingReference, workstream.tracking_reference) ?? "",
          status: emailString(workstream.status),
        }))
        .filter((workstream) => workstream.trackingReference)
    : [];
  return {
    designTitle: emailString(metadata.design_title, metadata.designTitle, firstItem.product_name, firstItem.productName),
    fabricType: emailString(metadata.fabric_type, metadata.fabricType),
    embroideryStyle: emailString(metadata.embroidery_style, metadata.embroideryStyle),
    colorPreference: emailString(metadata.color_preference, metadata.colorPreference),
    gender: typeof metadata.gender === "string" ? metadata.gender : undefined,
    measurementSnapshot: firstItem.measurement_snapshot && typeof firstItem.measurement_snapshot === "object"
      ? firstItem.measurement_snapshot as Record<string, unknown>
      : firstItem.measurementSnapshot && typeof firstItem.measurementSnapshot === "object"
        ? firstItem.measurementSnapshot as Record<string, unknown>
        : undefined,
    imageUrls,
    orderItems,
    groupMembers,
    workstreamReferences,
    totalUsd: typeof order.totalUsd === "string" || typeof order.totalUsd === "number" ? order.totalUsd : null,
    totalEtb: typeof order.totalEtb === "string" || typeof order.totalEtb === "number" ? order.totalEtb : null,
    orderDate: order.createdAt instanceof Date || typeof order.createdAt === "string" ? order.createdAt : null,
    orderType: emailString(order.orderType),
    paymentMethod: emailString(order.paymentMethod),
    paymentCurrency: emailString(order.paymentCurrency),
    paymentReference: emailString(order.stripePaymentIntentId, order.stripeChargeId, order.stripeSessionId),
    paymentDate: order.stripePaidAt instanceof Date || typeof order.stripePaidAt === "string"
      ? order.stripePaidAt
      : order.paymentProofUploadedAt instanceof Date || typeof order.paymentProofUploadedAt === "string"
        ? order.paymentProofUploadedAt
        : null,
    paymentFailureReason: emailString(order.stripeFailureReason),
    receiptUrl: emailString(order.stripeReceiptUrl),
    shippingAddress: typeof order.shippingAddress === "string" || (order.shippingAddress && typeof order.shippingAddress === "object")
      ? order.shippingAddress as string | Record<string, unknown>
      : undefined,
    pickupLocation: emailString(order.pickupLocation),
    memberPricing,
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
  const isMixedOrder = order.orderType === "mixed_order";
  if (
    isMixedOrder &&
    payload.status !== undefined &&
    payload.deliveryStatus === undefined
  ) {
    throw new HTTPException(409, {
      message: "Mixed-order customer status is derived from its individual line items",
    });
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
  if (
    payload.deliveryStatus &&
    !isWorkstreamDeliveryStatus(
      payload.deliveryStatus,
      (payload.fulfillmentType ?? order.fulfillmentType) === "pickup",
    )
  ) {
    throw new HTTPException(400, {
      message: `Invalid ${(payload.fulfillmentType ?? order.fulfillmentType) === "pickup" ? "pickup" : "mail"} delivery status: ${payload.deliveryStatus}`,
    });
  }

  const workstreamRows = Array.isArray(order.workstreams)
    ? order.workstreams.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    : [];
  const workstreamRollup = workstreamRows.length
    ? rollUpOrderStatus(workstreamRows.map((row) => ({
        type: row.type === "custom" ? "custom" : "catalog",
        status: String(row.status ?? initialWorkstreamStatus(row.type === "custom" ? "custom" : "catalog")),
      })))
    : undefined;
  const paidReadyStatus = payload.paymentStatus === "paid" && workstreamRollup === "fulfilled"
    ? "fulfilled"
    : undefined;
  const nextPayment = payload.paymentStatus ?? order.paymentStatus;
  const nextDeliveryStatus = payload.deliveryStatus ?? order.deliveryStatus;
  const currentProductionStatus: ProductionStatus = workstreamRollup
    ?? normalizeProductionStatus(order.status)
    ?? (["shipped", "ready_for_pickup", "delivered", "picked_up"].includes(String(order.status))
      ? "fulfilled"
      : "pending");
  const deliveryStatusIsChanging =
    payload.deliveryStatus !== undefined &&
    payload.deliveryStatus !== order.deliveryStatus;

  if (deliveryStatusIsChanging) {
    if (isMixedOrder) {
      const lineRows = await db.query.orderLineItems.findMany({
        where: eq(orderLineItems.orderId, order.id),
      });
      if (!allActiveLineItemsFulfilled(lineRows)) {
        throw new HTTPException(409, {
          message: "Every active catalog and custom item must be fulfilled before delivery or pickup can start",
        });
      }
    } else if (currentProductionStatus !== "fulfilled") {
      throw new HTTPException(409, {
        message: "The order must be fulfilled before delivery or pickup can start",
      });
    }
    if (payload.deliveryStatus !== "not_started" && nextPayment !== "paid") {
      throw new HTTPException(409, {
        message: "The mixed order must be paid before delivery or pickup can start",
      });
    }
  }

  const paymentSafeProduction =
    currentProductionStatus === "fulfilled" && nextPayment !== "paid"
      ? "processing"
      : currentProductionStatus;
  const derivedDeliveryMainStatus = deriveCustomerMainStatus({
    fulfillmentType: payload.fulfillmentType ?? order.fulfillmentType,
    productionStatus: paymentSafeProduction,
    deliveryStatus: nextDeliveryStatus,
  });
  const nextStatus = isMixedOrder
    ? derivedDeliveryMainStatus
    : payload.deliveryStatus !== undefined
      ? derivedDeliveryMainStatus
      : payload.status ?? paidReadyStatus ?? order.status;
  if (
    ["fulfilled", "shipped", "delivered", "ready_for_pickup"].includes(nextStatus) &&
    nextPayment !== "paid"
  ) {
    throw new HTTPException(400, { message: "Order must be paid before moving into fulfillment-complete states" });
  }
  if (
    payload.status &&
    ["fulfilled", "shipped", "delivered", "ready_for_pickup"].includes(payload.status) &&
    workstreamRows.length > 0 &&
    workstreamRollup !== "fulfilled"
  ) {
    throw new HTTPException(409, { message: "Every active catalog and custom item must be fulfilled before shared fulfillment can begin" });
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
      status: nextStatus !== order.status ? nextStatus : undefined,
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

  if (
    isMixedOrder &&
    payload.deliveryStatus !== undefined &&
    payload.deliveryStatus !== order.deliveryStatus
  ) {
    const activeWorkstreamIds = workstreamRows
      .filter((workstream) => normalizeProductionStatus(String(workstream.status ?? "")) !== "cancelled")
      .map((workstream) => String(workstream.id ?? ""))
      .filter(Boolean);
    if (activeWorkstreamIds.length) {
      await db
        .update(orderWorkstreams)
        .set({
          deliveryStatus: payload.deliveryStatus,
          deliveryCarrier: payload.carrier ?? order.carrier ?? undefined,
          deliveryTrackingNumber: payload.trackingNumber ?? order.trackingNumber ?? undefined,
          deliveryStatusChangedBy: payload.performedBy ?? "admin",
          deliveryStatusChangedAt: changedAt,
          updatedAt: new Date(),
        })
        .where(inArray(orderWorkstreams.id, activeWorkstreamIds));
    }
  }

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

  if ((nextPayment === "failed" || nextPayment === "refunded") && order.paymentStatus !== nextPayment) {
    await restoreCustomerCreditForOrder(updated, payload.performedBy ?? "admin");
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
    updated.status !== order.status ||
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
      ...(await orderDesignEmailDetails(updated)),
      event: orderEmailEventForChange(order, updated, payload),
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

export async function updateOrderWorkstream(payload: {
  orderId: string;
  type: OrderWorkstreamType;
  performedBy?: string;
  status?: string;
  deliveryStatus?: string;
  deliveryCarrier?: string | null;
  deliveryTrackingNumber?: string | null;
  deliveryNote?: string;
  deliveryDueAt?: string | null;
  assignedUserId?: string | null;
  dueAt?: string | null;
}) {
  if (payload.status === undefined && payload.deliveryStatus === undefined && payload.assignedUserId === undefined && payload.dueAt === undefined && payload.deliveryCarrier === undefined && payload.deliveryTrackingNumber === undefined && payload.deliveryDueAt === undefined) {
    throw new HTTPException(400, { message: "At least one workstream field must be updated" });
  }

  if (payload.status && !isWorkstreamStatus(payload.type, payload.status)) {
    throw new HTTPException(400, { message: `Invalid ${payload.type} workstream status: ${payload.status}` });
  }
  if (payload.deliveryStatus && !isWorkstreamDeliveryStatus(payload.deliveryStatus, false) && !isWorkstreamDeliveryStatus(payload.deliveryStatus, true)) {
    throw new HTTPException(400, { message: `Invalid delivery status: ${payload.deliveryStatus}` });
  }

  const dueAt = payload.dueAt === undefined
    ? undefined
    : payload.dueAt === null
      ? null
      : new Date(payload.dueAt);
  if (dueAt instanceof Date && Number.isNaN(dueAt.getTime())) {
    throw new HTTPException(400, { message: "Invalid workstream due date" });
  }

  const transition = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, payload.orderId))
      .for("update");
    if (!order) {
      throw new HTTPException(404, { message: "Order not found" });
    }
    if (order.orderType === "mixed_order" && payload.status !== undefined) {
      throw new HTTPException(409, {
        message: "Update mixed-order production through an individual line item",
      });
    }
    if (order.orderType === "mixed_order" && payload.deliveryStatus !== undefined) {
      throw new HTTPException(409, {
        message: "Update mixed-order delivery through the parent admin-state endpoint",
      });
    }

    const [workstream] = await tx
      .select()
      .from(orderWorkstreams)
      .where(and(eq(orderWorkstreams.orderId, payload.orderId), eq(orderWorkstreams.type, payload.type)))
      .for("update");
    if (!workstream) {
      throw new HTTPException(404, { message: `${workstreamLabel(payload.type)} order workstream not found` });
    }

    const nextStatus = payload.status ?? workstream.status;
    const statusChanged = nextStatus !== workstream.status;
    if (statusChanged && !canTransitionWorkstreamStatus(payload.type, workstream.status, nextStatus)) {
      throw new HTTPException(409, {
        message: `Cannot move ${workstreamLabel(payload.type).toLowerCase()} work from ${workstream.status.replaceAll("_", " ")} directly to ${nextStatus.replaceAll("_", " ")}`,
      });
    }

    const fulfillmentType = String(order.fulfillmentType ?? "mail").toLowerCase();
    const deliveryStatusChanged = payload.deliveryStatus !== undefined && payload.deliveryStatus !== workstream.deliveryStatus;
    if (deliveryStatusChanged) {
      if (normalizeProductionStatus(workstream.status) !== "fulfilled") {
        throw new HTTPException(409, { message: "Delivery can start only after this workstream is fulfilled" });
      }
      if (order.paymentStatus !== "paid") {
        throw new HTTPException(409, { message: "The order must be paid before delivery can start" });
      }
      if (!canTransitionDeliveryStatus(fulfillmentType, workstream.deliveryStatus, payload.deliveryStatus!)) {
        throw new HTTPException(409, {
          message: `Cannot move delivery from ${String(workstream.deliveryStatus).replaceAll("_", " ")} to ${payload.deliveryStatus!.replaceAll("_", " ")}`,
        });
      }
    }

    const now = new Date();
    const nextVersion = statusChanged || deliveryStatusChanged ? workstream.version + 1 : workstream.version;
    const deliveryTimeline = deliveryStatusChanged
      ? [
          ...(Array.isArray(workstream.deliveryTimeline) ? workstream.deliveryTimeline : []),
          {
            status: payload.deliveryStatus!,
            note: payload.deliveryNote,
            changedBy: payload.performedBy ?? "admin",
            changedAt: now.toISOString(),
            trackingNumber: payload.deliveryTrackingNumber ?? workstream.deliveryTrackingNumber ?? undefined,
          },
        ]
      : undefined;
    const [updatedWorkstream] = await tx
      .update(orderWorkstreams)
      .set({
        status: statusChanged ? nextStatus : undefined,
        deliveryStatus: deliveryStatusChanged ? payload.deliveryStatus : undefined,
        deliveryCarrier: payload.deliveryCarrier === undefined ? undefined : payload.deliveryCarrier,
        deliveryTrackingNumber: payload.deliveryTrackingNumber === undefined ? undefined : payload.deliveryTrackingNumber,
        deliveryStatusChangedBy: deliveryStatusChanged ? payload.performedBy ?? "admin" : undefined,
        deliveryStatusChangedAt: deliveryStatusChanged ? now : undefined,
        deliveryTimeline,
        deliveryDueAt: payload.deliveryDueAt === undefined
          ? undefined
          : payload.deliveryDueAt === null
            ? null
            : new Date(payload.deliveryDueAt),
        assignedUserId: payload.assignedUserId,
        dueAt,
        startedAt: statusChanged && !workstream.startedAt ? now : undefined,
        completedAt: statusChanged && ["fulfilled", "cancelled"].includes(nextStatus)
          ? now
          : statusChanged
            ? null
            : undefined,
        lastStatusChangedAt: statusChanged ? now : undefined,
        lastStatusChangedBy: statusChanged ? payload.performedBy ?? "admin" : undefined,
        version: statusChanged || deliveryStatusChanged ? nextVersion : undefined,
        updatedAt: now,
      })
      .where(eq(orderWorkstreams.id, workstream.id))
      .returning();

    if (statusChanged) {
      await tx
        .update(orderLineItems)
        .set({ status: nextStatus, updatedAt: now })
        .where(eq(orderLineItems.workstreamId, workstream.id));
    }

    const currentWorkstreams = await tx.query.orderWorkstreams.findMany({
      where: eq(orderWorkstreams.orderId, payload.orderId),
    });
    const rolledStatus = rollUpOrderStatus(currentWorkstreams.map((row) => ({
      type: row.type as OrderWorkstreamType,
      status: row.status,
    })));
    const paymentSafeRolledStatus = rolledStatus === "fulfilled" && order.paymentStatus !== "paid"
      ? "processing"
      : rolledStatus;
    const activeAfterUpdate = currentWorkstreams.filter((row) => row.status !== "cancelled");
    const allDelivered = activeAfterUpdate.length > 0 && activeAfterUpdate.every((row) => ["delivered", "picked_up"].includes(String(row.deliveryStatus)));
    const anyShipped = activeAfterUpdate.some((row) => ["assigned_to_ems", "handed_to_ems", "in_transit", "at_hub", "out_for_delivery"].includes(String(row.deliveryStatus)));
    const anyReadyForPickup = activeAfterUpdate.some((row) => ["ready_for_pickup", "customer_notified", "waiting_customer"].includes(String(row.deliveryStatus)));
    const nextOrderStatus = allDelivered
      ? "delivered"
      : anyReadyForPickup ? "ready_for_pickup"
        : anyShipped ? "shipped"
          : paymentSafeRolledStatus;

    if ((statusChanged || deliveryStatusChanged) && nextOrderStatus !== order.status) {
      await tx
        .update(orders)
        .set({ status: nextOrderStatus, updatedAt: now })
        .where(eq(orders.id, payload.orderId));
    }

    if ((statusChanged || deliveryStatusChanged) && nextOrderStatus === "fulfilled" && order.status !== "fulfilled") {
      const existingDeliveryAlert = await tx.query.systemAlerts.findFirst({
        where: and(
          eq(systemAlerts.type, "shipping_delivery_ready"),
          eq(systemAlerts.entityId, payload.orderId),
          eq(systemAlerts.isResolved, false),
        ),
      });
      if (!existingDeliveryAlert) {
        await tx.insert(systemAlerts).values({
          title: `Order ready for delivery #${order.orderNumber}`,
          message: `${order.customerName}'s active order work is ready for shared fulfillment.`,
          type: "shipping_delivery_ready",
          severity: "info",
          entityId: order.id,
        });
      }
    }

    let workstreamEvent: typeof orderWorkstreamEvents.$inferSelect | undefined;
    if (statusChanged || deliveryStatusChanged) {
      const eventKey = `${workstream.id}:${deliveryStatusChanged ? "delivery" : "status"}:${nextVersion}:${deliveryStatusChanged ? payload.deliveryStatus : nextStatus}`;
      [workstreamEvent] = await tx
        .insert(orderWorkstreamEvents)
        .values({
          orderId: payload.orderId,
          workstreamId: workstream.id,
          fromStatus: deliveryStatusChanged ? workstream.deliveryStatus : workstream.status,
          toStatus: deliveryStatusChanged ? payload.deliveryStatus! : nextStatus,
          version: nextVersion,
          eventKey,
          changedBy: payload.performedBy ?? "admin",
          metadata: {
            workstream_type: payload.type,
            tracking_reference: workstream.trackingReference,
            previous_order_status: order.status,
            rolled_order_status: nextOrderStatus,
            status_kind: deliveryStatusChanged ? "delivery" : "production",
          },
        })
        .returning();
    }

    await tx.insert(auditLogs).values({
      action: statusChanged ? "order_workstream_status_updated" : deliveryStatusChanged ? "order_workstream_delivery_updated" : "order_workstream_assignment_updated",
      category: "order",
      severity: "info",
      entityType: "order_workstream",
      entityId: workstream.id,
      performedBy: payload.performedBy ?? "admin",
      details: `${workstreamLabel(payload.type)} workstream updated for order ${order.orderNumber}`,
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber,
        tracking_reference: workstream.trackingReference,
        previous_status: workstream.status,
        current_status: nextStatus,
        previous_delivery_status: workstream.deliveryStatus,
        current_delivery_status: deliveryStatusChanged ? payload.deliveryStatus : workstream.deliveryStatus,
        previous_order_status: order.status,
        current_order_status: nextOrderStatus,
        assigned_user_id: payload.assignedUserId,
        due_at: dueAt?.toISOString?.() ?? dueAt,
      },
    });

    return {
      order,
      previousWorkstream: workstream,
      workstream: updatedWorkstream,
      workstreams: currentWorkstreams,
      event: workstreamEvent,
      orderStatus: nextOrderStatus,
      changedAt: now,
      statusChanged,
      deliveryStatusChanged,
    };
  });

  const detailedOrder = await getOrderDetailsForAdmin(payload.orderId);
  if ((transition.statusChanged || transition.deliveryStatusChanged) && transition.event) {
    const otherWorkstream = transition.workstreams.find((row) => row.id !== transition.workstream.id);
    const emailResult = await sendOrderWorkstreamStatusEmail({
      ...(await orderDesignEmailDetails(detailedOrder, payload.type)),
      to: detailedOrder.userEmail,
      customerName: detailedOrder.customerName,
      orderNumber: detailedOrder.orderNumber,
      orderDate: detailedOrder.createdAt,
      status: detailedOrder.status,
      paymentStatus: detailedOrder.paymentStatus,
      totalUsd: detailedOrder.totalUsd,
      workstreamType: payload.type,
      trackingReference: transition.workstream.trackingReference,
      previousWorkstreamStatus: transition.deliveryStatusChanged ? transition.previousWorkstream.deliveryStatus : transition.previousWorkstream.status,
      workstreamStatus: transition.deliveryStatusChanged ? transition.workstream.deliveryStatus : transition.workstream.status,
      otherWorkstreamStatus: otherWorkstream
        ? `${workstreamLabel(otherWorkstream.type as OrderWorkstreamType)}: ${otherWorkstream.status}`
        : null,
      overallStatus: transition.orderStatus,
      workstreamDueAt: transition.workstream.dueAt,
      changedAt: transition.changedAt,
    });

    await db
      .update(orderWorkstreamEvents)
      .set({
        customerEmailStatus: emailResult.sent ? "sent" : emailResult.skipped ? "skipped" : "failed",
        customerEmailSentAt: emailResult.sent ? new Date() : null,
        customerEmailAttempts: 1,
        customerEmailLastError: emailResult.sent ? null : emailResult.reason ?? "unknown_email_error",
        updatedAt: new Date(),
      })
      .where(eq(orderWorkstreamEvents.id, transition.event.id));

    await sendAdminOrderStatusChangedEmail({
      orderId: detailedOrder.id,
      orderNumber: transition.workstream.trackingReference,
      customerName: detailedOrder.customerName,
      customerEmail: detailedOrder.userEmail,
      previousStatus: transition.previousWorkstream.status,
      status: transition.workstream.status,
      paymentStatus: detailedOrder.paymentStatus,
      changedBy: payload.performedBy ?? "admin",
    });
  }

  return transition.statusChanged
    ? getOrderDetailsForAdmin(payload.orderId)
    : detailedOrder;
}

export async function updateMixedOrderLineItemStatus(payload: {
  orderId: string;
  type: OrderWorkstreamType;
  lineItemId: string;
  status: ProductionStatus;
  expectedVersion?: number;
  note?: string;
  performedBy?: string;
}) {
  if (!(PRODUCTION_STATUSES as readonly string[]).includes(payload.status)) {
    throw new HTTPException(400, { message: `Invalid production status: ${payload.status}` });
  }

  await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, payload.orderId))
      .for("update");
    if (!order) {
      throw new HTTPException(404, { message: "Order not found" });
    }
    if (order.orderType !== "mixed_order") {
      throw new HTTPException(409, {
        message: "Individual line-item status control is available only for mixed orders",
      });
    }

    const [workstream] = await tx
      .select()
      .from(orderWorkstreams)
      .where(and(
        eq(orderWorkstreams.orderId, payload.orderId),
        eq(orderWorkstreams.type, payload.type),
      ))
      .for("update");
    if (!workstream) {
      throw new HTTPException(404, {
        message: `${workstreamLabel(payload.type)} order workstream not found`,
      });
    }

    const [lineItem] = await tx
      .select()
      .from(orderLineItems)
      .where(and(
        eq(orderLineItems.id, payload.lineItemId),
        eq(orderLineItems.orderId, payload.orderId),
        eq(orderLineItems.workstreamId, workstream.id),
      ))
      .for("update");
    if (!lineItem) {
      throw new HTTPException(404, { message: "Order line item not found in this workstream" });
    }
    if (
      payload.expectedVersion !== undefined &&
      payload.expectedVersion !== lineItem.version
    ) {
      throw new HTTPException(409, {
        message: "This item was updated by someone else. Refresh and try again.",
      });
    }

    const currentStatus = normalizeProductionStatus(lineItem.status);
    if (!currentStatus) {
      throw new HTTPException(409, {
        message: `The line item has an unsupported legacy status: ${lineItem.status}`,
      });
    }
    if (
      currentStatus !== payload.status &&
      (currentStatus === "fulfilled" || currentStatus === "cancelled")
    ) {
      throw new HTTPException(409, {
        message: `${currentStatus.replaceAll("_", " ")} is terminal for an individual mixed-order item`,
      });
    }
    if (currentStatus === payload.status && lineItem.status === payload.status) return;

    const now = new Date();
    const nextLineVersion = lineItem.version + 1;
    await tx
      .update(orderLineItems)
      .set({
        status: payload.status,
        lastStatusChangedAt: now,
        lastStatusChangedBy: payload.performedBy ?? "admin",
        version: nextLineVersion,
        updatedAt: now,
      })
      .where(eq(orderLineItems.id, lineItem.id));

    await tx.insert(orderLineItemEvents).values({
      orderId: order.id,
      workstreamId: workstream.id,
      lineItemId: lineItem.id,
      fromStatus: currentStatus,
      toStatus: payload.status,
      version: nextLineVersion,
      eventKey: `${lineItem.id}:status:${nextLineVersion}:${payload.status}`,
      changedBy: payload.performedBy ?? "admin",
      note: payload.note,
      metadata: {
        workstream_type: payload.type,
        tracking_reference: workstream.trackingReference,
        status_kind: "production",
      },
    });

    const workstreamLineItems = await tx.query.orderLineItems.findMany({
      where: eq(orderLineItems.workstreamId, workstream.id),
    });
    const rolledWorkstreamStatus = rollUpLineItemStatus(workstreamLineItems);
    let workstreamVersion = workstream.version;
    if (rolledWorkstreamStatus !== normalizeProductionStatus(workstream.status)) {
      workstreamVersion += 1;
      await tx
        .update(orderWorkstreams)
        .set({
          status: rolledWorkstreamStatus,
          startedAt: workstream.startedAt ?? now,
          completedAt: ["fulfilled", "cancelled"].includes(rolledWorkstreamStatus) ? now : null,
          lastStatusChangedAt: now,
          lastStatusChangedBy: payload.performedBy ?? "admin",
          version: workstreamVersion,
          updatedAt: now,
        })
        .where(eq(orderWorkstreams.id, workstream.id));

      await tx.insert(orderWorkstreamEvents).values({
        orderId: order.id,
        workstreamId: workstream.id,
        fromStatus: normalizeProductionStatus(workstream.status) ?? workstream.status,
        toStatus: rolledWorkstreamStatus,
        version: workstreamVersion,
        eventKey: `${workstream.id}:line-rollup:${workstreamVersion}:${rolledWorkstreamStatus}`,
        changedBy: payload.performedBy ?? "admin",
        customerEmailStatus: "skipped",
        metadata: {
          workstream_type: payload.type,
          tracking_reference: workstream.trackingReference,
          status_kind: "production",
          source: "line_item_rollup",
          line_item_id: lineItem.id,
        },
      });
    }

    const currentWorkstreams = await tx.query.orderWorkstreams.findMany({
      where: eq(orderWorkstreams.orderId, order.id),
    });
    const workstreamsForRollup = currentWorkstreams.map((row) =>
      row.id === workstream.id
        ? { ...row, status: rolledWorkstreamStatus }
        : row,
    );
    const productionStatus = rollUpOrderStatus(workstreamsForRollup.map((row) => ({
      type: row.type as OrderWorkstreamType,
      status: row.status,
    })));
    const paymentSafeProduction =
      productionStatus === "fulfilled" && order.paymentStatus !== "paid"
        ? "processing"
        : productionStatus;
    const nextOrderStatus = deriveCustomerMainStatus({
      fulfillmentType: order.fulfillmentType,
      productionStatus: paymentSafeProduction,
      deliveryStatus: order.deliveryStatus,
    });
    if (nextOrderStatus !== order.status) {
      await tx
        .update(orders)
        .set({ status: nextOrderStatus, updatedAt: now })
        .where(eq(orders.id, order.id));
    }

    await tx.insert(auditLogs).values({
      action: "mixed_order_line_status_updated",
      category: "order",
      severity: "info",
      entityType: "order_line_item",
      entityId: lineItem.id,
      performedBy: payload.performedBy ?? "admin",
      details: `${workstreamLabel(payload.type)} item status updated for order ${order.orderNumber}`,
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber,
        workstream_id: workstream.id,
        workstream_type: payload.type,
        tracking_reference: workstream.trackingReference,
        previous_line_status: currentStatus,
        current_line_status: payload.status,
        previous_workstream_status: workstream.status,
        current_workstream_status: rolledWorkstreamStatus,
        previous_order_status: order.status,
        current_order_status: nextOrderStatus,
        line_version: nextLineVersion,
        note: payload.note,
      },
    });
  });

  return getOrderDetailsForAdmin(payload.orderId);
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
  useCustomerCredit?: boolean;
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

    const productIds = cartRows.map((row) => row.productId).filter((id): id is string => Boolean(id));
    const productRows = productIds.length ? await tx.query.products.findMany({ where: inArray(products.id, productIds) }) : [];
    const productById = new Map(productRows.map((product) => [product.id, product]));
    const lineInputs = cartRows.map((row) => {
      const product = row.productId ? productById.get(row.productId) : undefined;
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
        itemMetadata: {
          ...(row.itemMetadata ?? {}),
          category: product?.category ?? (row.itemMetadata as Record<string, unknown> | null | undefined)?.category,
          subcategory: product?.subcategory ?? (row.itemMetadata as Record<string, unknown> | null | undefined)?.subcategory,
          region: product?.region ?? (row.itemMetadata as Record<string, unknown> | null | undefined)?.region,
        },
      };
    });

    const lines = buildCheckoutLines(lineInputs);
    const orderType = inferOrderType(lines);
    const workstreamTypes = workstreamTypesForLines(lines);
    const catalogSubtotalUsd = lines
      .filter((line) => classifyOrderLine(line) === "catalog")
      .reduce((sum, line) => sum + line.lineTotalUsd, 0);
    const customSubtotalUsd = lines
      .filter((line) => classifyOrderLine(line) === "custom")
      .reduce((sum, line) => sum + line.lineTotalUsd, 0);
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
      catalogSubtotalUsd,
      customSubtotalUsd,
    });
    const discountAmountUsd = couponResult.discountAmountUsd;
    const otherSubtotalUsd = lines.filter(isOtherCreditLine).reduce((sum, line) => sum + line.lineTotalUsd, 0);
    let creditUsedUsd = 0;
    if (payload.useCustomerCredit) {
      if (otherSubtotalUsd <= 0) throw new HTTPException(400, { message: "Company credit can only be used for Other-section products such as jewelry and rings" });
      const [balanceRow] = await tx.select({ balance: sql<string>`coalesce(sum(${customerCreditLedger.amountUsd}), 0)` }).from(customerCreditLedger).where(eq(customerCreditLedger.userEmail, userEmail));
      creditUsedUsd = Math.min(moneyToNumber(balanceRow?.balance), otherSubtotalUsd, Math.max(baseTotals.totalUsd - discountAmountUsd, 0));
    }
    const totals = {
      ...baseTotals,
      discountAmountUsd,
      totalUsd: Math.max(baseTotals.totalUsd - discountAmountUsd - creditUsedUsd, 0),
    };

    let totalEtb: string | undefined;
    let etbExchangeRate: string | undefined;
    if (paymentCurrency === "ETB") {
      const rateRow = await getUsdEtbRate(tx);
      if (rateRow) {
        const rateNum = moneyToNumber(rateRow.rate);
        const etb = computeEtbTotals(totals.totalUsd, rateNum);
        totalEtb = etb.totalEtb;
        etbExchangeRate = etb.etbExchangeRate;
      }
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
          role_label:
            line.itemMetadata && typeof line.itemMetadata === "object"
              ? (line.itemMetadata as Record<string, unknown>).role_label
              : undefined,
          customer_type:
            line.itemMetadata && typeof line.itemMetadata === "object"
              ? (line.itemMetadata as Record<string, unknown>).customer_type
              : undefined,
          outfit_option:
            line.itemMetadata && typeof line.itemMetadata === "object"
              ? (line.itemMetadata as Record<string, unknown>).outfit_option
              : undefined,
          gender:
            line.itemMetadata && typeof line.itemMetadata === "object"
              ? (line.itemMetadata as Record<string, unknown>).gender ?? (line.itemMetadata as Record<string, unknown>).role_gender
              : undefined,
          child_age:
            line.itemMetadata && typeof line.itemMetadata === "object"
              ? (line.itemMetadata as Record<string, unknown>).child_age
              : undefined,
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
        creditUsedUsd: numberToMoney(creditUsedUsd),
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

    if (creditUsedUsd > 0) {
      const [balanceRow] = await tx.select({ balance: sql<string>`coalesce(sum(${customerCreditLedger.amountUsd}), 0)` }).from(customerCreditLedger).where(eq(customerCreditLedger.userEmail, userEmail));
      const balance = moneyToNumber(balanceRow?.balance);
      if (creditUsedUsd > balance) throw new HTTPException(409, { message: "Customer credit balance changed. Please try checkout again." });
      await tx.insert(customerCreditLedger).values({
        userId: user?.id ?? null,
        userEmail,
        customerName,
        orderId: order.id,
        orderNumber,
        amountUsd: numberToMoney(-creditUsedUsd),
        balanceAfterUsd: numberToMoney(balance - creditUsedUsd),
        type: "credit_used",
        reason: `Company credit used for Other-section order #${orderNumber}`,
        createdBy: "checkout",
        metadata: { eligible_section: "Other", credit_reserved: true },
      });
    }

    const workstreamRows = await tx
      .insert(orderWorkstreams)
      .values(workstreamTypes.map((type) => ({
        orderId: order.id,
        type,
        trackingReference: workstreamTrackingReference(order.orderNumber, type),
        status: initialWorkstreamStatus(type),
        lastStatusChangedBy: "checkout",
      })))
      .returning();
    const workstreamByType = new Map(workstreamRows.map((row) => [row.type, row]));

    const lineItemRows = await tx
      .insert(orderLineItems)
      .values(lines.map((line, index) => {
        const type = classifyOrderLine(line);
        const workstream = workstreamByType.get(type);
        if (!workstream) {
          throw new HTTPException(500, { message: `Could not create ${type} order workstream` });
        }
        return {
          orderId: order.id,
          workstreamId: workstream.id,
          sourceCartItemId: line.cartItemId,
          position: index + 1,
          itemType: line.itemType ?? "product",
          productId: line.productId,
          uploadedDesignId: line.uploadedDesignId,
          productName: line.productName,
          quantity: line.quantity,
          unitPriceUsd: numberToMoney(line.unitPriceUsd),
          lineTotalUsd: numberToMoney(line.lineTotalUsd),
          measurementId: line.measurementId,
          measurementSnapshot: line.measurementSnapshot,
          itemMetadata: line.itemMetadata,
          status: workstream.status,
          lastStatusChangedBy: "checkout",
        };
      }))
      .returning();
    if (orderType === "mixed_order") {
      await tx.insert(orderLineItemEvents).values(lineItemRows.map((lineItem) => ({
        orderId: order.id,
        workstreamId: lineItem.workstreamId,
        lineItemId: lineItem.id,
        fromStatus: null,
        toStatus: lineItem.status,
        version: lineItem.version,
        eventKey: `${lineItem.id}:checkout:${lineItem.version}:${lineItem.status}`,
        changedBy: "checkout",
        metadata: {
          status_kind: "production",
          baseline: true,
        },
      })));
    }

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

    await tx.insert(systemAlerts).values(workstreamRows.map((workstream) => ({
      title: `New ${workstreamLabel(workstream.type as OrderWorkstreamType)} order #${workstream.trackingReference}`,
      message: `${order.customerName} placed ${orderType === "mixed_order" ? "a mixed order" : "an order"}; the ${workstream.type} part is awaiting review.`,
      type: workstream.type === "custom" ? "new_custom_order" : "new_catalog_order",
      severity: "info",
      entityId: order.id,
    })));

    return {
      order: {
        ...order,
        workstreams: workstreamRows.map((workstream) => ({
          ...workstream,
          items: lineItemRows
            .filter((lineItem) => lineItem.workstreamId === workstream.id)
            .map((lineItem) => ({
              ...(lines[lineItem.position - 1] ?? {}),
              ...lineItem,
              events: [],
            })),
          events: [],
        })),
      },
      totals,
      lines,
    };
  });
  await sendOrderStatusEmail({
    ...(await orderDesignEmailDetails(result.order)),
    event: "order_confirmed",
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
    orderType: result.order.orderType,
    workstreamTypes: result.order.workstreams.map((workstream) => workstream.type as OrderWorkstreamType),
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

  const orderType = inferOrderType(lines);
  const catalogSubtotalUsd = lines
    .filter((line) => classifyOrderLine(line) === "catalog")
    .reduce((sum, line) => sum + line.lineTotalUsd, 0);
  const customSubtotalUsd = lines
    .filter((line) => classifyOrderLine(line) === "custom")
    .reduce((sum, line) => sum + line.lineTotalUsd, 0);
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
    catalogSubtotalUsd,
    customSubtotalUsd,
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
    ...(await orderDesignEmailDetails(updated)),
    event: "payment_verification_pending",
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
  const workstreamIds = Array.isArray(order.workstreams)
    ? order.workstreams
        .map((workstream) => typeof workstream.id === "string" ? workstream.id : null)
        .filter((id): id is string => Boolean(id))
    : [];
  if (workstreamIds.length) {
    await db.delete(auditLogs).where(
      and(eq(auditLogs.entityType, "order_workstream"), inArray(auditLogs.entityId, workstreamIds)),
    );
  }

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
