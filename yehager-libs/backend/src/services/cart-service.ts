import { HTTPException } from "hono/http-exception";
import {
  createCartItem,
  deleteCartItemById,
  listCartItemsByUserEmail,
  updateCartItemQuantity,
} from "../repositories/cart-repository.js";
import { getMeasurementForUser } from "../repositories/measurements-repository.js";
import { getActiveProductById } from "../repositories/products-repository.js";
import { getUserByEmail } from "../repositories/users-repository.js";

type CartProductRole = { label: string; icon?: string; price: number; gender: "male" | "female" | "unisex" };

function getProductRoles(product: Awaited<ReturnType<typeof getActiveProductById>>): CartProductRole[] {
  if (!product) return [];
  if (product.familyRoles?.length) return product.familyRoles;

  const name = `${product.name} ${product.category ?? ""}`.toLowerCase();
  const price = Number(product.priceUsd);
  const isFamilyOutfit = name.includes("family") || Boolean(product.groomPriceUsd) || product.isCouple;
  if (!isFamilyOutfit || !Number.isFinite(price)) return [];

  const menPrice = Number(product.groomPriceUsd ?? 0) > 0 ? Number(product.groomPriceUsd) : Math.max(1, Math.round(price * 0.57));
  const kidsPrice = Math.max(1, Math.round(price * 0.43));
  return [
    { label: "Women", icon: "👩", price, gender: "female" },
    { label: "Men", icon: "👨", price: menPrice, gender: "male" },
    { label: "Kids", icon: "👧", price: kidsPrice, gender: "unisex" },
  ];
}

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
  roleLabel?: string;
}) {
  if (!payload.userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  if (payload.quantity <= 0) {
    throw new HTTPException(400, { message: "Quantity must be greater than zero" });
  }

  const product = await getActiveProductById(payload.productId);
  if (!product) {
    throw new HTTPException(404, { message: "Product not found" });
  }

  const user = await getUserByEmail(payload.userEmail);
  const availableRoles = getProductRoles(product);
  const selectedRole = payload.roleLabel
    ? availableRoles.find((role) => role.label === payload.roleLabel)
    : undefined;
  if (payload.roleLabel && !selectedRole) {
    throw new HTTPException(400, { message: "Selected product role is not available" });
  }

  const measurement = payload.measurementId
    ? await getMeasurementForUser({
      id: payload.measurementId,
      userEmail: payload.userEmail,
      userId: user?.id,
    })
    : undefined;

  if (payload.measurementId) {
    if (!measurement) {
      throw new HTTPException(400, { message: "Measurement not found or does not belong to this account" });
    }
  }

  const item = await createCartItem({
    userId: user?.id,
    userEmail: payload.userEmail,
    productId: product.id,
    productName: selectedRole ? `${product.name} — ${selectedRole.label}` : product.name,
    productImage: product.images?.[0],
    priceUsd: selectedRole ? selectedRole.price.toFixed(2) : product.priceUsd,
    quantity: payload.quantity,
    measurementId: payload.measurementId,
    measurementSnapshot: measurement
      ? {
          chest: measurement.chest,
          waist: measurement.waist,
          hips: measurement.hips,
          shoulderWidth: measurement.shoulderWidth,
          armLength: measurement.armLength,
          torsoLength: measurement.torsoLength,
        }
      : undefined,
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
