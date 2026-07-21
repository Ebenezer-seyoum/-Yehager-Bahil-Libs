import Stripe from "stripe";
import { HTTPException } from "hono/http-exception";
import { db } from "../lib/db/drizzle.js";
import { and, eq, inArray } from "drizzle-orm";
import { auditLogs, eventParticipants, systemAlerts, uploadedDesigns } from "../lib/db/schema.js";
import { env } from "../config/env.js";
import { getOrderById, getOrderByIdForUser, updateOrderPaymentState } from "../repositories/orders-repository.js";
import {
  getOrderByStripeSessionId,
  markStripeSessionOnOrder,
  recordWebhookEventIfNew,
  updateStripeReceiptOnOrder,
} from "../repositories/payments-repository.js";
import { deleteCartItemsByIdsForUser } from "../repositories/cart-repository.js";
import { canTransitionPaymentStatus, deriveOrderStatusOnPayment } from "./order-state-machine.js";
import { sendAdminPaymentReceivedEmail, sendOrderStatusEmail } from "./email-service.js";
import { awardCustomerCreditForPaidOrder } from "./customer-credits-service.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

type OrderItem = {
  product_name?: string;
  quantity?: number;
  unit_price_usd?: number;
  line_total_usd?: number;
  uploaded_design_id?: string;
};

function toNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function centsToAmount(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return (value / 100).toFixed(2);
}

async function resolveStripeReceipt(session: Stripe.Checkout.Session) {
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["payment_intent", "payment_intent.latest_charge"],
  });
  const paymentIntent = typeof fullSession.payment_intent === "object" && fullSession.payment_intent
    ? fullSession.payment_intent as Stripe.PaymentIntent
    : undefined;
  const latestCharge = typeof paymentIntent?.latest_charge === "object" && paymentIntent.latest_charge
    ? paymentIntent.latest_charge as Stripe.Charge
    : undefined;
  const card = latestCharge?.payment_method_details?.card;
  return {
    fullSession,
    paymentIntent,
    latestCharge,
    receipt: {
      stripePaymentIntentId: paymentIntent?.id ?? (typeof fullSession.payment_intent === "string" ? fullSession.payment_intent : undefined),
      stripeChargeId: latestCharge?.id,
      stripeReceiptUrl: latestCharge?.receipt_url ?? undefined,
      stripePaymentStatus: paymentIntent?.status ?? fullSession.payment_status ?? undefined,
      stripeAmountReceived: centsToAmount(paymentIntent?.amount_received ?? fullSession.amount_total),
      stripeCurrency: (paymentIntent?.currency ?? fullSession.currency ?? "usd").toUpperCase(),
      stripeCustomerEmail: fullSession.customer_details?.email ?? fullSession.customer_email ?? latestCharge?.billing_details?.email ?? undefined,
      stripeCustomerName: fullSession.customer_details?.name ?? latestCharge?.billing_details?.name ?? undefined,
      stripePaymentMethodBrand: card?.brand ?? undefined,
      stripePaymentMethodLast4: card?.last4 ?? undefined,
      stripePaymentMethodFunding: card?.funding ?? undefined,
      stripePaymentMethodCountry: card?.country ?? undefined,
      stripePaidAt: latestCharge?.created ? new Date(latestCharge.created * 1000) : undefined,
      stripeFailureReason: paymentIntent?.last_payment_error?.message ?? latestCharge?.failure_message ?? undefined,
      stripeRefundStatus: latestCharge?.refunded ? "refunded" : latestCharge?.amount_refunded ? "partially_refunded" : undefined,
      stripeRefundAmount: centsToAmount(latestCharge?.amount_refunded),
      stripeReceiptMetadata: {
        checkout_session_id: fullSession.id,
        payment_intent_id: paymentIntent?.id,
        charge_id: latestCharge?.id,
        receipt_number: latestCharge?.receipt_number,
        payment_method_type: latestCharge?.payment_method_details?.type,
        order_id: fullSession.metadata?.order_id,
        order_number: fullSession.metadata?.order_number,
      },
    },
  };
}

