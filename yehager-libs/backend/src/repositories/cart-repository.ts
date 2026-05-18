import { and, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { cartItems } from "../lib/db/schema.js";

export async function listCartItemsByUserEmail(userEmail: string) {
  return db.query.cartItems.findMany({
    where: eq(cartItems.userEmail, userEmail),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
}

export async function createCartItem(payload: {
  userId?: string;
  userEmail: string;
  productId?: string;
  productName: string;
  productImage?: string;
  priceUsd: string;
  quantity: number;
  measurementId?: string;
  measurementSnapshot?: Record<string, unknown>;
  eventId?: string;
  eventName?: string;
}) {
  const [row] = await db
    .insert(cartItems)
    .values({
      userId: payload.userId,
      userEmail: payload.userEmail,
      productId: payload.productId,
      productName: payload.productName,
      productImage: payload.productImage,
      priceUsd: payload.priceUsd,
      quantity: payload.quantity,
      measurementId: payload.measurementId,
      measurementSnapshot: payload.measurementSnapshot,
      eventId: payload.eventId,
      eventName: payload.eventName,
    })
    .returning();

  return row;
}

export async function listCartItemsByIdsForUser(params: { itemIds: string[]; userEmail: string }) {
  if (!params.itemIds.length) {
    return [];
  }

  return db.query.cartItems.findMany({
    where: and(inArray(cartItems.id, params.itemIds), eq(cartItems.userEmail, params.userEmail)),
  });
}

export async function updateCartItemQuantity(params: { id: string; userEmail: string; quantity: number }) {
  const [row] = await db
    .update(cartItems)
    .set({
      quantity: params.quantity,
      updatedAt: new Date(),
    })
    .where(and(eq(cartItems.id, params.id), eq(cartItems.userEmail, params.userEmail)))
    .returning();

  return row;
}

export async function deleteCartItemById(params: { id: string; userEmail: string }) {
  const [row] = await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, params.id), eq(cartItems.userEmail, params.userEmail)))
    .returning({ id: cartItems.id });
  return row;
}

export async function deleteCartItemsByIdsForUser(params: { ids: string[]; userEmail: string }) {
  if (!params.ids.length) {
    return [];
  }

  return db
    .delete(cartItems)
    .where(and(inArray(cartItems.id, params.ids), eq(cartItems.userEmail, params.userEmail)))
    .returning({ id: cartItems.id });
}
