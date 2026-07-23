import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { orderLineItemEvents, orderLineItems, orderWorkstreamEvents, orderWorkstreams, orders } from "../lib/db/schema.js";
import { rollUpOrderStatus, type OrderWorkstreamType } from "../lib/orders/order-workstreams.js";

export type OrderWorkstreamScope = "catalog" | "custom";

function legacyCompatibleLineItem(
  row: typeof orderLineItems.$inferSelect,
  events: Array<typeof orderLineItemEvents.$inferSelect> = [],
) {
  return {
    ...row,
    product_id: row.productId,
    product_name: row.productName,
    uploaded_design_id: row.uploadedDesignId,
    item_type: row.itemType,
    unit_price_usd: row.unitPriceUsd,
    line_total_usd: row.lineTotalUsd,
    measurement_id: row.measurementId,
    measurement_snapshot: row.measurementSnapshot,
    item_metadata: row.itemMetadata,
    events,
  };
}

async function attachOrderWorkstreams<T extends { id: string }>(rows: T[], includeEvents = false) {
  if (!rows.length) return [] as Array<T & { workstreams: Array<Record<string, unknown>> }>;

  const orderIds = rows.map((row) => row.id);
  const workstreamRows = await db.query.orderWorkstreams.findMany({
    where: inArray(orderWorkstreams.orderId, orderIds),
    orderBy: [asc(orderWorkstreams.createdAt)],
  });
  const workstreamIds = workstreamRows.map((row) => row.id);
  const [lineRows, eventRows, lineEventRows] = workstreamIds.length
    ? await Promise.all([
        db.query.orderLineItems.findMany({
          where: inArray(orderLineItems.workstreamId, workstreamIds),
          orderBy: [asc(orderLineItems.position)],
        }),
        includeEvents
          ? db.query.orderWorkstreamEvents.findMany({
              where: inArray(orderWorkstreamEvents.workstreamId, workstreamIds),
              orderBy: [desc(orderWorkstreamEvents.createdAt)],
            })
          : Promise.resolve([]),
        includeEvents
          ? db.query.orderLineItemEvents.findMany({
              where: inArray(orderLineItemEvents.workstreamId, workstreamIds),
              orderBy: [desc(orderLineItemEvents.createdAt)],
            })
          : Promise.resolve([]),
      ])
    : [[], [], []];

  const linesByWorkstream = new Map<string, typeof lineRows>();
  for (const line of lineRows) {
    const current = linesByWorkstream.get(line.workstreamId) ?? [];
    current.push(line);
    linesByWorkstream.set(line.workstreamId, current);
  }
  const eventsByWorkstream = new Map<string, typeof eventRows>();
  for (const event of eventRows) {
    const current = eventsByWorkstream.get(event.workstreamId) ?? [];
    current.push(event);
    eventsByWorkstream.set(event.workstreamId, current);
  }
  const eventsByLine = new Map<string, typeof lineEventRows>();
  for (const event of lineEventRows) {
    const current = eventsByLine.get(event.lineItemId) ?? [];
    current.push(event);
    eventsByLine.set(event.lineItemId, current);
  }
  const workstreamsByOrder = new Map<string, Array<Record<string, unknown>>>();
  for (const workstream of workstreamRows) {
    const current = workstreamsByOrder.get(workstream.orderId) ?? [];
    current.push({
      ...workstream,
      items: (linesByWorkstream.get(workstream.id) ?? []).map((line) =>
        legacyCompatibleLineItem(line, eventsByLine.get(line.id) ?? []),
      ),
      events: eventsByWorkstream.get(workstream.id) ?? [],
    });
    workstreamsByOrder.set(workstream.orderId, current);
  }

  return rows.map((row) => ({
    ...row,
    workstreams: workstreamsByOrder.get(row.id) ?? [],
  }));
}

export async function listOrdersByUserEmail(userEmail: string, limit = 50) {
  const rows = await db.query.orders.findMany({
    where: eq(orders.userEmail, userEmail),
    orderBy: [desc(orders.createdAt)],
    limit,
  });
  return attachOrderWorkstreams(rows);
}

export async function listAllOrders(limit = 100, scope?: OrderWorkstreamScope) {
  let scopedOrderIds: string[] | undefined;
  if (scope) {
    const scopedRows = await db
      .select({ orderId: orderWorkstreams.orderId })
      .from(orderWorkstreams)
      .innerJoin(orders, eq(orders.id, orderWorkstreams.orderId))
      .where(eq(orderWorkstreams.type, scope))
      .orderBy(desc(orders.createdAt))
      .limit(limit);
    scopedOrderIds = scopedRows.map((row) => row.orderId);
    if (!scopedOrderIds.length) return [];
  }

  const rows = await db.query.orders.findMany({
    where: scopedOrderIds ? inArray(orders.id, scopedOrderIds) : undefined,
    orderBy: [desc(orders.createdAt)],
    limit,
  });
  return attachOrderWorkstreams(rows);
}

export async function getOrderByIdForUser(params: { orderId: string; userEmail: string }) {
  const row = await db.query.orders.findFirst({
    where: and(eq(orders.id, params.orderId), eq(orders.userEmail, params.userEmail)),
  });
  if (!row) return undefined;
  return (await attachOrderWorkstreams([row], true))[0];
}

export async function getOrderById(orderId: string) {
  const row = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!row) return undefined;
  return (await attachOrderWorkstreams([row], true))[0];
}

export async function updateOrderPaymentState(params: {
  orderId: string;
  paymentStatus: string;
  orderStatus?: string;
}) {
  const workstreamRows = params.paymentStatus === "paid"
    ? await db.query.orderWorkstreams.findMany({ where: eq(orderWorkstreams.orderId, params.orderId) })
    : [];
  const rolledStatus = workstreamRows.length
    ? rollUpOrderStatus(workstreamRows.map((row) => ({ type: row.type as OrderWorkstreamType, status: row.status })))
    : undefined;
  const [row] = await db
    .update(orders)
    .set({
      paymentStatus: params.paymentStatus,
      status: rolledStatus === "fulfilled" ? "fulfilled" : params.orderStatus,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, params.orderId))
    .returning();
  return row;
}

export async function markEtbPaymentProof(params: {
  orderId: string;
  userEmail: string;
  paymentProofUrl: string;
}) {
  const [row] = await db
    .update(orders)
    .set({
      paymentProofUrl: params.paymentProofUrl,
      paymentProofUploadedAt: new Date(),
      paymentStatus: "awaiting_verification",
      updatedAt: new Date(),
    })
    .where(and(eq(orders.id, params.orderId), eq(orders.userEmail, params.userEmail)))
    .returning();
  return row;
}