function receiptFromStripeObjects(params: {
  paymentIntent?: Stripe.PaymentIntent;
  charge?: Stripe.Charge;
  fallbackCurrency?: string | null;
}) {
  const card = params.charge?.payment_method_details?.card;
  return {
    stripePaymentIntentId: params.paymentIntent?.id,
    stripeChargeId: params.charge?.id,
    stripeReceiptUrl: params.charge?.receipt_url ?? undefined,
    stripePaymentStatus: params.paymentIntent?.status,
    stripeAmountReceived: centsToAmount(params.paymentIntent?.amount_received ?? params.charge?.amount_captured ?? params.charge?.amount),
    stripeCurrency: (params.paymentIntent?.currency ?? params.charge?.currency ?? params.fallbackCurrency ?? "usd").toUpperCase(),
    stripeCustomerEmail: params.charge?.billing_details?.email ?? undefined,
    stripeCustomerName: params.charge?.billing_details?.name ?? undefined,
    stripePaymentMethodBrand: card?.brand ?? undefined,
    stripePaymentMethodLast4: card?.last4 ?? undefined,
    stripePaymentMethodFunding: card?.funding ?? undefined,
    stripePaymentMethodCountry: card?.country ?? undefined,
    stripePaidAt: params.charge?.created ? new Date(params.charge.created * 1000) : undefined,
    stripeFailureReason: params.paymentIntent?.last_payment_error?.message ?? params.charge?.failure_message ?? undefined,
    stripeRefundStatus: params.charge?.refunded ? "refunded" : params.charge?.amount_refunded ? "partially_refunded" : undefined,
    stripeRefundAmount: centsToAmount(params.charge?.amount_refunded),
    stripeReceiptMetadata: {
      payment_intent_id: params.paymentIntent?.id,
      charge_id: params.charge?.id,
      receipt_number: params.charge?.receipt_number,
      payment_method_type: params.charge?.payment_method_details?.type,
    },
  };
}

