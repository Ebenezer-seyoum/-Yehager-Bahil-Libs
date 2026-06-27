import { and, eq } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { orders, stripeWebhookEvents } from "../lib/db/schema.js";

export async function markStripeSessionOnOrder(params: { orderId: string; userEmail: string; stripeSessionId: string }) {
  const [row] = await db
    .update(orders)
    .set({
      stripeSessionId: params.stripeSessionId,
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, params.orderId), eq(orders.userEmail, params.userEmail)))
    .returning();
  return row;
}

export async function getOrderByStripeSessionId(stripeSessionId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.stripeSessionId, stripeSessionId),
  });
}

export async function updateStripeReceiptOnOrder(params: {
  orderId: string;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  stripeReceiptUrl?: string | null;
  stripePaymentStatus?: string | null;
  stripeAmountReceived?: string | null;
  stripeCurrency?: string | null;
  stripeCustomerEmail?: string | null;
  stripeCustomerName?: string | null;
  stripePaymentMethodBrand?: string | null;
  stripePaymentMethodLast4?: string | null;
  stripePaymentMethodFunding?: string | null;
  stripePaymentMethodCountry?: string | null;
  stripePaidAt?: Date | null;
  stripeFailureReason?: string | null;
  stripeRefundStatus?: string | null;
  stripeRefundAmount?: string | null;
  stripeReceiptMetadata?: Record<string, unknown> | null;
}) {
  const [row] = await db
    .update(orders)
    .set({
      stripePaymentIntentId: params.stripePaymentIntentId ?? undefined,
      stripeChargeId: params.stripeChargeId ?? undefined,
      stripeReceiptUrl: params.stripeReceiptUrl ?? undefined,
      stripePaymentStatus: params.stripePaymentStatus ?? undefined,
      stripeAmountReceived: params.stripeAmountReceived ?? undefined,
      stripeCurrency: params.stripeCurrency ?? undefined,
      stripeCustomerEmail: params.stripeCustomerEmail ?? undefined,
      stripeCustomerName: params.stripeCustomerName ?? undefined,
      stripePaymentMethodBrand: params.stripePaymentMethodBrand ?? undefined,
      stripePaymentMethodLast4: params.stripePaymentMethodLast4 ?? undefined,
      stripePaymentMethodFunding: params.stripePaymentMethodFunding ?? undefined,
      stripePaymentMethodCountry: params.stripePaymentMethodCountry ?? undefined,
      stripePaidAt: params.stripePaidAt ?? undefined,
      stripeFailureReason: params.stripeFailureReason ?? undefined,
      stripeRefundStatus: params.stripeRefundStatus ?? undefined,
      stripeRefundAmount: params.stripeRefundAmount ?? undefined,
      stripeReceiptMetadata: params.stripeReceiptMetadata ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, params.orderId))
    .returning();
  return row;
}

export async function recordWebhookEventIfNew(payload: {
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
}) {
  const rows = await db
    .insert(stripeWebhookEvents)
    .values({
      eventId: payload.eventId,
      eventType: payload.eventType,
      payload: payload.payload,
      status: "processed",
    })
    .onConflictDoNothing()
    .returning({ id: stripeWebhookEvents.id });

  return rows.length > 0;
}
