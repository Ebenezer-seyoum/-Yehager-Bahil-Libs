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
