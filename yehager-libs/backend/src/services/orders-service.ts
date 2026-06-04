import { HTTPException } from "hono/http-exception";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { auditLogs, eventParticipants, events, orders, products, systemAlerts, uploadedDesigns } from "../lib/db/schema.js";
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
type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];
type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUS_VALUES as readonly string[]).includes(value);
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUS_VALUES as readonly string[]).includes(value);
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
  return order;
}

export async function getOrdersForAdmin(limit = 100) {
  return listAllOrders(limit);
}

export async function getOrderDetailsForAdmin(orderId: string) {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  return order;
}

export async function updateOrderAdminState(payload: {
  orderId: string;
  performedBy?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentType?: "mail" | "pickup";
}) {
  const order = await getOrderById(payload.orderId);
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  if (!payload.status && !payload.paymentStatus && !payload.fulfillmentType) {
    throw new HTTPException(400, { message: "At least one field must be updated" });
  }
  if (payload.status && !isOrderStatus(payload.status)) {
    throw new HTTPException(400, { message: `Invalid order status: ${payload.status}` });
  }
  if (payload.paymentStatus && !isPaymentStatus(payload.paymentStatus)) {
    throw new HTTPException(400, { message: `Invalid payment status: ${payload.paymentStatus}` });
  }

  const nextStatus = payload.status ?? order.status;
  const nextPayment = payload.paymentStatus ?? order.paymentStatus;
  if (
    ["fulfilled", "shipped", "delivered", "ready_for_pickup", "picked_up"].includes(nextStatus) &&
    nextPayment !== "paid"
  ) {
    throw new HTTPException(400, { message: "Order must be paid before moving into fulfillment-complete states" });
  }

  const [updated] = await db
    .update(orders)
    .set({
      status: payload.status ?? undefined,
      paymentStatus: payload.paymentStatus ?? undefined,
      fulfillmentType: payload.fulfillmentType ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, payload.orderId))
    .returning();

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
      },
      current: {
        status: updated.status,
        payment_status: updated.paymentStatus,
        fulfillment_type: updated.fulfillmentType,
      },
    },
  });

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

  return db.transaction(async (tx) => {
    const cartRows = await listCartItemsByIdsForUser({
      itemIds: payload.cartItemIds,
      userEmail,
    });
    if (!cartRows.length) {
      throw new HTTPException(404, { message: "No matching cart items found" });
    }

    const productIds = [...new Set(cartRows.map((row) => row.productId).filter((id): id is string => Boolean(id)))];
    const dbProducts = productIds.length
      ? await tx.query.products.findMany({
          where: and(inArray(products.id, productIds), eq(products.isActive, true)),
        })
      : [];

    const productPriceMap = new Map(dbProducts.map((p) => [p.id, p.priceUsd]));
    const eventIds = [...new Set(cartRows.map((row) => row.eventId).filter((id): id is string => Boolean(id)))];
    const primaryEventId = eventIds.length === 1 ? eventIds[0] : undefined;
    const primaryEvent = primaryEventId
      ? await tx.query.events.findFirst({
          where: eq(events.id, primaryEventId),
        })
      : undefined;

    const lineInputs = cartRows.map((row) => {
      const trustedUnitPriceUsd = row.productId ? productPriceMap.get(row.productId) ?? row.priceUsd : row.priceUsd;
      return {
        cartItemId: row.id,
        productId: row.productId,
        productName: row.productName,
        quantity: row.quantity,
        trustedUnitPriceUsd,
        measurementId: row.measurementId,
        itemType: row.itemType,
        uploadedDesignId: row.uploadedDesignId,
        itemMetadata: row.itemMetadata,
      };
    });

    const lines = buildCheckoutLines(lineInputs);
    const orderType = lines.some((line) => line.itemType === "custom_design" || line.uploadedDesignId)
      ? "custom_design_order"
      : lines.some((line) => line.itemType === "group_order") || primaryEventId
        ? "group_order"
        : "catalog_order";
    const totalItems = lines.reduce((sum, line) => sum + line.quantity, 0);
    const fulfillmentType = payload.fulfillmentType ?? "mail";
    const carrier = fulfillmentType === "pickup" ? "pickup" : payload.carrier ?? "Ethiopian Mail Service";
    const shippingCostUsd =
      fulfillmentType === "mail" && carrier === "Ethiopian Mail Service" ? computeEmsShipping(totalItems) : 0;
    const totals = computeTotals(lines, shippingCostUsd);

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
          item_type: line.itemType ?? "product",
          uploaded_design_id: line.uploadedDesignId,
          item_metadata: line.itemMetadata,
        })),
        totalUsd: numberToMoney(totals.totalUsd),
        shippingCostUsd: numberToMoney(totals.shippingCostUsd),
        orderType,
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
        cart_item_ids: payload.cartItemIds,
        total_usd: totals.totalUsd,
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
