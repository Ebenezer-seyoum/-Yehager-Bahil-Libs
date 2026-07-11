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
import { db } from "../lib/db/drizzle.js";
import { profitCostSettings } from "../lib/db/schema.js";
import { and, eq } from "drizzle-orm";
import { getEffectiveProductPrice } from "./discounts-service.js";

type CartProductRole = {
  label: string;
  icon?: string;
  price: number;
  gender: "male" | "female" | "unisex";
  customerType?: "woman" | "man" | "girl" | "boy";
  outfitOption?: "standard" | "full_set" | "top_only" | "pants_only";
  description?: string;
  designerCostUsd?: number;
  taxPercent?: number;
  otherCostUsd?: number;
};

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

async function getProductCostFallback(productId: string) {
  const setting = await db.query.profitCostSettings.findFirst({
    where: and(eq(profitCostSettings.entityType, "product"), eq(profitCostSettings.entityId, productId)),
  });
  return {
    designerCostUsd: Number(setting?.designerCostUsd ?? 0),
    taxPercent: Number(setting?.taxPercent ?? 0),
    otherCostUsd: Number(setting?.otherCostUsd ?? 0),
  };
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
  measurementSnapshot?: Record<string, unknown>;
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
  const pricedProduct = await getEffectiveProductPrice(product);
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

  const fallbackCost = await getProductCostFallback(product.id);
  const roleCostSnapshot = selectedRole
    ? {
        role_label: selectedRole.label,
        role_gender: selectedRole.gender,
        customer_type: selectedRole.customerType,
        outfit_option: selectedRole.outfitOption,
        option_description: selectedRole.description,
        selling_price_usd: selectedRole.price.toFixed(2),
        designer_cost_usd: Number(selectedRole.designerCostUsd ?? fallbackCost.designerCostUsd).toFixed(2),
        tax_percent: Number(selectedRole.taxPercent ?? fallbackCost.taxPercent).toFixed(4),
        other_cost_usd: Number(selectedRole.otherCostUsd ?? fallbackCost.otherCostUsd).toFixed(2),
      }
    : {
        selling_price_usd: Number(pricedProduct.effectivePriceUsd ?? product.priceUsd).toFixed(2),
        designer_cost_usd: fallbackCost.designerCostUsd.toFixed(2),
        tax_percent: fallbackCost.taxPercent.toFixed(4),
        other_cost_usd: fallbackCost.otherCostUsd.toFixed(2),
      };

  const item = await createCartItem({
    userId: user?.id,
    userEmail: payload.userEmail,
    productId: product.id,
    productName: selectedRole ? `${product.name} — ${selectedRole.label}` : product.name,
    productImage: product.images?.[0],
    priceUsd: selectedRole ? selectedRole.price.toFixed(2) : pricedProduct.effectivePriceUsd,
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
          inseam: measurement.inseam,
          neck: measurement.neck,
          ...(measurement.measurementDetails ?? {}),
        }
      : payload.measurementSnapshot
        ? payload.measurementSnapshot
      : undefined,
    eventId: payload.eventId,
    eventName: payload.eventName,
    itemMetadata: {
      pricing_snapshot: roleCostSnapshot,
    },
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