export async function refreshStripeReceiptForOrder(payload: { orderId: string }) {
  const order = await getOrderById(payload.orderId);
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  if (order.paymentMethod !== "stripe_usd") {
    throw new HTTPException(400, { message: "Order payment method is not Stripe" });
  }

  let paymentIntent: Stripe.PaymentIntent | undefined;
  let charge: Stripe.Charge | undefined;

  if (order.stripePaymentIntentId) {
    paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId, {
      expand: ["latest_charge"],
    });
    if (typeof paymentIntent.latest_charge === "object" && paymentIntent.latest_charge) {
      charge = paymentIntent.latest_charge as Stripe.Charge;
    }
  }

  if (!charge && order.stripeChargeId) {
    charge = await stripe.charges.retrieve(order.stripeChargeId);
  }

  if (!paymentIntent && charge?.payment_intent && typeof charge.payment_intent === "string") {
    paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent);
  }

  if (!paymentIntent && !charge) {
    throw new HTTPException(400, { message: "No Stripe payment intent or charge is stored for this order" });
  }

  const updated = await updateStripeReceiptOnOrder({
    orderId: order.id,
    ...receiptFromStripeObjects({
      paymentIntent,
      charge,
      fallbackCurrency: order.paymentCurrency,
    }),
  });

  return updated;
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
    const stripeReceipt = await resolveStripeReceipt(session);
    const order =
      (session.id && (await getOrderByStripeSessionId(session.id))) ||
      (session.metadata?.order_id
        ? await getOrderById(session.metadata.order_id)
        : undefined);

    if (order) {
      const nextPayment = "paid" as const;
      if (canTransitionPaymentStatus(order.paymentStatus, nextPayment)) {
        const nextOrderStatus = deriveOrderStatusOnPayment(order.status, nextPayment);
        const updatedOrder = await updateOrderPaymentState({
          orderId: order.id,
          paymentStatus: nextPayment,
          orderStatus: nextOrderStatus,
        });
        await updateStripeReceiptOnOrder({
          orderId: order.id,
          ...stripeReceipt.receipt,
        });
        if (updatedOrder) {
          await awardCustomerCreditForPaidOrder(updatedOrder, "stripe");
          if (updatedOrder.status === "fulfilled" && order.status !== "fulfilled") {
            const existingDeliveryAlert = await db.query.systemAlerts.findFirst({
              where: and(
                eq(systemAlerts.type, "shipping_delivery_ready"),
                eq(systemAlerts.entityId, order.id),
                eq(systemAlerts.isResolved, false),
              ),
            });
            if (!existingDeliveryAlert) {
              await db.insert(systemAlerts).values({
                title: `Order ready for delivery #${order.orderNumber}`,
                message: `${order.customerName}'s active order work is ready for shared fulfillment.`,
                type: "shipping_delivery_ready",
                severity: "info",
                entityId: order.id,
              });
            }
          }
        }
        await sendOrderStatusEmail({
          event: "payment_confirmed",
          to: updatedOrder?.userEmail ?? order.userEmail,
          customerName: updatedOrder?.customerName ?? order.customerName,
          orderNumber: updatedOrder?.orderNumber ?? order.orderNumber,
          orderDate: updatedOrder?.createdAt ?? order.createdAt,
          orderType: updatedOrder?.orderType ?? order.orderType,
          status: updatedOrder?.status ?? nextOrderStatus,
          paymentStatus: updatedOrder?.paymentStatus ?? nextPayment,
          paymentMethod: updatedOrder?.paymentMethod ?? order.paymentMethod,
          paymentCurrency: updatedOrder?.paymentCurrency ?? order.paymentCurrency,
          totalUsd: updatedOrder?.totalUsd ?? order.totalUsd,
          totalEtb: updatedOrder?.totalEtb ?? order.totalEtb,
          paymentReference: stripeReceipt.receipt.stripePaymentIntentId ?? stripeReceipt.receipt.stripeChargeId ?? session.id,
          paymentDate: stripeReceipt.receipt.stripePaidAt,
          paymentFailureReason: stripeReceipt.receipt.stripeFailureReason,
          receiptUrl: stripeReceipt.receipt.stripeReceiptUrl,
          fulfillmentType: updatedOrder?.fulfillmentType ?? order.fulfillmentType,
        });
        await sendAdminPaymentReceivedEmail({
          orderId: updatedOrder?.id ?? order.id,
          orderNumber: updatedOrder?.orderNumber ?? order.orderNumber,
          customerName: updatedOrder?.customerName ?? order.customerName,
          customerEmail: updatedOrder?.userEmail ?? order.userEmail,
          status: updatedOrder?.status ?? nextOrderStatus,
          paymentStatus: updatedOrder?.paymentStatus ?? nextPayment,
          totalUsd: updatedOrder?.totalUsd ?? order.totalUsd,
          paymentMethod: updatedOrder?.paymentMethod ?? order.paymentMethod,
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
            stripe_payment_intent_id: stripeReceipt.receipt.stripePaymentIntentId,
            stripe_charge_id: stripeReceipt.receipt.stripeChargeId,
            stripe_receipt_url: stripeReceipt.receipt.stripeReceiptUrl,
            amount_total: session.amount_total ? session.amount_total / 100 : undefined,
          },
        });

        await db.insert(systemAlerts).values({
          title: `New paid order #${order.orderNumber}`,
          message: `Payment confirmed for ${order.userEmail}.`,
          type: "payment_received",
          severity: "info",
          entityId: order.id,
        });

        const cartItemIds = Array.isArray(order.items)
          ? order.items
              .map((item) => (typeof item === "object" && item ? (item as Record<string, unknown>).cart_item_id : undefined))
              .filter((id): id is string => typeof id === "string")
          : [];
        await deleteCartItemsByIdsForUser({ ids: cartItemIds, userEmail: order.userEmail });

        const uploadedDesignIds = Array.isArray(order.items)
          ? order.items
              .map((item) => (typeof item === "object" && item ? (item as OrderItem).uploaded_design_id : undefined))
              .filter((id): id is string => typeof id === "string")
          : [];
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
