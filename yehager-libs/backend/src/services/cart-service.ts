import { HTTPException } from "hono/http-exception";
import {
  createCartItem,
  deleteCartItemById,
  listCartItemsByUserEmail,
  updateCartItemQuantity,
} from "../repositories/cart-repository.js";
import { getActiveProductById } from "../repositories/products-repository.js";
import { getUserByEmail } from "../repositories/users-repository.js";

export async function getCartForUser(userEmail?: string) {
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  return listCartItemsByUserEmail(userEmail);
}

export async function addItemToCart(payload: {
  userEmail?: string;
  productId: string;
  quantity: number;
  measurementId?: string;
  eventId?: string;
  eventName?: string;
}) {
  if (!payload.userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  if (payload.quantity <= 0) {
    throw new HTTPException(400, { message: "Quantity must be greater than zero" });
  }

  const product = await getActiveProductById(payload.productId);
  if (!product || !product.isActive) {
    throw new HTTPException(404, { message: "Product not found" });
  }

  const user = await getUserByEmail(payload.userEmail);
  const item = await createCartItem({
    userId: user?.id,
    userEmail: payload.userEmail,
    productId: product.id,
    productName: product.name,
    productImage: product.images?.[0],
    priceUsd: product.priceUsd,
    quantity: payload.quantity,
    measurementId: payload.measurementId,
    eventId: payload.eventId,
    eventName: payload.eventName,
  });

  return item;
}

export async function changeCartItemQuantity(payload: { userEmail?: string; itemId: string; quantity: number }) {
  if (!payload.userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  if (payload.quantity <= 0) {
    throw new HTTPException(400, { message: "Quantity must be greater than zero" });
  }

  const item = await updateCartItemQuantity({
    id: payload.itemId,
    userEmail: payload.userEmail,
    quantity: payload.quantity,
  });

  if (!item) {
    throw new HTTPException(404, { message: "Cart item not found" });
  }
  return item;
}

export async function removeCartItem(payload: { userEmail?: string; itemId: string }) {
  if (!payload.userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  const deleted = await deleteCartItemById({
    id: payload.itemId,
    userEmail: payload.userEmail,
  });

  if (!deleted) {
    throw new HTTPException(404, { message: "Cart item not found" });
  }
}
