import { and, desc, eq, or, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../lib/db/drizzle.js";
import { auditLogs, couponCodes, productDiscounts, products } from "../lib/db/schema.js";
import { numberToMoney, moneyToNumber } from "./checkout-utils.js";

type ProductLike = {
  id: string;
  priceUsd: string | number;
  region?: string | null;
  category?: string | null;
  subcategory?: string | null;
};

type ProductDiscountRow = Awaited<ReturnType<typeof listProductDiscountsForAdmin>>[number];

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

function cleanText(value?: string | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function validateDiscountValue(type: "percentage" | "fixed_amount" | "free_shipping", value: number) {
  if (type === "free_shipping") return;
  if (type === "percentage" && (value <= 0 || value > 100)) {
    throw new HTTPException(400, { message: "Percentage discount must be between 1 and 100" });
  }
  if (type === "fixed_amount" && value <= 0) {
    throw new HTTPException(400, { message: "Fixed discount must be greater than 0" });
  }
}

function isNowWithinWindow(row: { status: string; startsAt?: Date | string | null; endsAt?: Date | string | null }, now = new Date()) {
  if (!["active"].includes(row.status)) return false;
  if (row.startsAt && new Date(row.startsAt) > now) return false;
  if (row.endsAt && new Date(row.endsAt) < now) return false;
  return true;
}

function isDiscountLive(row: ProductDiscountRow, now = new Date()) {
  if (row.status !== "active") return false;
  if (row.startsAt && new Date(row.startsAt) > now) return false;
  if (row.endsAt && new Date(row.endsAt) < now) return false;
  if (row.maxRedemptions && row.redemptionCount >= row.maxRedemptions) return false;
  return true;
}

function matchesProduct(row: ProductDiscountRow, product: ProductLike) {
  if (row.scope === "all_products") return true;
  if (row.scope === "product") return row.productId === product.id;
  if (row.scope === "region") return row.region && row.region === product.region;
  if (row.scope === "category") return row.category && row.category === product.category;
  if (row.scope === "subcategory") return row.subcategory && row.subcategory === product.subcategory;
  return false;
}

function calculateDiscountedPrice(price: number, row: ProductDiscountRow) {
  const value = moneyToNumber(row.discountValue);
  if (row.discountType === "percentage") {
    const percent = Math.min(Math.max(value, 0), 100);
    return Math.max(price - price * (percent / 100), 0);
  }
  return Math.max(price - value, 0);
}

export async function listProductDiscountsForAdmin() {
  return db.query.productDiscounts.findMany({
    orderBy: [desc(productDiscounts.createdAt)],
  });
}

export async function listCouponCodesForAdmin() {
  return db.query.couponCodes.findMany({
    orderBy: [desc(couponCodes.createdAt)],
  });
}

export async function getLiveProductDiscounts() {
  const now = new Date();
  return db.query.productDiscounts.findMany({
    where: and(
      eq(productDiscounts.status, "active"),
      or(sql`${productDiscounts.startsAt} IS NULL`, sql`${productDiscounts.startsAt} <= ${now}`),
      or(sql`${productDiscounts.endsAt} IS NULL`, sql`${productDiscounts.endsAt} >= ${now}`),
    ),
    orderBy: [desc(productDiscounts.createdAt)],
  });
}

export function applyBestProductDiscount<T extends ProductLike>(product: T, discounts: ProductDiscountRow[]) {
  const originalPriceUsd = moneyToNumber(product.priceUsd);
  const matched = discounts
    .filter((discount) => isDiscountLive(discount) && matchesProduct(discount, product))
    .map((discount) => {
      const finalPriceUsd = calculateDiscountedPrice(originalPriceUsd, discount);
      return {
        discount,
        originalPriceUsd,
        finalPriceUsd,
        savingsUsd: Math.max(originalPriceUsd - finalPriceUsd, 0),
      };
    })
    .filter((candidate) => candidate.savingsUsd > 0)
    .sort((a, b) => b.savingsUsd - a.savingsUsd)[0];

  if (!matched) {
    return {
      ...product,
      originalPriceUsd: numberToMoney(originalPriceUsd),
      finalPriceUsd: numberToMoney(originalPriceUsd),
      effectivePriceUsd: numberToMoney(originalPriceUsd),
      discount: null,
    };
  }

  const value = moneyToNumber(matched.discount.discountValue);
  return {
    ...product,
    originalPriceUsd: numberToMoney(originalPriceUsd),
    finalPriceUsd: numberToMoney(matched.finalPriceUsd),
    effectivePriceUsd: numberToMoney(matched.finalPriceUsd),
    discount: {
      id: matched.discount.id,
      name: matched.discount.name,
      type: matched.discount.discountType,
      value: matched.discount.discountValue,
      label: matched.discount.discountType === "percentage" ? `${Number(value).toFixed(0)}% OFF` : `$${Number(value).toFixed(2)} OFF`,
      savingsUsd: numberToMoney(matched.savingsUsd),
    },
  };
}

export async function enrichProductsWithDiscounts<T extends ProductLike>(rows: T[]) {
  if (!rows.length) return rows;
  const discounts = await getLiveProductDiscounts();
  return rows.map((row) => applyBestProductDiscount(row, discounts));
}

export async function getEffectiveProductPrice(product: ProductLike) {
  const discounts = await getLiveProductDiscounts();
  return applyBestProductDiscount(product, discounts);
}

export async function calculateCouponDiscount(payload: {
  code?: string | null;
  subtotalUsd: number;
  shippingCostUsd: number;
  orderType: "catalog_order" | "custom_order" | "mixed_order";
  catalogSubtotalUsd?: number;
  customSubtotalUsd?: number;
}) {
  const code = normalizeCode(payload.code ?? "");
  if (!code) {
    return { coupon: null, discountAmountUsd: 0, freeShipping: false };
  }
  const coupon = await db.query.couponCodes.findFirst({ where: eq(couponCodes.code, code) });
  if (!coupon || !isNowWithinWindow(coupon)) {
    throw new HTTPException(400, { message: "Coupon is not active or has expired" });
  }
  if (coupon.usageLimit && coupon.redemptionCount >= coupon.usageLimit) {
    throw new HTTPException(400, { message: "Coupon usage limit has been reached" });
  }
  const eligibleSubtotal = coupon.appliesTo === "catalog_orders"
    ? payload.catalogSubtotalUsd ?? (payload.orderType === "catalog_order" ? payload.subtotalUsd : 0)
    : coupon.appliesTo === "custom_orders"
      ? payload.customSubtotalUsd ?? (payload.orderType === "custom_order" ? payload.subtotalUsd : 0)
      : payload.subtotalUsd;
  if (coupon.appliesTo === "catalog_orders" && eligibleSubtotal <= 0) {
    throw new HTTPException(400, { message: "Coupon requires at least one catalog item" });
  }
  if (coupon.appliesTo === "custom_orders" && eligibleSubtotal <= 0) {
    throw new HTTPException(400, { message: "Coupon requires at least one custom item" });
  }
  const minimum = moneyToNumber(coupon.minimumOrderUsd);
  if (minimum > 0 && eligibleSubtotal < minimum) {
    throw new HTTPException(400, { message: `Coupon requires at least $${minimum.toFixed(2)} in products` });
  }

  let discountAmountUsd = 0;
  let freeShipping = false;
  if (coupon.discountType === "free_shipping") {
    discountAmountUsd = Math.max(payload.shippingCostUsd, 0);
    freeShipping = true;
  } else if (coupon.discountType === "percentage") {
    discountAmountUsd = eligibleSubtotal * (Math.min(moneyToNumber(coupon.discountValue), 100) / 100);
  } else {
    discountAmountUsd = Math.min(moneyToNumber(coupon.discountValue), eligibleSubtotal);
  }
  const maxDiscount = moneyToNumber(coupon.maxDiscountUsd);
  if (maxDiscount > 0) discountAmountUsd = Math.min(discountAmountUsd, maxDiscount);
  discountAmountUsd = Math.min(Math.max(discountAmountUsd, 0), payload.subtotalUsd + payload.shippingCostUsd);

  return { coupon, discountAmountUsd, freeShipping };
}

export async function markCouponRedeemed(couponId?: string | null) {
  if (!couponId) return null;
  const [row] = await db
    .update(couponCodes)
    .set({
      redemptionCount: sql`${couponCodes.redemptionCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(couponCodes.id, couponId))
    .returning();
  return row;
}

export async function createProductDiscountForAdmin(payload: {
  name: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  scope: "all_products" | "product" | "region" | "category" | "subcategory";
  productId?: string | null;
  region?: string | null;
  category?: string | null;
  subcategory?: string | null;
  status?: "draft" | "scheduled" | "active" | "paused" | "expired";
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptions?: number | null;
  internalNote?: string | null;
  performedBy?: string;
}) {
  validateDiscountValue(payload.discountType, payload.discountValue);
  if (payload.scope === "product" && !payload.productId) throw new HTTPException(400, { message: "Product is required for product scope" });
  if (payload.scope === "region" && !cleanText(payload.region)) throw new HTTPException(400, { message: "Region is required for region scope" });
  if (payload.scope === "category" && !cleanText(payload.category)) throw new HTTPException(400, { message: "Category is required for category scope" });
  if (payload.scope === "subcategory" && !cleanText(payload.subcategory)) throw new HTTPException(400, { message: "Subcategory is required for subcategory scope" });

  const [row] = await db.insert(productDiscounts).values({
    name: payload.name.trim(),
    discountType: payload.discountType,
    discountValue: numberToMoney(payload.discountValue),
    scope: payload.scope,
    productId: payload.scope === "product" ? payload.productId ?? null : null,
    region: payload.scope === "region" ? cleanText(payload.region) : null,
    category: payload.scope === "category" ? cleanText(payload.category) : null,
    subcategory: payload.scope === "subcategory" ? cleanText(payload.subcategory) : null,
    status: payload.status ?? "draft",
    startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
    endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
    maxRedemptions: payload.maxRedemptions ?? null,
    internalNote: payload.internalNote ?? null,
  }).returning();

  await db.insert(auditLogs).values({
    action: "product_discount_created",
    category: "finance",
    severity: "info",
    entityType: "product_discount",
    entityId: row.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin created product discount",
    metadata: { name: row.name, scope: row.scope, discount_type: row.discountType, discount_value: row.discountValue },
  });

  return row;
}

export async function updateProductDiscountForAdmin(id: string, payload: Partial<{
  name: string;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  scope: "all_products" | "product" | "region" | "category" | "subcategory";
  productId: string | null;
  region: string | null;
  category: string | null;
  subcategory: string | null;
  status: "draft" | "scheduled" | "active" | "paused" | "expired";
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  internalNote: string | null;
}> & { performedBy?: string }) {
  if (payload.discountType && payload.discountValue !== undefined) {
    validateDiscountValue(payload.discountType, payload.discountValue);
  }
  const [row] = await db.update(productDiscounts).set({
    name: payload.name,
    discountType: payload.discountType,
    discountValue: payload.discountValue === undefined ? undefined : numberToMoney(payload.discountValue),
    scope: payload.scope,
    productId: payload.productId,
    region: payload.region,
    category: payload.category,
    subcategory: payload.subcategory,
    status: payload.status,
    startsAt: payload.startsAt === undefined ? undefined : payload.startsAt ? new Date(payload.startsAt) : null,
    endsAt: payload.endsAt === undefined ? undefined : payload.endsAt ? new Date(payload.endsAt) : null,
    maxRedemptions: payload.maxRedemptions,
    internalNote: payload.internalNote,
    updatedAt: new Date(),
  }).where(eq(productDiscounts.id, id)).returning();

  if (!row) throw new HTTPException(404, { message: "Product discount not found" });
  await db.insert(auditLogs).values({
    action: "product_discount_updated",
    category: "finance",
    severity: "info",
    entityType: "product_discount",
    entityId: row.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin updated product discount",
    metadata: { status: row.status },
  });
  return row;
}

export async function createCouponCodeForAdmin(payload: {
  code: string;
  name: string;
  discountType: "percentage" | "fixed_amount" | "free_shipping";
  discountValue: number;
  appliesTo: "all_orders" | "catalog_orders" | "custom_orders";
  minimumOrderUsd?: number | null;
  maxDiscountUsd?: number | null;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  status?: "draft" | "scheduled" | "active" | "paused" | "expired" | "used_up";
  startsAt?: string | null;
  endsAt?: string | null;
  internalNote?: string | null;
  performedBy?: string;
}) {
  validateDiscountValue(payload.discountType, payload.discountValue);
  const [row] = await db.insert(couponCodes).values({
    code: normalizeCode(payload.code),
    name: payload.name.trim(),
    discountType: payload.discountType,
    discountValue: numberToMoney(payload.discountType === "free_shipping" ? 0 : payload.discountValue),
    appliesTo: payload.appliesTo,
    minimumOrderUsd: payload.minimumOrderUsd == null ? null : numberToMoney(payload.minimumOrderUsd),
    maxDiscountUsd: payload.maxDiscountUsd == null ? null : numberToMoney(payload.maxDiscountUsd),
    usageLimit: payload.usageLimit ?? null,
    perCustomerLimit: payload.perCustomerLimit ?? 1,
    status: payload.status ?? "draft",
    startsAt: payload.startsAt ? new Date(payload.startsAt) : null,
    endsAt: payload.endsAt ? new Date(payload.endsAt) : null,
    internalNote: payload.internalNote ?? null,
  }).returning();

  await db.insert(auditLogs).values({
    action: "coupon_code_created",
    category: "finance",
    severity: "info",
    entityType: "coupon_code",
    entityId: row.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin created coupon code",
    metadata: { code: row.code, applies_to: row.appliesTo },
  });
  return row;
}

export async function updateCouponCodeForAdmin(id: string, payload: Partial<{
  code: string;
  name: string;
  discountType: "percentage" | "fixed_amount" | "free_shipping";
  discountValue: number;
  appliesTo: "all_orders" | "catalog_orders" | "custom_orders";
  minimumOrderUsd: number | null;
  maxDiscountUsd: number | null;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  status: "draft" | "scheduled" | "active" | "paused" | "expired" | "used_up";
  startsAt: string | null;
  endsAt: string | null;
  internalNote: string | null;
}> & { performedBy?: string }) {
  if (payload.discountType && payload.discountValue !== undefined) {
    validateDiscountValue(payload.discountType, payload.discountValue);
  }

  const discountType = payload.discountType;
  const [row] = await db.update(couponCodes).set({
    code: payload.code === undefined ? undefined : normalizeCode(payload.code),
    name: payload.name === undefined ? undefined : payload.name.trim(),
    discountType,
    discountValue: payload.discountValue === undefined
      ? undefined
      : numberToMoney(discountType === "free_shipping" ? 0 : payload.discountValue),
    appliesTo: payload.appliesTo,
    minimumOrderUsd: payload.minimumOrderUsd === undefined ? undefined : payload.minimumOrderUsd == null ? null : numberToMoney(payload.minimumOrderUsd),
    maxDiscountUsd: payload.maxDiscountUsd === undefined ? undefined : payload.maxDiscountUsd == null ? null : numberToMoney(payload.maxDiscountUsd),
    usageLimit: payload.usageLimit,
    perCustomerLimit: payload.perCustomerLimit === undefined ? undefined : payload.perCustomerLimit ?? 1,
    status: payload.status,
    startsAt: payload.startsAt === undefined ? undefined : payload.startsAt ? new Date(payload.startsAt) : null,
    endsAt: payload.endsAt === undefined ? undefined : payload.endsAt ? new Date(payload.endsAt) : null,
    internalNote: payload.internalNote,
    updatedAt: new Date(),
  }).where(eq(couponCodes.id, id)).returning();

  if (!row) throw new HTTPException(404, { message: "Coupon code not found" });
  await db.insert(auditLogs).values({
    action: "coupon_code_updated",
    category: "finance",
    severity: "info",
    entityType: "coupon_code",
    entityId: row.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin updated coupon code",
    metadata: { code: row.code, status: row.status },
  });
  return row;
}

export async function getDiscountWorkspacePayload() {
  const [productDiscountRows, couponRows, productRows] = await Promise.all([
    listProductDiscountsForAdmin(),
    listCouponCodesForAdmin(),
    db.query.products.findMany({ orderBy: [desc(products.createdAt)], limit: 200 }),
  ]);
  return { productDiscounts: productDiscountRows, coupons: couponRows, products: productRows };
}
