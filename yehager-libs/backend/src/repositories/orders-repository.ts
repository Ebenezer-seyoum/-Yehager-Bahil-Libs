import { and, desc, eq } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { orders } from "../lib/db/schema.js";

export async function listOrdersByUserEmail(userEmail: string, limit = 50) {
  return db.query.orders.findMany({
    where: eq(orders.userEmail, userEmail),
    orderBy: [desc(orders.createdAt)],
    limit,
  });
}

export async function listAllOrders(limit = 100) {
  return db.query.orders.findMany({
    orderBy: [desc(orders.createdAt)],
    limit,
  });
}

export async function getOrderByIdForUser(params: { orderId: string; userEmail: string }) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, params.orderId), eq(orders.userEmail, params.userEmail)),
  });
}

export async function getOrderById(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
}

export async function updateOrderPaymentState(params: {
  orderId: string;
  paymentStatus: string;
  orderStatus?: string;
}) {
  const [row] = await db
    .update(orders)
    .set({
      paymentStatus: params.paymentStatus,
      status: params.orderStatus,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, params.orderId))
    .returning();
  return row;
}
