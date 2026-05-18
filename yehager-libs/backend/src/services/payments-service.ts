import Stripe from "stripe";
import { HTTPException } from "hono/http-exception";
import { db } from "../lib/db/drizzle.js";
import { and, eq } from "drizzle-orm";
import { auditLogs, eventParticipants, systemAlerts } from "../lib/db/schema.js";
import { env } from "../config/env.js";
import { getOrderById, getOrderByIdForUser, updateOrderPaymentState } from "../repositories/orders-repository.js";
import {
  getOrderByStripeSessionId,
  markStripeSessionOnOrder,
  recordWebhookEventIfNew,
} from "../repositories/payments-repository.js";
import { deleteCartItemsByIdsForUser } from "../repositories/cart-repository.js";
import { canTransitionPaymentStatus, deriveOrderStatusOnPayment } from "./order-state-machine.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

type OrderItem = {
  product_name?: string;
  quantity?: number;
  unit_price_usd?: number;
  line_total_usd?: number;
};

function toNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export async function createStripeCheckoutSession(payload: {
  orderId: string;
  userEmail?: string;
  successPath?: string;
  cancelPath?: string;
}) {
  if (!payload.userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  const order = await getOrderByIdForUser({ orderId: payload.orderId, userEmail: payload.userEmail });
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  if (order.paymentMethod !== "stripe_usd") {
    throw new HTTPException(400, { message: "Order payment method is not Stripe" });
  }
  if (order.paymentStatus !== "pending") {
    throw new HTTPException(400, { message: "Order is not in pending payment state" });
  }

  const items = (order.items ?? []) as OrderItem[];
  if (!items.length) {
    throw new HTTPException(400, { message: "Order has no payable items" });
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
    quantity: item.quantity ?? 1,
    price_data: {
      currency: "usd",
      product_data: {
        name: item.product_name ?? "Custom garment",
      },
      unit_amount: Math.round(toNumber(item.unit_price_usd, 0) * 100),
    },
  }));

  const shippingCostUsd = toNumber(order.shippingCostUsd, 0);
  if (shippingCostUsd > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        product_data: { name: "Shipping & Handling" },
        unit_amount: Math.round(shippingCostUsd * 100),
      },
    });
  }

  const successUrl = `${env.FRONTEND_APP_URL}${payload.successPath ?? "/order-confirmation"}?order=${order.id}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${env.FRONTEND_APP_URL}${payload.cancelPath ?? "/checkout"}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: order.userEmail,
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      order_id: order.id,
      order_number: order.orderNumber,
      user_email: order.userEmail,
    },
  });

  await markStripeSessionOnOrder({
    orderId: order.id,
    userEmail: order.userEmail,
    stripeSessionId: session.id,
  });

  return {
    sessionId: session.id,
    url: session.url,
    orderId: order.id,
  };
}

export async function processStripeWebhook(payload: { body: string; signature?: string }) {
  if (!payload.signature) {
    throw new HTTPException(400, { message: "Missing stripe-signature header" });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload.body, payload.signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new HTTPException(400, { message: "Invalid Stripe webhook signature" });
  }

  const isNew = await recordWebhookEventIfNew({
    eventId: event.id,
    eventType: event.type,
    payload: event as unknown as Record<string, unknown>,
  });
  if (!isNew) {
    return { received: true, duplicate: true };
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const order =
      (session.id && (await getOrderByStripeSessionId(session.id))) ||
      (session.metadata?.order_id
        ? await getOrderById(session.metadata.order_id)
        : undefined);

    if (order) {
      const nextPayment = "paid" as const;
      if (canTransitionPaymentStatus(order.paymentStatus, nextPayment)) {
        const nextOrderStatus = deriveOrderStatusOnPayment(order.status, nextPayment);
        await updateOrderPaymentState({
          orderId: order.id,
          paymentStatus: nextPayment,
          orderStatus: nextOrderStatus,
        });

        await db.insert(auditLogs).values({
          action: "payment_received",
          category: "payment",
          severity: "info",
          entityType: "order",
          entityId: order.id,
          performedBy: "stripe",
          details: `Stripe payment completed for order ${order.orderNumber}`,
          metadata: {
            stripe_event_id: event.id,
            stripe_session_id: session.id,
            amount_total: session.amount_total ? session.amount_total / 100 : undefined,
          },
        });

        await db.insert(systemAlerts).values({
          title: `New paid order #${order.orderNumber}`,
          message: `Payment confirmed for ${order.userEmail}.`,
          type: "new_order",
          severity: "info",
          entityId: order.id,
        });

        const cartItemIds = Array.isArray(order.items)
          ? order.items
              .map((item) => (typeof item === "object" && item ? (item as Record<string, unknown>).cart_item_id : undefined))
              .filter((id): id is string => typeof id === "string")
          : [];
        await deleteCartItemsByIdsForUser({ ids: cartItemIds, userEmail: order.userEmail });

        if (order.eventId) {
          await db
            .update(eventParticipants)
            .set({
              orderId: order.id,
              orderStatus: "ordered",
              paymentStatus: "paid",
              updatedAt: new Date(),
            })
            .where(
              and(eq(eventParticipants.eventId, order.eventId), eq(eventParticipants.participantEmail, order.userEmail)),
            );
        }
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    await db.insert(auditLogs).values({
      action: "payment_failed",
      category: "payment",
      severity: "error",
      entityType: "payment_intent",
      entityId: paymentIntent.id,
      performedBy: "stripe",
      details: paymentIntent.last_payment_error?.message ?? "Payment failed",
      metadata: {
        stripe_event_id: event.id,
      },
    });
  }

  return { received: true, duplicate: false };
}
