import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../../middleware/auth.js";
import { requireAnyPermission, requirePermission } from "../../middleware/permissions.js";
import { db } from "../../lib/db/drizzle.js";
import { auditLogs, globalPricingRules, homepageSections, orders, products, profitCostSettings, systemAlerts, uploadedDesigns } from "../../lib/db/schema.js";
import {
  employeeOnboardingCredentialsSchema,
  strongPasswordSchema,
  temporaryPasswordSchema,
} from "../../lib/auth/password-policy.js";
import { USER_ROLES } from "../../lib/auth/roles.js";
import { PERMISSIONS } from "../../lib/auth/permissions.js";
import { DEFAULT_OTHER_SIZE_OPTIONS, isOtherProduct } from "../../lib/products/product-types.js";
import {
  assignEmployeeAccessForAdmin,
  createEmployeeForAdmin,
  createCustomerForAdmin,
  deleteCustomerForAdmin,
  deleteUserForAdmin,
  getCustomerActivityForAdmin,
  getCustomerDetailForAdmin,
  getEmployeeDetailForAdmin,
  listCustomerMeasurementsForAdmin,
  listCustomersForAdmin,
  listUsersForAdmin,
  resetCustomerPasswordForAdmin,
  resetEmployeePasswordForAdmin,
  sendPasswordResetLinkForAdmin,
  updateCustomerProfileForAdmin,
  updateCustomerStatusForAdmin,
  updateUserProfileForAdminService,
  updateRoleForAdmin as updateUserRoleForAdmin,
  updateUserStatusForAdmin,
} from "../../services/users-service.js";
import { createRoleForAdmin, deleteRoleForAdmin, listRolesForAdmin, updateRoleForAdmin, updateRolePermissionsForAdmin } from "../../services/roles-service.js";
import { deletePermissionForAdmin, getEffectivePermissionsForUser, listPermissionsForAdmin, updatePermissionForAdmin, updateUserPermissionsForAdmin } from "../../services/permissions-service.js";
import { getOrderReport, toOrderReportCsv } from "../../services/reports-service.js";
import { getReportsCenterPayload } from "../../services/reports-center-service.js";
import {
  createCouponCodeForAdmin,
  createProductDiscountForAdmin,
  getDiscountWorkspacePayload,
  updateCouponCodeForAdmin,
  updateProductDiscountForAdmin,
} from "../../services/discounts-service.js";
import { getCustomerCreditWorkspacePayload, updateCustomerCreditRuleForAdmin } from "../../services/customer-credits-service.js";
import { getProfitCostsWorkspacePayload, upsertProfitCostSettingForAdmin } from "../../services/profit-costs-service.js";
import { getUsdEtbRate } from "../../repositories/exchange-rates-repository.js";
import { deleteOrderForAdmin } from "../../services/orders-service.js";
import { refreshStripeReceiptForOrder } from "../../services/payments-service.js";
import type { AppBindings } from "../../types/hono.js";
3
import { logger } from "../../lib/logger.js";
import { approvalKeyboard, calculateProductFamilyRoles, designerEstimateCaption, editTelegramMessage, sendTelegramProduct, updateEstimatedPrices } from "../../services/telegram-pricing-service.js";
import {
  GLOBAL_PRICING_RULE_DEFINITIONS,
  GLOBAL_PRICING_RULE_KEYS,
  pricingRuleScopeKey,
  resolveEffectivePricingRuleValues,
  type PricingRuleScope,
} from "../../services/global-pricing-rules.js";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

const alertParamSchema = z.object({
  alertId: z.string().uuid(),
});

const resolveAlertSchema = z.object({
  isResolved: z.boolean().optional(),
});
const productParamSchema = z.object({
  productId: z.string().uuid(),
});
const productImageSchema = z.union([z.string().url(), z.string().startsWith("/uploads/")]);
const productFamilyRoleSchema = z.object({
  label: z.string().trim().min(1).max(80),
  icon: z.string().trim().max(16).optional(),
  price: z.coerce.number().positive(),
  currency: z.enum(["USD", "ETB"]).optional(),
  gender: z.enum(["male", "female", "unisex"]),
  customerType: z.enum(["woman", "man", "girl", "boy"]).optional(),
  outfitOption: z.enum(["standard", "full_set", "top_only", "pants_only"]).optional(),
  description: z.string().trim().max(160).optional(),
  designerCostUsd: z.coerce.number().nonnegative().optional(),
  taxPercent: z.coerce.number().nonnegative().optional(),
  otherCostUsd: z.coerce.number().nonnegative().optional(),
});
const productPatchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  region: z.string().trim().min(1).optional(),
  subcategory: z.string().trim().optional(),
  category: z.string().trim().optional(),
  sizeOptions: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  priceUsd: z.coerce.number().positive().optional(),
  baseCurrency: z.enum(["USD", "ETB"]).optional(),
  groomPriceUsd: z.coerce.number().positive().nullable().optional(),
  familyRoles: z.array(productFamilyRoleSchema).nullable().optional(),
  uniqueId: z.string().trim().min(1).optional(),
  gender: z.enum(["male", "female", "unisex"]).optional(),
  fabricType: z.string().trim().optional(),
  embroideryStyle: z.string().trim().optional(),
  tailoringDays: z.coerce.number().int().positive().optional(),
  images: z.array(productImageSchema).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sendToTelegram: z.boolean().optional(),
  priceStatus: z.enum(["draft", "waiting_price", "submitted", "pending_approval", "approved", "rejected", "published"]).optional(),
  telegramStatus: z.enum(["not_sent", "sent", "waiting_price", "submitted", "approved", "rejected"]).optional(),
  priceDeadline: z.coerce.date().nullable().optional(),
  designerCostUsd: z.coerce.number().nonnegative().optional(),
  taxPercent: z.coerce.number().nonnegative().optional(),
  otherCostUsd: z.coerce.number().nonnegative().optional(),
});
const estimatedPricesSchema = z.object({
  men: z.coerce.number().finite().nonnegative(),
  woman: z.coerce.number().finite().nonnegative(),
  boy: z.coerce.number().finite().nonnegative(),
  girl: z.coerce.number().finite().nonnegative(),
});
const estimatedPriceDecisionParamSchema = productParamSchema.extend({
  decision: z.enum(["approve", "decline"]),
});

async function normalizeProductPrice(amount: number, currency: "USD" | "ETB") {
  if (currency === "USD") return { priceUsd: amount, exchangeRate: 1 };
  const rateRow = await getUsdEtbRate(db);
  const rate = Number(rateRow?.rate ?? 0);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new HTTPException(400, { message: "A valid USD to ETB exchange rate is required before saving an ETB price." });
  }
  return { priceUsd: amount / rate, exchangeRate: rate };
}

async function normalizeFamilyRoles(roles: z.infer<typeof productFamilyRoleSchema>[] | null | undefined) {
  if (!roles) return roles;
  return Promise.all(roles.map(async (role) => {
    const currency = role.currency ?? "USD";
    const normalized = await normalizeProductPrice(role.price, currency);
    return {
      ...role,
      price: normalized.priceUsd,
      currency,
      enteredPrice: role.price,
      exchangeRate: normalized.exchangeRate,
    };
  }));
}
const createProductSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  region: z.string().trim().min(1),
  subcategory: z.string().trim().optional(),
  category: z.string().trim().optional(),
  sizeOptions: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  priceUsd: z.coerce.number().positive(),
  baseCurrency: z.enum(["USD", "ETB"]).default("USD"),
  groomPriceUsd: z.coerce.number().positive().nullable().optional(),
  familyRoles: z.array(productFamilyRoleSchema).nullable().optional(),
  uniqueId: z.string().trim().min(1).optional(),
  gender: z.enum(["male", "female", "unisex"]),
  fabricType: z.string().trim().optional(),
  embroideryStyle: z.string().trim().optional(),
  tailoringDays: z.coerce.number().int().positive().optional(),
  images: z.array(productImageSchema).default([]),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sendToTelegram: z.boolean().optional(),
  priceStatus: z.enum(["draft", "waiting_price", "submitted", "pending_approval", "approved", "rejected", "published"]).optional(),
  priceDeadline: z.coerce.date().nullable().optional(),
  designerCostUsd: z.coerce.number().nonnegative(),
  taxPercent: z.coerce.number().nonnegative(),
  otherCostUsd: z.coerce.number().nonnegative(),
});
const productDiscountParamSchema = z.object({
  discountId: z.string().uuid(),
});
const couponParamSchema = z.object({
  couponId: z.string().uuid(),
});
const productDiscountSchema = z.object({
  name: z.string().trim().min(1).max(180),
  discountType: z.enum(["percentage", "fixed_amount"]),
  discountValue: z.coerce.number().positive(),
  scope: z.enum(["all_products", "product", "region", "category", "subcategory"]),
  productId: z.string().uuid().nullable().optional(),
  region: z.string().trim().nullable().optional(),
  category: z.string().trim().nullable().optional(),
  subcategory: z.string().trim().nullable().optional(),
  status: z.enum(["draft", "scheduled", "active", "paused", "expired"]).optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  maxRedemptions: z.coerce.number().int().positive().nullable().optional(),
  internalNote: z.string().trim().max(1000).nullable().optional(),
});
const productDiscountPatchSchema = productDiscountSchema.partial();
const couponCodeSchema = z.object({
  code: z.string().trim().min(2).max(64),
  name: z.string().trim().min(1).max(180),
  discountType: z.enum(["percentage", "fixed_amount", "free_shipping"]),
  discountValue: z.coerce.number().nonnegative(),
  appliesTo: z.enum(["all_orders", "catalog_orders", "custom_orders"]),
  minimumOrderUsd: z.coerce.number().nonnegative().nullable().optional(),
  maxDiscountUsd: z.coerce.number().nonnegative().nullable().optional(),
  usageLimit: z.coerce.number().int().positive().nullable().optional(),
  perCustomerLimit: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["draft", "scheduled", "active", "paused", "expired", "used_up"]).optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  internalNote: z.string().trim().max(1000).nullable().optional(),
});
const couponCodePatchSchema = couponCodeSchema.partial();
const customerCreditRuleSchema = z.object({
  ruleId: z.string().uuid().nullable().optional(),
  name: z.string().trim().max(180).nullable().optional(),
  minimumPaidUsd: z.coerce.number().positive(),
  rewardUsd: z.coerce.number().positive(),
  appliesTo: z.enum(["all_orders", "catalog_orders", "custom_orders", "other_orders"]),
  status: z.enum(["active", "inactive"]),
  internalNote: z.string().trim().max(1000).nullable().optional(),
});
const profitCostSettingSchema = z.object({
  entityType: z.enum(["default", "product", "custom_order"]),
  entityId: z.string().nullable().optional(),
  productCostUsd: z.coerce.number().nonnegative(),
  taxPercent: z.coerce.number().nonnegative(),
  designerCostUsd: z.coerce.number().nonnegative(),
  otherCostUsd: z.coerce.number().nonnegative(),
  designerPaymentPolicy: z.enum(["none", "fifty_fifty", "paid_100"]).optional(),
  designerPaymentStatus: z.enum(["unpaid", "advance_paid", "fully_paid"]).optional(),
  designerPaidUsd: z.coerce.number().nonnegative().optional(),
  internalNote: z.string().trim().max(1000).nullable().optional(),
});
const orderParamSchema = z.object({
  orderId: z.string().uuid(),
});
const documentSchema = z.object({
  type: z.enum(["pickup_id", "pickup_signed", "pickup_proof", "shipping_doc"]),
  url: z.string().url(),
  label: z.string().optional(),
});
const deleteDocumentSchema = z.object({
  index: z.coerce.number().int().nonnegative(),
});
const adminCreatedUserBaseSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(320),
  roleId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  accountStatus: z.enum(["active", "invited", "pending"]).optional(),
  phone: z.string().trim().min(1).max(50).optional(),
  avatarUrl: z.string().trim().url().optional(),
  profile: z
    .object({
      firstName: z.string().trim().min(1).max(120),
      fatherName: z.string().trim().min(1).max(120),
      grandfatherName: z.string().trim().max(120).optional(),
      gender: z.string().trim().min(1).max(20),
      dateOfBirth: z.string().trim().optional(),
      maritalStatus: z.string().trim().optional(),
      country: z.string().trim().optional(),
      city: z.string().trim().optional(),
      address: z.string().trim().optional(),
      employmentType: z.string().trim().optional(),
      startDate: z.string().trim().optional(),
      inviteStatus: z.string().trim().optional(),
      notes: z.string().trim().optional(),
    })
    .optional(),
});
const createEmployeeSchema = adminCreatedUserBaseSchema.and(employeeOnboardingCredentialsSchema);
const createCustomerSchema = adminCreatedUserBaseSchema.extend({
  password: strongPasswordSchema,
});
const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(500).optional(),
  color: z.string().trim().max(50).optional().nullable(),
  icon: z.string().trim().max(50).optional().nullable(),
});
const userParamSchema = z.object({
  userId: z.string().uuid(),
});
const rolePatchSchema = z.object({
  role: z.enum(USER_ROLES),
});
const reportsQuerySchema = z.object({
  category: z.string().optional(),
  report: z.string().optional(),
  dateRange: z.enum(["Today", "Last 7 Days", "Last 30 Days", "This Month", "This Year"]).optional(),
  status: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  customer: z.string().optional(),
  employee: z.string().optional(),
  driver: z.string().optional(),
  product: z.string().optional(),
  productCategory: z.string().optional(),
  refundStatus: z.string().optional(),
  ticketStatus: z.string().optional(),
  priority: z.string().optional(),
  search: z.string().optional(),
  amountMin: z.coerce.number().optional(),
  amountMax: z.coerce.number().optional(),
  stockLevel: z.string().optional(),
});
const userProfilePatchSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().min(1).max(50).optional().nullable(),
  address: z.string().trim().max(1000).optional().nullable(),
  country: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  accountStatus: z.enum(["active", "invited", "pending"]).optional(),
  avatarUrl: z.string().trim().url().optional().nullable(),
  profile: z
    .object({
      firstName: z.string().trim().min(1).max(120).optional(),
      fatherName: z.string().trim().min(1).max(120).optional(),
      grandfatherName: z.string().trim().max(120).optional().nullable(),
      gender: z.string().trim().min(1).max(20).optional(),
      dateOfBirth: z.string().trim().optional().nullable(),
      maritalStatus: z.string().trim().optional().nullable(),
      country: z.string().trim().optional().nullable(),
      city: z.string().trim().optional().nullable(),
      address: z.string().trim().optional().nullable(),
      employmentType: z.string().trim().optional().nullable(),
      startDate: z.string().trim().optional().nullable(),
      inviteStatus: z.string().trim().optional().nullable(),
      notes: z.string().trim().optional().nullable(),
    })
    .optional(),
}).refine((value) => Boolean(value.name || value.email || value.phone || value.address || value.country || value.city || value.notes || value.accountStatus || value.avatarUrl || value.profile), {
  message: "At least one field must be provided",
});
const userStatusPatchSchema = z.object({
  status: z.enum(["active", "inactive"]),
});
const userPasswordResetSchema = z.object({
  password: strongPasswordSchema,
});
const employeeTemporaryPasswordSchema = z.object({
  password: temporaryPasswordSchema,
});
const roleIdParamSchema = z.object({
  roleId: z.string().uuid(),
});
const permissionIdParamSchema = z.object({
  permissionId: z.string().uuid(),
});
const roleUpdateSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(500).optional().nullable(),
  color: z.string().trim().max(50).optional().nullable(),
  icon: z.string().trim().max(50).optional().nullable(),
});
const rolePermissionsPatchSchema = z.object({
  permissions: z.array(z.string().trim().min(1)).max(100),
});
const employeeAccessPatchSchema = z.object({
  roleId: z.string().uuid().nullable().optional(),
  permissions: z.array(z.string().trim().min(1)).max(100).optional(),
});
const homepageCollectionSchema = z.object({
  id: z.string().trim().min(1).max(160),
  name: z.string().trim().min(1).max(160),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
const homepageSectionPayloadSchema = z.object({
  name: z.string().trim().min(1).max(160),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  collections: z.array(homepageCollectionSchema).max(80).optional(),
  subsections: z.array(homepageCollectionSchema).max(80).optional(),
});
const homepageSectionParamSchema = z.object({
  sectionId: z.string().uuid(),
});
const permissionUpdateSchema = z.object({
  key: z.string().trim().min(1).max(150),
  resource: z.string().trim().min(1).max(100),
  action: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().nullable(),
});
const orderReportQuerySchema = z.object({
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  customer: z.string().optional(),
  country: z.string().optional(),
});

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 150);
}

export const adminRouter = new Hono<AppBindings>();

adminRouter.use("/*", requireAuth);

adminRouter.get("/alerts", requirePermission(PERMISSIONS.ALERTS_VIEW), zValidator("query", listQuerySchema), async (c) => {
  const { limit } = c.req.valid("query");
  const data = await db.query.systemAlerts.findMany({
    orderBy: [desc(systemAlerts.createdAt)],
    limit: limit ?? 100,
  });
  return c.json({ data });
});

adminRouter.patch("/alerts/mark-all-read", requirePermission(PERMISSIONS.ALERTS_MANAGE), async (c) => {
  const authUser = c.get("authUser");
  const rows = await db
    .update(systemAlerts)
    .set({
      isResolved: true,
      resolvedBy: authUser?.email ?? "admin",
      updatedAt: new Date(),
    })
    .where(eq(systemAlerts.isResolved, false))
    .returning();

  return c.json({ data: rows, count: rows.length });
});

adminRouter.patch("/alerts/:alertId", requirePermission(PERMISSIONS.ALERTS_MANAGE), zValidator("param", alertParamSchema), zValidator("json", resolveAlertSchema), async (c) => {
  const authUser = c.get("authUser");
  const { alertId } = c.req.valid("param");
  const body = c.req.valid("json");
  const isResolved = body.isResolved ?? true;

  const [row] = await db
    .update(systemAlerts)
    .set({
      isResolved,
      resolvedBy: isResolved ? authUser?.email ?? "admin" : null,
      updatedAt: new Date(),
    })
    .where(eq(systemAlerts.id, alertId))
    .returning();

  if (!row) {
    throw new HTTPException(404, { message: "Alert not found" });
  }

  return c.json({ data: row });
});

adminRouter.get("/summary-counts", requirePermission(PERMISSIONS.ALERTS_VIEW), async (c) => {
  const unresolvedAlerts = await db.query.systemAlerts.findMany({
    where: eq(systemAlerts.isResolved, false),
  });
  const orderRows = await db.query.orders.findMany({
    orderBy: [desc(orders.createdAt)],
    limit: 200,
  });
  const designRows = await db.query.uploadedDesigns.findMany({
    orderBy: [desc(uploadedDesigns.createdAt)],
    limit: 200,
  });
  const orderById = new Map(orderRows.map((order) => [String(order.id), order]));

  const customRequestTypes = new Set(["custom_design_submitted", "design_review"]);
  const customOrderTypes = new Set(["new_custom_order"]);
  const catalogTypes = new Set(["new_catalog_order"]);
  const refundTypes = new Set(["refund_issue", "refund_requested", "return_refund", "refund_pending"]);
  const shippingTypes = new Set(["shipping_delivery_ready"]);
  const catalogPriceTypes = new Set(["catalog_price_submitted"]);

  const counts = {
    payment: 0,
    custom_request: 0,
    custom_order: 0,
    catalog_order: 0,
    refund_issue: 0,
    shipping_delivery: 0,
    catalog_price_submission: 0,
    total: 0,
    paymentIds: [] as string[],
    customRequestIds: [] as string[],
    customOrderIds: [] as string[],
    catalogOrderIds: [] as string[],
    refundIssueIds: [] as string[],
    shippingDeliveryIds: [] as string[],
    catalogPriceProductIds: [] as string[],
  };

  function orderHasUploadedDesign(order: typeof orderRows[number] | null | undefined) {
    if (!order || !Array.isArray(order.items)) return false;
    return order.items.some((item) => {
      if (!item || typeof item !== "object") return false;
      const row = item as Record<string, unknown>;
      return Boolean(row.uploaded_design_id || row.uploadedDesignId || row.item_type === "custom_design" || row.itemType === "custom_design");
    });
  }

  function isCustomOrder(order: typeof orderRows[number] | null | undefined) {
    const orderType = String(order?.orderType ?? "catalog_order");
    if (orderType === "custom_order" || orderType === "custom_design_order" || orderType === "mixed_order") return true;
    if (orderType === "group_order") return orderHasUploadedDesign(order);
    return false;
  }

  function isCatalogOrder(order: typeof orderRows[number] | null | undefined) {
    if (!order) return false;
    const orderType = String(order.orderType ?? "catalog_order");
    if (orderType === "catalog_order" || orderType === "mixed_order") return true;
    if (!Array.isArray(order.items)) return false;
    return order.items.some((item) => {
      if (!item || typeof item !== "object") return false;
      const row = item as Record<string, unknown>;
      return !Boolean(row.uploaded_design_id || row.uploadedDesignId || row.item_type === "custom_design" || row.itemType === "custom_design");
    });
  }

  function orderNeedsReview(order: typeof orderRows[number]) {
    return ["pending", "processing"].includes(String(order.status ?? "").toLowerCase()) ||
      String(order.paymentStatus ?? "").toLowerCase() === "awaiting_verification";
  }

  function hasPaymentRecord(order: typeof orderRows[number]) {
    return Boolean(order.paymentStatus || order.paymentMethod || order.paymentCurrency);
  }

  function isDeliveryReady(order: typeof orderRows[number]) {
    const status = String(order.status ?? "").toLowerCase();
    const deliveryStatus = String(order.deliveryStatus ?? "not_started").toLowerCase();
    return ["fulfilled", "shipped", "ready_for_pickup", "delivered"].includes(status) || deliveryStatus !== "not_started";
  }

  const customRequestRows = designRows.filter((design) =>
    ["submitted", "in_review", "under_review", "needs_changes"].includes(String(design.status ?? "").toLowerCase()),
  );
  const customOrderRows = orderRows.filter((order) => isCustomOrder(order) && orderNeedsReview(order));
  const catalogOrderRows = orderRows.filter((order) => isCatalogOrder(order) && orderNeedsReview(order));
  const paymentRows = orderRows.filter((order) => hasPaymentRecord(order));
  const shippingDeliveryRows = orderRows.filter(isDeliveryReady);

  counts.custom_request = customRequestRows.length;
  counts.customRequestIds = customRequestRows.map((design) => String(design.id));
  counts.custom_order = customOrderRows.length;
  counts.customOrderIds = customOrderRows.map((order) => String(order.id));
  counts.catalog_order = catalogOrderRows.length;
  counts.catalogOrderIds = catalogOrderRows.map((order) => String(order.id));
  counts.payment = paymentRows.length;
  counts.paymentIds = paymentRows.map((order) => String(order.id));
  counts.shipping_delivery = shippingDeliveryRows.length;
  counts.shippingDeliveryIds = shippingDeliveryRows.map((order) => String(order.id));

  unresolvedAlerts.forEach((alert) => {
    const entityId = alert.entityId ? String(alert.entityId) : null;
    const order = entityId ? orderById.get(entityId) : null;
    const type = String(alert.type ?? "");

    if (catalogPriceTypes.has(type)) {
      counts.catalog_price_submission++;
      if (entityId && !counts.catalogPriceProductIds.includes(entityId)) {
        counts.catalogPriceProductIds.push(entityId);
      }
      return;
    }

    if (customRequestTypes.has(type)) {
      if (entityId && !counts.customRequestIds.includes(entityId)) {
        counts.custom_request++;
        counts.customRequestIds.push(entityId);
      }
      return;
    }
    if (customOrderTypes.has(type)) {
      if (entityId && !counts.customOrderIds.includes(entityId)) {
        counts.custom_order++;
        counts.customOrderIds.push(entityId);
      }
      return;
    }
    if (refundTypes.has(type)) {
      counts.refund_issue++;
      if (entityId) counts.refundIssueIds.push(entityId);
      return;
    }
    if (shippingTypes.has(type)) {
      if (entityId && !counts.shippingDeliveryIds.includes(entityId)) {
        counts.shipping_delivery++;
        counts.shippingDeliveryIds.push(entityId);
      }
      return;
    }
    if (catalogTypes.has(type)) {
      if (entityId && !counts.catalogOrderIds.includes(entityId)) {
        counts.catalog_order++;
        counts.catalogOrderIds.push(entityId);
      }
      return;
    }
    if (type === "new_order" && entityId) {
      const targetIds = isCustomOrder(order) ? counts.customOrderIds : counts.catalogOrderIds;
      if (!targetIds.includes(entityId)) {
        if (isCustomOrder(order)) counts.custom_order++;
        else counts.catalog_order++;
        targetIds.push(entityId);
      }
    }
  });

  counts.catalog_price_submission = counts.catalogPriceProductIds.length;
  counts.total = counts.payment + counts.custom_request + counts.custom_order + counts.catalog_order + counts.refund_issue + counts.shipping_delivery + counts.catalog_price_submission;

  return c.json({ data: counts });
});

adminRouter.get(
  "/audit",
  requireAnyPermission([PERMISSIONS.ACTIVITY_VIEW, PERMISSIONS.AUDIT_VIEW]),
  zValidator("query", listQuerySchema),
  async (c) => {
    const { limit } = c.req.valid("query");
    const data = await db.query.auditLogs.findMany({
      orderBy: [desc(auditLogs.createdAt)],
      limit: limit ?? 150,
    });
    return c.json({ data });
  },
);

adminRouter.get(
  "/audit/:auditId",
  requireAnyPermission([PERMISSIONS.ACTIVITY_VIEW, PERMISSIONS.AUDIT_VIEW]),
  async (c) => {
    const auditId = c.req.param("auditId");
    const data = await db.query.auditLogs.findFirst({
      where: eq(auditLogs.id, auditId),
    });
    if (!data) {
      throw new HTTPException(404, { message: "Audit log not found" });
    }
    return c.json({ data });
  },
);

adminRouter.get("/users", requireAnyPermission([PERMISSIONS.EMPLOYEES_VIEW, PERMISSIONS.ROLES_ASSIGN, PERMISSIONS.ROLES_MANAGE, PERMISSIONS.SUPPORT_ASSIGN]), zValidator("query", listQuerySchema), async (c) => {
  const { limit } = c.req.valid("query");
  const data = await listUsersForAdmin(limit ?? 200);
  return c.json({ data });
});

adminRouter.get("/users/:userId", requirePermission(PERMISSIONS.EMPLOYEES_VIEW), zValidator("param", userParamSchema), async (c) => {
  const { userId } = c.req.valid("param");
  const data = await getEmployeeDetailForAdmin(userId);
  return c.json({ data });
});

adminRouter.get("/customers", requirePermission(PERMISSIONS.CUSTOMERS_VIEW), zValidator("query", listQuerySchema), async (c) => {
  const { limit } = c.req.valid("query");
  const data = await listCustomersForAdmin(limit ?? 200);
  return c.json({ data });
});

adminRouter.get("/customers/:userId", requirePermission(PERMISSIONS.CUSTOMERS_VIEW), zValidator("param", userParamSchema), async (c) => {
  const { userId } = c.req.valid("param");
  const data = await getCustomerDetailForAdmin(userId);
  return c.json({ data });
});

adminRouter.get("/customers/:userId/activity", requirePermission(PERMISSIONS.CUSTOMERS_VIEW), zValidator("param", userParamSchema), async (c) => {
  const { userId } = c.req.valid("param");
  const data = await getCustomerActivityForAdmin(userId);
  return c.json({ data });
});

adminRouter.get("/customers/:userId/measurements", requirePermission(PERMISSIONS.CUSTOMERS_VIEW), zValidator("param", userParamSchema), async (c) => {
  const { userId } = c.req.valid("param");
  const data = await listCustomerMeasurementsForAdmin(userId);
  return c.json({ data });
});

adminRouter.patch(
  "/customers/:userId",
  requirePermission(PERMISSIONS.CUSTOMERS_EDIT),
  zValidator("param", userParamSchema),
  zValidator("json", userProfilePatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const body = c.req.valid("json");
    const data = await updateCustomerProfileForAdmin({
      userId,
      ...body,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.patch(
  "/customers/:userId/status",
  requirePermission(PERMISSIONS.CUSTOMERS_EDIT),
  zValidator("param", userParamSchema),
  zValidator("json", userStatusPatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const data = await updateCustomerStatusForAdmin({
      userId,
      status,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.patch(
  "/customers/:userId/password",
  requirePermission(PERMISSIONS.CUSTOMERS_EDIT),
  zValidator("param", userParamSchema),
  zValidator("json", userPasswordResetSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const { password } = c.req.valid("json");
    const data = await resetCustomerPasswordForAdmin({
      userId,
      password,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.post(
  "/customers/:userId/password-reset-link",
  requirePermission(PERMISSIONS.CUSTOMERS_EDIT),
  zValidator("param", userParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const data = await sendPasswordResetLinkForAdmin({
      userId,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.delete(
  "/customers/:userId",
  requirePermission(PERMISSIONS.CUSTOMERS_DELETE),
  zValidator("param", userParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const force = c.req.query("force") === "true";
    const data = await deleteCustomerForAdmin({
      userId,
      performedBy: authUser?.email,
      force,
    });
    return c.json({ data });
  },
);

adminRouter.get("/roles", requirePermission(PERMISSIONS.ROLES_VIEW), async (c) => {
  const data = await listRolesForAdmin();
  return c.json({ data });
});

adminRouter.post(
  "/roles",
  requireAnyPermission([PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_MANAGE]),
  zValidator("json", createRoleSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const payload = c.req.valid("json");
    const key = payload.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const data = await createRoleForAdmin({
      key,
      name: payload.name,
      description: payload.description,
      color: payload.color,
      icon: payload.icon,
    });

    await db.insert(auditLogs).values({
      action: "role_created",
      category: "admin",
      severity: "info",
      entityType: "role",
      entityId: data.id,
      performedBy: authUser?.email ?? "admin",
      details: "Admin created custom role",
      metadata: { key: data.key, name: data.name },
    });

    return c.json({ data }, 201);
  },
);

adminRouter.get("/permissions", requirePermission(PERMISSIONS.ROLES_VIEW), async (c) => {
  const data = await listPermissionsForAdmin();
  return c.json({ data });
});

adminRouter.patch(
  "/roles/:roleId",
  requireAnyPermission([PERMISSIONS.ROLES_EDIT, PERMISSIONS.ROLES_MANAGE]),
  zValidator("param", roleIdParamSchema),
  zValidator("json", roleUpdateSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { roleId } = c.req.valid("param");
    const body = c.req.valid("json");
    const data = await updateRoleForAdmin(roleId, body);
    if (!data) throw new HTTPException(404, { message: "Role not found" });

    await db.insert(auditLogs).values({
      action: "role_updated",
      category: "admin",
      severity: "info",
      entityType: "role",
      entityId: roleId,
      performedBy: authUser?.email ?? "admin",
      details: "Admin updated role",
      metadata: { name: data.name },
    });

    return c.json({ data });
  },
);

adminRouter.delete(
  "/roles/:roleId",
  requireAnyPermission([PERMISSIONS.ROLES_DELETE, PERMISSIONS.ROLES_MANAGE]),
  zValidator("param", roleIdParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { roleId } = c.req.valid("param");
    const result = await deleteRoleForAdmin(roleId);
    if (!result) throw new HTTPException(404, { message: "Role not found" });
    if (result.blocked) throw new HTTPException(409, { message: "System roles cannot be deleted" });

    await db.insert(auditLogs).values({
      action: "role_deleted",
      category: "admin",
      severity: "warning",
      entityType: "role",
      entityId: roleId,
      performedBy: authUser?.email ?? "admin",
      details: "Admin deleted role",
      metadata: { name: result.role.name },
    });

    return c.json({ data: result.role });
  },
);

adminRouter.patch(
  "/permissions/:permissionId",
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  zValidator("param", permissionIdParamSchema),
  zValidator("json", permissionUpdateSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { permissionId } = c.req.valid("param");
    const body = c.req.valid("json");
    const data = await updatePermissionForAdmin(permissionId, body);
    if (!data) throw new HTTPException(404, { message: "Permission not found" });

    await db.insert(auditLogs).values({
      action: "permission_updated",
      category: "admin",
      severity: "info",
      entityType: "permission",
      entityId: permissionId,
      performedBy: authUser?.email ?? "admin",
      details: "Admin updated permission",
      metadata: { key: data.key },
    });

    return c.json({ data });
  },
);

adminRouter.delete(
  "/permissions/:permissionId",
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  zValidator("param", permissionIdParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { permissionId } = c.req.valid("param");
    const data = await deletePermissionForAdmin(permissionId);
    if (!data) throw new HTTPException(404, { message: "Permission not found" });

    await db.insert(auditLogs).values({
      action: "permission_deleted",
      category: "admin",
      severity: "warning",
      entityType: "permission",
      entityId: permissionId,
      performedBy: authUser?.email ?? "admin",
      details: "Admin deleted permission",
      metadata: { key: data.key },
    });

    return c.json({ data });
  },
);

adminRouter.get(
  "/reports",
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  zValidator("query", reportsQuerySchema),
  async (c) => {
    const data = await getReportsCenterPayload(c.req.valid("query"));
    return c.json({ data });
  },
);

adminRouter.get(
  "/reports/orders",
  requirePermission(PERMISSIONS.REPORTS_VIEW),
  zValidator("query", orderReportQuerySchema),
  async (c) => {
    const data = await getOrderReport(c.req.valid("query"));
    return c.json({ data });
  },
);

adminRouter.get(
  "/reports/orders/export",
  requirePermission(PERMISSIONS.REPORTS_EXPORT),
  zValidator("query", orderReportQuerySchema.extend({ format: z.enum(["csv", "pdf"]).optional() })),
  async (c) => {
    const { format = "csv", ...filters } = c.req.valid("query");
    const report = await getOrderReport(filters);
    const authUser = c.get("authUser");

    await db.insert(auditLogs).values({
      action: "order_report_exported",
      category: "report",
      severity: "info",
      entityType: "report",
      performedBy: authUser?.email ?? "admin",
      details: `Admin exported order report as ${format}`,
      metadata: filters,
    });

    if (format === "pdf") {
      const rows = report.rows
        .map(
          (order) =>
            `${order.orderNumber} | ${order.customerName} | ${order.status} | ${order.paymentStatus} | ${order.totalUsd}`,
        )
        .join("\n");
      const text = `Order Report\n\nTotal Orders: ${report.summary.totalOrders}\nPaid Orders: ${report.summary.paidOrders}\nPending Orders: ${report.summary.pendingOrders}\nRevenue: ${report.summary.totalRevenue}\n\n${rows}`;
      return c.body(text, 200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="order-report.pdf"',
      });
    }

    return c.body(toOrderReportCsv(report.rows), 200, {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="order-report.csv"',
    });
  },
);

adminRouter.get(
  "/discounts",
  requirePermission(PERMISSIONS.COUPONS_VIEW),
  async (c) => {
    const data = await getDiscountWorkspacePayload();
    return c.json({ data });
  },
);

adminRouter.get(
  "/customer-credits",
  requirePermission(PERMISSIONS.PAYMENTS_VIEW),
  async (c) => {
    const data = await getCustomerCreditWorkspacePayload();
    return c.json({ data });
  },
);

adminRouter.patch(
  "/customer-credits/rule",
  requirePermission(PERMISSIONS.PAYMENTS_VERIFY),
  zValidator("json", customerCreditRuleSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const body = c.req.valid("json");
    const data = await updateCustomerCreditRuleForAdmin({
      ...body,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.get(
  "/profit-costs",
  requirePermission(PERMISSIONS.PAYMENTS_VIEW),
  async (c) => {
    const data = await getProfitCostsWorkspacePayload();
    return c.json({ data });
  },
);

adminRouter.patch(
  "/profit-costs/settings",
  requirePermission(PERMISSIONS.PAYMENTS_VERIFY),
  zValidator("json", profitCostSettingSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const body = c.req.valid("json");
    const data = await upsertProfitCostSettingForAdmin({
      ...body,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.post(
  "/orders/:orderId/stripe-receipt",
  requirePermission(PERMISSIONS.PAYMENTS_VIEW),
  zValidator("param", orderParamSchema),
  async (c) => {
    const { orderId } = c.req.valid("param");
    const data = await refreshStripeReceiptForOrder({ orderId });
    return c.json({ data });
  },
);

adminRouter.post(
  "/discounts/product-discounts",
  requirePermission(PERMISSIONS.COUPONS_EDIT),
  zValidator("json", productDiscountSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const data = await createProductDiscountForAdmin({
      ...c.req.valid("json"),
      performedBy: authUser?.email,
    });
    return c.json({ data }, 201);
  },
);

adminRouter.patch(
  "/discounts/product-discounts/:discountId",
  requirePermission(PERMISSIONS.COUPONS_EDIT),
  zValidator("param", productDiscountParamSchema),
  zValidator("json", productDiscountPatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { discountId } = c.req.valid("param");
    const data = await updateProductDiscountForAdmin(discountId, {
      ...c.req.valid("json"),
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.post(
  "/discounts/coupons",
  requirePermission(PERMISSIONS.COUPONS_EDIT),
  zValidator("json", couponCodeSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const data = await createCouponCodeForAdmin({
      ...c.req.valid("json"),
      performedBy: authUser?.email,
    });
    return c.json({ data }, 201);
  },
);

adminRouter.patch(
  "/discounts/coupons/:couponId",
  requirePermission(PERMISSIONS.COUPONS_EDIT),
  zValidator("param", couponParamSchema),
  zValidator("json", couponCodePatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { couponId } = c.req.valid("param");
    const data = await updateCouponCodeForAdmin(couponId, {
      ...c.req.valid("json"),
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.put(
  "/roles/:roleId/permissions",
  requireAnyPermission([PERMISSIONS.ROLES_CREATE, PERMISSIONS.ROLES_EDIT, PERMISSIONS.ROLES_MANAGE]),
  zValidator("param", roleIdParamSchema),
  zValidator("json", rolePermissionsPatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { roleId } = c.req.valid("param");
    const { permissions: permissionKeys } = c.req.valid("json");
    const data = await updateRolePermissionsForAdmin(roleId, permissionKeys);
    if (!data) {
      throw new HTTPException(404, { message: "Role not found" });
    }

    await db.insert(auditLogs).values({
      action: "role_permissions_updated",
      category: "admin",
      severity: "info",
      entityType: "role",
      entityId: roleId,
      performedBy: authUser?.email ?? "admin",
      details: "Admin updated role permissions",
      metadata: { permissions: permissionKeys },
    });

    return c.json({ data });
  },
);

adminRouter.post("/users/employees", requirePermission(PERMISSIONS.EMPLOYEES_CREATE), zValidator("json", createEmployeeSchema), async (c) => {
  const authUser = c.get("authUser");
  const data = await createEmployeeForAdmin({
    ...c.req.valid("json"),
    performedBy: authUser?.email,
  });
  return c.json({ data }, 201);
});

adminRouter.post("/users/customers", requirePermission(PERMISSIONS.CUSTOMERS_CREATE), zValidator("json", createCustomerSchema), async (c) => {
  const authUser = c.get("authUser");
  const data = await createCustomerForAdmin({
    ...c.req.valid("json"),
    performedBy: authUser?.email,
  });
  return c.json({ data }, 201);
});

adminRouter.patch(
  "/users/:userId/role",
  requirePermission(PERMISSIONS.EMPLOYEES_ASSIGN),
  zValidator("param", userParamSchema),
  zValidator("json", rolePatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const { role } = c.req.valid("json");
    const data = await updateUserRoleForAdmin({
      userId,
      role,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.get("/users/:userId/permissions", requirePermission(PERMISSIONS.EMPLOYEES_VIEW), zValidator("param", userParamSchema), async (c) => {
  const { userId } = c.req.valid("param");
  return c.json({ data: await getEffectivePermissionsForUser(userId) });
});

adminRouter.put(
  "/users/:userId/permissions",
  requirePermission(PERMISSIONS.EMPLOYEES_ASSIGN),
  zValidator("param", userParamSchema),
  zValidator("json", rolePermissionsPatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const { permissions: permissionKeys } = c.req.valid("json");
    const data = await updateUserPermissionsForAdmin(userId, permissionKeys);
    await db.insert(auditLogs).values({
      action: "user_permissions_updated",
      category: "admin",
      severity: "info",
      entityType: "user",
      entityId: userId,
      performedBy: authUser?.email ?? "admin",
      details: "Admin updated user permissions",
      metadata: { permissions: permissionKeys },
    });
    return c.json({ data });
  },
);

adminRouter.put(
  "/users/:userId/access",
  requireAnyPermission([PERMISSIONS.ROLES_ASSIGN, PERMISSIONS.ROLES_MANAGE]),
  zValidator("param", userParamSchema),
  zValidator("json", employeeAccessPatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const body = c.req.valid("json");
    const data = await assignEmployeeAccessForAdmin({
      userId,
      roleId: body.roleId ?? null,
      permissionKeys: body.permissions ?? [],
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.patch(
  "/users/:userId",
  requirePermission(PERMISSIONS.EMPLOYEES_EDIT),
  zValidator("param", userParamSchema),
  zValidator("json", userProfilePatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const body = c.req.valid("json");
    const data = await updateUserProfileForAdminService({
      userId,
      ...body,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.patch(
  "/users/:userId/status",
  requireAnyPermission([PERMISSIONS.EMPLOYEES_EDIT, PERMISSIONS.EMPLOYEES_STATUS_UPDATE]),
  zValidator("param", userParamSchema),
  zValidator("json", userStatusPatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const { status } = c.req.valid("json");
    const data = await updateUserStatusForAdmin({
      userId,
      status,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.patch(
  "/users/:userId/password",
  requirePermission(PERMISSIONS.EMPLOYEES_EDIT),
  zValidator("param", userParamSchema),
  zValidator("json", employeeTemporaryPasswordSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const { password } = c.req.valid("json");
    const data = await resetEmployeePasswordForAdmin({
      userId,
      password,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.post(
  "/users/:userId/password-reset-link",
  requirePermission(PERMISSIONS.EMPLOYEES_EDIT),
  zValidator("param", userParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const data = await sendPasswordResetLinkForAdmin({
      userId,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

adminRouter.delete(
  "/users/:userId",
  requirePermission(PERMISSIONS.EMPLOYEES_DELETE),
  zValidator("param", userParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const force = c.req.query("force") === "true";
    const data = await deleteUserForAdmin({
      userId,
      performedBy: authUser?.email,
      force,
    });
    return c.json({ data });
  },
);

adminRouter.get("/homepage-sections", requirePermission(PERMISSIONS.PRODUCTS_VIEW), async (c) => {
  const rows = await db
    .select()
    .from(homepageSections)
    .orderBy(asc(homepageSections.sortOrder), asc(homepageSections.name));
  return c.json({ data: rows });
});

adminRouter.post(
  "/homepage-sections",
  requirePermission(PERMISSIONS.PRODUCTS_EDIT),
  zValidator("json", homepageSectionPayloadSchema),
  async (c) => {
    const body = c.req.valid("json");
    const [created] = await db
      .insert(homepageSections)
      .values({
        name: body.name,
        slug: `${toSlug(body.name)}-${Date.now()}`,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
        collections: body.collections ?? body.subsections ?? [],
      })
      .returning();
    return c.json({ data: created }, 201);
  },
);

adminRouter.patch(
  "/homepage-sections/:sectionId",
  requirePermission(PERMISSIONS.PRODUCTS_EDIT),
  zValidator("param", homepageSectionParamSchema),
  zValidator("json", homepageSectionPayloadSchema.partial()),
  async (c) => {
    const { sectionId } = c.req.valid("param");
    const body = c.req.valid("json");
    const [updated] = await db
      .update(homepageSections)
      .set({
        ...(body.name ? { name: body.name } : {}),
        ...(typeof body.isActive === "boolean" ? { isActive: body.isActive } : {}),
        ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}),
        ...(body.collections || body.subsections ? { collections: body.collections ?? body.subsections ?? [] } : {}),
        updatedAt: new Date(),
      })
      .where(eq(homepageSections.id, sectionId))
      .returning();
    if (!updated) throw new HTTPException(404, { message: "Homepage section not found" });
    return c.json({ data: updated });
  },
);

adminRouter.delete(
  "/homepage-sections/:sectionId",
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  zValidator("param", homepageSectionParamSchema),
  async (c) => {
    const { sectionId } = c.req.valid("param");
    const [deleted] = await db.delete(homepageSections).where(eq(homepageSections.id, sectionId)).returning();
    if (!deleted) throw new HTTPException(404, { message: "Homepage section not found" });
    return c.json({ data: deleted });
  },
);

adminRouter.get("/products", requirePermission(PERMISSIONS.PRODUCTS_VIEW), zValidator("query", listQuerySchema), async (c) => {
  const { limit } = c.req.valid("query");
  const [data, priceAlerts] = await Promise.all([
    db.query.products.findMany({
      orderBy: [desc(products.createdAt)],
      limit: limit ?? 200,
    }),
    db.query.systemAlerts.findMany({
      where: and(eq(systemAlerts.type, "catalog_price_submitted"), eq(systemAlerts.isResolved, false)),
      orderBy: [desc(systemAlerts.updatedAt)],
    }),
  ]);
  const alertByProductId = new Map(priceAlerts.map((alert) => [String(alert.entityId), alert]));
  return c.json({
    data: data.map((product) => {
      const alert = alertByProductId.get(String(product.id));
      return {
        ...product,
        hasNewPriceSubmission: Boolean(alert),
        priceSubmissionAlertId: alert?.id ?? null,
      };
    }),
  });
});

const pricingRulePatchSchema = z.object({
  markupAmountEtb: z.coerce.number().nonnegative(),
  isActive: z.boolean().optional(),
});
const pricingRuleScopeSchema = z.object({
  scopeType: z.enum(["global", "tribe", "region"]).default("global"),
  tribeName: z.string().trim().min(1).optional(),
  regionName: z.string().trim().min(1).optional(),
}).superRefine((value, context) => {
  if (value.scopeType !== "global" && !value.tribeName) {
    context.addIssue({ code: "custom", path: ["tribeName"], message: "A tribe is required for this pricing scope" });
  }
  if (value.scopeType === "region" && !value.regionName) {
    context.addIssue({ code: "custom", path: ["regionName"], message: "A region is required for region pricing" });
  }
});
const pricingRulesBulkSchema = z.object({
  scopeType: z.enum(["global", "tribe", "region"]).default("global"),
  tribeName: z.string().trim().min(1).optional(),
  regionName: z.string().trim().min(1).optional(),
  rules: z.array(z.object({
    ruleKey: z.enum(GLOBAL_PRICING_RULE_KEYS),
    markupAmountEtb: z.coerce.number().nonnegative(),
  })).min(1),
}).superRefine((value, context) => {
  if (value.scopeType !== "global" && !value.tribeName) {
    context.addIssue({ code: "custom", path: ["tribeName"], message: "A tribe is required for this pricing scope" });
  }
  if (value.scopeType === "region" && !value.regionName) {
    context.addIssue({ code: "custom", path: ["regionName"], message: "A region is required for region pricing" });
  }
});

function pricingScope(input: { scopeType: "global" | "tribe" | "region"; tribeName?: string; regionName?: string }): PricingRuleScope {
  return {
    scopeType: input.scopeType,
    tribeName: input.scopeType === "global" ? null : input.tribeName,
    regionName: input.scopeType === "region" ? input.regionName : null,
  };
}

async function pricingRulesPayload(scope: PricingRuleScope) {
  const [allRules, sections] = await Promise.all([
    db.query.globalPricingRules.findMany({ where: eq(globalPricingRules.isActive, true), orderBy: [asc(globalPricingRules.label)] }),
    db.select({ name: homepageSections.name, collections: homepageSections.collections })
      .from(homepageSections)
      .where(eq(homepageSections.isActive, true))
      .orderBy(asc(homepageSections.sortOrder), asc(homepageSections.name)),
  ]);
  const effective = resolveEffectivePricingRuleValues(allRules, {
    region: scope.tribeName,
    subcategory: scope.regionName,
  });
  const currentScopeKey = pricingRuleScopeKey(scope);
  const ownRules = new Map(
    allRules.filter((rule) => rule.scopeKey === currentScopeKey).map((rule) => [rule.ruleKey, rule]),
  );
  return {
    data: GLOBAL_PRICING_RULE_DEFINITIONS.map((definition) => ({
      ...(ownRules.get(definition.ruleKey) ?? {}),
      ruleKey: definition.ruleKey,
      label: definition.label,
      markupAmountEtb: effective[definition.ruleKey].toFixed(2),
      isOverride: ownRules.has(definition.ruleKey),
    })),
    scope: { ...scope, scopeKey: currentScopeKey },
    tribes: sections.map((section) => ({
      name: section.name,
      regions: (section.collections ?? []).filter((region) => region.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((region) => region.name),
    })),
  };
}

async function recalculateProductsForPricingScope(scope: PricingRuleScope) {
  const [allRules, candidates] = await Promise.all([
    db.query.globalPricingRules.findMany({ where: eq(globalPricingRules.isActive, true) }),
    db.query.products.findMany({
      where: or(eq(products.priceStatus, "approved"), eq(products.priceStatus, "published")),
    }),
  ]);
  const affected = candidates.filter((product) => {
    if (scope.scopeType === "global") return true;
    if (product.region !== scope.tribeName) return false;
    return scope.scopeType === "tribe" || product.subcategory === scope.regionName;
  });
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  for (const product of affected) {
    const prices = product.approvedEstimatedPrices;
    if (!prices || Object.values(prices).some((price) => !Number.isFinite(Number(price)) || Number(price) <= 0)) {
      skipped += 1;
      continue;
    }
    const effectiveRules = resolveEffectivePricingRuleValues(allRules, product);
    const calculated = calculateProductFamilyRoles(product, prices, effectiveRules);
    if (calculated.pricingError || calculated.updated === 0) {
      failed += 1;
      continue;
    }
    try {
      const normalizedRoles = await Promise.all(calculated.nextRoles.map(async (role) => {
        const sellingPriceEtb = Number(role.sellingPriceEtb ?? 0);
        if (sellingPriceEtb <= 0) return role;
        const normalized = await normalizeProductPrice(sellingPriceEtb, "ETB");
        return { ...role, price: normalized.priceUsd, currency: "ETB" as const, enteredPrice: sellingPriceEtb, exchangeRate: normalized.exchangeRate };
      }));
      const baseRole = normalizedRoles.find((role) => role.customerType === "woman" && Number(role.sellingPriceEtb) > 0)
        ?? normalizedRoles.find((role) => Number(role.sellingPriceEtb) > 0);
      const baseSellingPriceEtb = Number(baseRole?.sellingPriceEtb ?? 0);
      if (baseSellingPriceEtb <= 0) {
        failed += 1;
        continue;
      }
      const normalizedBase = await normalizeProductPrice(baseSellingPriceEtb, "ETB");
      await db.update(products).set({
        familyRoles: normalizedRoles,
        designerPriceEtb: Number(baseRole?.designerPriceEtb ?? 0).toFixed(2),
        markupAmountEtb: Number(baseRole?.markupAmountEtb ?? 0).toFixed(2),
        priceUsd: normalizedBase.priceUsd.toFixed(2),
        baseCurrency: "ETB",
        basePriceAmount: baseSellingPriceEtb.toFixed(2),
        baseExchangeRate: normalizedBase.exchangeRate.toFixed(4),
        priceVersion: Number(product.priceVersion ?? 0) + 1,
        updatedAt: new Date(),
      }).where(eq(products.id, product.id));
      updated += 1;
    } catch (error) {
      failed += 1;
      logger.error({ error, productId: product.id, pricingScope: pricingRuleScopeKey(scope) }, "scoped_pricing_product_recalculation_failed");
    }
  }
  return { affected: affected.length, updated, skipped, failed };
}

adminRouter.get("/pricing-rules", requirePermission(PERMISSIONS.SETTINGS_VIEW), zValidator("query", pricingRuleScopeSchema), async (c) => {
  return c.json(await pricingRulesPayload(pricingScope(c.req.valid("query"))));
});

adminRouter.put(
  "/pricing-rules",
  requirePermission(PERMISSIONS.SETTINGS_EDIT),
  zValidator("json", pricingRulesBulkSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const body = c.req.valid("json");
    const { rules } = body;
    const scope = pricingScope(body);
    const scopeKey = pricingRuleScopeKey(scope);
    const definitions = new Map(GLOBAL_PRICING_RULE_DEFINITIONS.map((rule) => [rule.ruleKey, rule]));
    await db.transaction(async (tx) => {
      for (const rule of rules) {
        const definition = definitions.get(rule.ruleKey);
        if (!definition) continue;
        await tx.insert(globalPricingRules).values({
          ruleKey: rule.ruleKey,
          scopeType: scope.scopeType,
          scopeKey,
          tribeName: scope.tribeName,
          regionName: scope.regionName,
          label: definition.label,
          markupAmountEtb: rule.markupAmountEtb.toFixed(2),
          isActive: true,
          updatedBy: authUser?.email,
        }).onConflictDoUpdate({
          target: [globalPricingRules.scopeKey, globalPricingRules.ruleKey],
          set: {
            label: definition.label,
            markupAmountEtb: rule.markupAmountEtb.toFixed(2),
            isActive: true,
            updatedBy: authUser?.email,
            updatedAt: new Date(),
          },
        });
      }
    });
    await db.insert(auditLogs).values({
      action: "scoped_pricing_rules_updated",
      category: "inventory",
      severity: "info",
      entityType: "global_pricing_rules",
      performedBy: authUser?.email ?? "admin",
      details: `Updated ${scope.scopeType} role pricing formulas`,
      metadata: { scope, rules: Object.fromEntries(rules.map((rule) => [rule.ruleKey, rule.markupAmountEtb])) },
    });
    const recalculation = await recalculateProductsForPricingScope(scope);
    return c.json({ ...(await pricingRulesPayload(scope)), recalculation });
  },
);

adminRouter.patch(
  "/pricing-rules/:ruleKey",
  requirePermission(PERMISSIONS.SETTINGS_EDIT),
  zValidator("json", pricingRulePatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const ruleKey = c.req.param("ruleKey");
    const body = c.req.valid("json");
    const [row] = await db.update(globalPricingRules)
      .set({ markupAmountEtb: body.markupAmountEtb.toFixed(2), isActive: body.isActive, updatedBy: authUser?.email, updatedAt: new Date() })
      .where(and(eq(globalPricingRules.scopeKey, "global"), eq(globalPricingRules.ruleKey, ruleKey)))
      .returning();
    if (!row) throw new HTTPException(404, { message: "Pricing rule not found" });
    await db.insert(auditLogs).values({
      action: "global_pricing_rule_updated",
      category: "inventory",
      severity: "info",
      entityType: "global_pricing_rule",
      entityId: row.id,
      performedBy: authUser?.email ?? "admin",
      details: `Updated ${row.label}`,
      metadata: { ruleKey, markupAmountEtb: row.markupAmountEtb },
    });
    const recalculation = await recalculateProductsForPricingScope({ scopeType: "global" });
    return c.json({ data: row, recalculation });
  },
);

async function getProductDetailForAdmin(productId: string) {
  const data = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!data) return null;
  const costSetting = await db.query.profitCostSettings.findFirst({
    where: and(eq(profitCostSettings.entityType, "product"), eq(profitCostSettings.entityId, productId)),
  });
  return { ...data, profitCostSetting: costSetting ?? null };
}

adminRouter.get(
  "/products/:productId",
  requirePermission(PERMISSIONS.PRODUCTS_VIEW),
  zValidator("param", productParamSchema),
  async (c) => {
    const { productId } = c.req.valid("param");
    const data = await getProductDetailForAdmin(productId);
    if (!data) {
      throw new HTTPException(404, { message: "Product not found" });
    }
    return c.json({ data });
  },
);

adminRouter.delete(
  "/pricing-rules",
  requirePermission(PERMISSIONS.SETTINGS_EDIT),
  zValidator("query", pricingRuleScopeSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const scope = pricingScope(c.req.valid("query"));
    if (scope.scopeType === "global") {
      throw new HTTPException(400, { message: "Global rules cannot inherit from another scope" });
    }
    const scopeKey = pricingRuleScopeKey(scope);
    const deleted = await db.delete(globalPricingRules)
      .where(eq(globalPricingRules.scopeKey, scopeKey))
      .returning({ id: globalPricingRules.id });
    await db.insert(auditLogs).values({
      action: "scoped_pricing_rules_reset",
      category: "inventory",
      severity: "info",
      entityType: "global_pricing_rules",
      performedBy: authUser?.email ?? "admin",
      details: `Reset ${scope.scopeType} pricing formulas to inherited values`,
      metadata: { scope, deletedRules: deleted.length },
    });
    const recalculation = await recalculateProductsForPricingScope(scope);
    return c.json({ ...(await pricingRulesPayload(scope)), recalculation });
  },
);

adminRouter.patch(
  "/products/:productId/price-submission-viewed",
  requirePermission(PERMISSIONS.PRODUCTS_VIEW),
  zValidator("param", productParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { productId } = c.req.valid("param");
    const rows = await db.update(systemAlerts).set({
      isResolved: true,
      resolvedBy: authUser?.email ?? "admin",
      updatedAt: new Date(),
    }).where(and(
      eq(systemAlerts.type, "catalog_price_submitted"),
      eq(systemAlerts.entityId, productId),
      eq(systemAlerts.isResolved, false),
    )).returning();
    return c.json({ data: rows, count: rows.length });
  },
);


adminRouter.post(
  "/products",
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  zValidator("json", createProductSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const body = c.req.valid("json");
    const isOther = isOtherProduct({ category: body.category, region: body.region });
    const baseCurrency = body.baseCurrency ?? "USD";
    const normalizedBase = await normalizeProductPrice(body.priceUsd, baseCurrency);
    const normalizedRoles = isOther ? null : await normalizeFamilyRoles(body.familyRoles);
    const [row] = await db
      .insert(products)
      .values({
        name: body.name,
        description: body.description,
        region: body.region,
        subcategory: body.subcategory,
        category: body.category,
        sizeOptions: isOther ? (body.sizeOptions?.length ? body.sizeOptions : [...DEFAULT_OTHER_SIZE_OPTIONS]) : [],
        priceUsd: normalizedBase.priceUsd.toFixed(2),
        baseCurrency,
        basePriceAmount: body.priceUsd.toFixed(2),
        baseExchangeRate: normalizedBase.exchangeRate.toFixed(4),
        groomPriceUsd: isOther ? null : body.groomPriceUsd == null ? null : body.groomPriceUsd.toFixed(2),
        familyRoles: normalizedRoles ?? undefined,
        uniqueId: body.uniqueId,
        images: body.images,
        fabricType: body.fabricType,
        embroideryStyle: body.embroideryStyle,
        gender: isOther ? "unisex" : body.gender,
        tailoringDays: body.tailoringDays ?? 30,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
        sendToTelegram: body.sendToTelegram ?? false,
        priceStatus: body.priceStatus ?? "draft",
        priceDeadline: body.priceDeadline ?? null,
      })
      .returning();

    await upsertProfitCostSettingForAdmin({
      entityType: "product",
      entityId: row.id,
      productCostUsd: 0,
      taxPercent: body.taxPercent,
      designerCostUsd: body.designerCostUsd,
      otherCostUsd: body.otherCostUsd,
      performedBy: authUser?.email,
    });

    await db.insert(auditLogs).values({
      action: "product_created",
      category: "inventory",
      severity: "info",
      entityType: "product",
      entityId: row.id,
      performedBy: authUser?.email ?? "admin",
      details: "Admin created product",
      metadata: {
        region: row.region,
        subcategory: row.subcategory,
        priceUsd: row.priceUsd,
      },
    });

    if (row.sendToTelegram) {
      try {
        const telegramResult = await sendTelegramProduct(row);
        await db.update(products).set({ telegramStatus: "waiting_price", telegramMessageId: String(telegramResult.message.message_id), telegramTopicId: telegramResult.topicId, priceStatus: "waiting_price", updatedAt: new Date() }).where(eq(products.id, row.id));
      } catch (error) {
        logger.error({ error, productId: row.id, region: row.region }, "telegram_product_send_failed_on_create");
        await db.update(products).set({ telegramStatus: "not_sent", updatedAt: new Date() }).where(eq(products.id, row.id));
      }
    }

    return c.json({ data: row }, 201);
  },
);

adminRouter.patch(
  "/products/:productId",
  requirePermission(PERMISSIONS.PRODUCTS_EDIT),
  zValidator("param", productParamSchema),
  zValidator("json", productPatchSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { productId } = c.req.valid("param");
    const body = c.req.valid("json");
    const isOther = isOtherProduct({ category: body.category, region: body.region });
    if (Object.keys(body).length === 0) {
      throw new HTTPException(400, { message: "At least one product field must be updated" });
    }

    const normalizedBase = body.priceUsd === undefined
      ? undefined
      : await normalizeProductPrice(body.priceUsd, body.baseCurrency ?? "USD");
    const normalizedRoles = isOther ? null : body.familyRoles === undefined ? undefined : await normalizeFamilyRoles(body.familyRoles);
    const [row] = await db
      .update(products)
      .set({
        name: body.name,
        description: body.description,
        region: body.region,
        subcategory: body.subcategory,
        category: body.category,
        sizeOptions: isOther ? (body.sizeOptions?.length ? body.sizeOptions : [...DEFAULT_OTHER_SIZE_OPTIONS]) : body.sizeOptions,
        priceUsd: normalizedBase ? normalizedBase.priceUsd.toFixed(2) : undefined,
        baseCurrency: body.baseCurrency,
        basePriceAmount: body.priceUsd !== undefined ? body.priceUsd.toFixed(2) : undefined,
        baseExchangeRate: normalizedBase ? normalizedBase.exchangeRate.toFixed(4) : undefined,
        groomPriceUsd: isOther
          ? null
          : body.groomPriceUsd === undefined
            ? undefined
            : body.groomPriceUsd == null
              ? null
              : body.groomPriceUsd.toFixed(2),
        familyRoles: normalizedRoles,
        uniqueId: body.uniqueId,
        gender: isOther ? "unisex" : body.gender,
        fabricType: body.fabricType,
        embroideryStyle: body.embroideryStyle,
        tailoringDays: body.tailoringDays,
        images: body.images,
        isActive: body.isActive,
        isFeatured: body.isFeatured,
        sendToTelegram: body.sendToTelegram,
        priceStatus: body.priceStatus,
        telegramStatus: body.telegramStatus,
        priceDeadline: body.priceDeadline,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (!row) {
      throw new HTTPException(404, { message: "Product not found" });
    }

    if (body.priceStatus && row.telegramMessageId) {
      const approved = body.priceStatus === "approved" || body.priceStatus === "published";
      const rejected = body.priceStatus === "rejected";
      if (approved || rejected) {
        try {
          await editTelegramMessage(
            row.telegramMessageId,
            designerEstimateCaption(row, approved ? "approved" : "declined"),
            approved ? { inline_keyboard: [] } : approvalKeyboard(row.id),
          );
          await db.update(products).set({ telegramStatus: approved ? "approved" : "rejected", updatedAt: new Date() }).where(eq(products.id, row.id));
        } catch {
          // Telegram availability must not prevent an admin price decision from being saved.
        }
      }
    }

    if (body.priceStatus === "approved" || body.priceStatus === "published") {
      const roles = Array.isArray(row.familyRoles) ? row.familyRoles as Array<Record<string, unknown>> : [];
      const approvedRole = roles.find((role) => role.customerType === "woman" && Number(role.sellingPriceEtb) > 0) ?? roles.find((role) => Number(role.sellingPriceEtb) > 0);
      const approvedEtb = Number(approvedRole?.sellingPriceEtb ?? 0);
      if (approvedEtb > 0) {
        const normalized = await normalizeProductPrice(approvedEtb, "ETB");
        const approvedAt = new Date();
        await db.update(products).set({ priceUsd: normalized.priceUsd.toFixed(2), baseCurrency: "ETB", basePriceAmount: approvedEtb.toFixed(2), baseExchangeRate: normalized.exchangeRate.toFixed(4), lastPriceApprovedAt: approvedAt, updatedAt: approvedAt }).where(eq(products.id, row.id));
      }
    }

    if (body.designerCostUsd !== undefined || body.taxPercent !== undefined || body.otherCostUsd !== undefined) {
      const existing = await db.query.profitCostSettings.findFirst({
        where: and(eq(profitCostSettings.entityType, "product"), eq(profitCostSettings.entityId, productId)),
      });
      await upsertProfitCostSettingForAdmin({
        entityType: "product",
        entityId: productId,
        productCostUsd: Number(existing?.productCostUsd ?? 0),
        taxPercent: body.taxPercent ?? Number(existing?.taxPercent ?? 0),
        designerCostUsd: body.designerCostUsd ?? Number(existing?.designerCostUsd ?? 0),
        otherCostUsd: body.otherCostUsd ?? Number(existing?.otherCostUsd ?? 0),
        designerPaymentPolicy: existing?.designerPaymentPolicy as "none" | "fifty_fifty" | "paid_100" | undefined,
        designerPaymentStatus: existing?.designerPaymentStatus as "unpaid" | "advance_paid" | "fully_paid" | undefined,
        designerPaidUsd: Number(existing?.designerPaidUsd ?? 0),
        internalNote: existing?.internalNote ?? null,
        performedBy: authUser?.email,
      });
    }

    await db.insert(auditLogs).values({
      action: "product_admin_updated",
      category: "inventory",
      severity: "info",
      entityType: "product",
      entityId: productId,
      performedBy: authUser?.email ?? "admin",
      details: "Admin updated product",
      metadata: body,
    });

    // Enabling Telegram must also retry products that were previously enabled
    // but never received a topic/message (for example after a failed deploy or
    // a missing runtime configuration). Do not duplicate a product that already
    // has a Telegram message.
    if (body.sendToTelegram === true && row.sendToTelegram && !row.telegramMessageId) {
      try {
        const telegramResult = await sendTelegramProduct(row);
        await db.update(products).set({ telegramStatus: "waiting_price", telegramMessageId: String(telegramResult.message.message_id), telegramTopicId: telegramResult.topicId, priceStatus: "waiting_price", updatedAt: new Date() }).where(eq(products.id, row.id));
      } catch (error) {
        logger.error({ error, productId: row.id, region: row.region }, "telegram_product_send_failed_on_toggle");
        await db.update(products).set({ telegramStatus: "not_sent", updatedAt: new Date() }).where(eq(products.id, row.id));
        throw new HTTPException(502, { message: error instanceof Error ? `Telegram send failed: ${error.message}` : "Telegram send failed" });
      }
    }

    const data = await getProductDetailForAdmin(productId);
    return c.json({ data: data ?? row });
  },
);

adminRouter.patch(
  "/products/:productId/estimated-prices",
  requirePermission(PERMISSIONS.PRODUCTS_EDIT),
  zValidator("param", productParamSchema),
  zValidator("json", estimatedPricesSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { productId } = c.req.valid("param");
    const prices = c.req.valid("json");
    const result = await updateEstimatedPrices(productId, prices, { recordSubmission: false });
    if (result.status === "unmatched") throw new HTTPException(404, { message: "Product not found" });
    if (result.status !== "submitted") {
      throw new HTTPException(400, { message: "message" in result ? result.message : "The submitted prices or global pricing rules are invalid" });
    }

    try {
      if (result.product.telegramMessageId) {
        await editTelegramMessage(
          result.product.telegramMessageId,
          designerEstimateCaption(result.product, "submitted"),
          approvalKeyboard(result.product.id),
        );
      }
    } catch (error) {
      logger.error({ error, productId }, "telegram_estimated_price_admin_edit_sync_failed");
    }

    await db.insert(auditLogs).values({
      action: "product_estimated_prices_updated",
      category: "inventory",
      severity: "info",
      entityType: "product",
      entityId: productId,
      performedBy: authUser?.email ?? "admin",
      details: "Admin updated Telegram estimated prices",
      metadata: prices,
    });
    return c.json({ data: await getProductDetailForAdmin(productId) });
  },
);

adminRouter.post(
  "/products/:productId/estimated-prices/:decision",
  requirePermission(PERMISSIONS.PRODUCTS_EDIT),
  zValidator("param", estimatedPriceDecisionParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { productId, decision } = c.req.valid("param");
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) throw new HTTPException(404, { message: "Product not found" });
    const estimates = product.estimatedPrices;
    if (!estimates || Object.values(estimates).some((price) => !Number.isFinite(Number(price)) || Number(price) <= 0)) {
      throw new HTTPException(400, { message: "All four estimated prices are required before making a decision" });
    }

    let updated = product;
    if (decision === "approve") {
      const approvedAt = new Date();
      const roles = Array.isArray(product.familyRoles) ? product.familyRoles : [];
      const approvedRoles = await Promise.all(roles.map(async (role) => {
        const sellingPriceEtb = Number(role.sellingPriceEtb ?? 0);
        if (sellingPriceEtb <= 0) return role;
        const normalized = await normalizeProductPrice(sellingPriceEtb, "ETB");
        return {
          ...role,
          price: normalized.priceUsd,
          currency: "ETB" as const,
          enteredPrice: sellingPriceEtb,
          exchangeRate: normalized.exchangeRate,
        };
      }));
      const approvedRole = approvedRoles.find((role) => role.customerType === "woman" && Number(role.sellingPriceEtb) > 0)
        ?? approvedRoles.find((role) => Number(role.sellingPriceEtb) > 0);
      const approvedEtb = Number(approvedRole?.sellingPriceEtb ?? estimates.woman);
      const normalized = await normalizeProductPrice(approvedEtb, "ETB");
      [updated] = await db.update(products).set({
        familyRoles: approvedRoles,
        approvedEstimatedPrices: estimates,
        designerPriceEtb: Number(approvedRole?.designerPriceEtb ?? estimates.woman).toFixed(2),
        markupAmountEtb: Number(approvedRole?.markupAmountEtb ?? 0).toFixed(2),
        priceUsd: normalized.priceUsd.toFixed(2),
        baseCurrency: "ETB",
        basePriceAmount: approvedEtb.toFixed(2),
        baseExchangeRate: normalized.exchangeRate.toFixed(4),
        priceStatus: "approved",
        telegramStatus: "approved",
        lastPriceApprovedAt: approvedAt,
        updatedAt: approvedAt,
      }).where(eq(products.id, productId)).returning();
    } else {
      [updated] = await db.update(products).set({
        priceStatus: "rejected",
        telegramStatus: "rejected",
        updatedAt: new Date(),
      }).where(eq(products.id, productId)).returning();
    }

    try {
      if (updated.telegramMessageId) {
        await editTelegramMessage(
          updated.telegramMessageId,
          designerEstimateCaption(updated, decision === "approve" ? "approved" : "declined"),
          decision === "approve" ? { inline_keyboard: [] } : approvalKeyboard(updated.id),
        );
      }
    } catch (error) {
      logger.error({ error, productId, decision }, "telegram_estimated_price_decision_sync_failed");
    }

    await db.insert(auditLogs).values({
      action: decision === "approve" ? "product_estimated_prices_approved" : "product_estimated_prices_declined",
      category: "inventory",
      severity: decision === "approve" ? "info" : "warning",
      entityType: "product",
      entityId: productId,
      performedBy: authUser?.email ?? "admin",
      details: decision === "approve" ? "Admin approved Telegram estimated prices" : "Admin declined Telegram estimated prices",
      metadata: { estimates, priceVersion: product.priceVersion },
    });
    return c.json({ data: await getProductDetailForAdmin(productId) });
  },
);

adminRouter.post(
  "/products/:productId/telegram/resend",
  requirePermission(PERMISSIONS.PRODUCTS_EDIT),
  zValidator("param", productParamSchema),
  async (c) => {
    const { productId } = c.req.valid("param");
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product) throw new HTTPException(404, { message: "Product not found" });
    if (!product.sendToTelegram) throw new HTTPException(400, { message: "Enable Telegram pricing before resending" });
    try {
      const telegramResult = await sendTelegramProduct(product);
      const [updated] = await db.update(products).set({ telegramStatus: "waiting_price", telegramMessageId: String(telegramResult.message.message_id), telegramTopicId: telegramResult.topicId, priceStatus: "waiting_price", updatedAt: new Date() }).where(eq(products.id, product.id)).returning();
      return c.json({ data: updated });
    } catch (error) {
      logger.error({ error, productId: product.id, region: product.region }, "telegram_product_resend_failed");
      await db.update(products).set({ telegramStatus: "not_sent", updatedAt: new Date() }).where(eq(products.id, product.id));
      throw new HTTPException(502, { message: error instanceof Error ? `Telegram resend failed: ${error.message}` : "Telegram resend failed" });
    }
  },
);

adminRouter.delete(
  "/products/:productId",
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  zValidator("param", productParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { productId } = c.req.valid("param");
    const row = await db.transaction(async (tx) => {
      const [deleted] = await tx.delete(products).where(eq(products.id, productId)).returning();
      if (!deleted) return null;

      await tx
        .delete(profitCostSettings)
        .where(and(eq(profitCostSettings.entityType, "product"), eq(profitCostSettings.entityId, productId)));

      return deleted ?? null;
    });

    if (!row) throw new HTTPException(404, { message: "Product not found" });

    await db.insert(auditLogs).values({
      action: "product_deleted",
      category: "inventory",
      severity: "warning",
      entityType: "product",
      entityId: productId,
      performedBy: authUser?.email ?? "admin",
      details: "Admin deleted product",
      metadata: { name: row.name },
    });

    return c.json({ data: row });
  },
);

adminRouter.post(
  "/orders/:orderId/documents",
  requireAnyPermission([PERMISSIONS.DOCUMENTS_UPLOAD, PERMISSIONS.DOCUMENTS_UPDATE]),
  zValidator("param", orderParamSchema),
  zValidator("json", documentSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { orderId } = c.req.valid("param");
    const body = c.req.valid("json");
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) {
      throw new HTTPException(404, { message: "Order not found" });
    }

    const now = new Date();
    const isPickupOrder = String(order.fulfillmentType ?? order.carrier ?? "").toLowerCase() === "pickup";
    const patch =
      body.type === "pickup_id"
        ? { pickupIdUrl: body.url, pickupIdUploadedAt: now }
        : body.type === "pickup_signed"
          ? {
              pickupSignedDocUrl: body.url,
              pickupSignedDocUploadedAt: now,
              ...(order.orderType === "mixed_order"
                ? {}
                : { status: "delivered", deliveryStatus: "picked_up", pickupCompletedAt: now }),
            }
          : body.type === "pickup_proof"
            ? {
                pickupProofUrl: body.url,
                pickupProofUploadedAt: now,
                ...(order.orderType === "mixed_order"
                  ? {}
                  : { status: "delivered", deliveryStatus: "picked_up" }),
              }
            : {
                shippingDocuments: [
                  ...(order.shippingDocuments ?? []),
                  { url: body.url, label: body.label ?? "Document", uploadedAt: now.toISOString() },
                ],
                ...(order.orderType === "mixed_order"
                  ? {}
                  : { status: isPickupOrder || order.status === "delivered" ? order.status : "shipped" }),
              };

    const [row] = await db
      .update(orders)
      .set({ ...patch, updatedAt: now })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(auditLogs).values({
      action: "order_document_uploaded",
      category: "order",
      severity: "info",
      entityType: "order",
      entityId: orderId,
      performedBy: authUser?.email ?? "admin",
      details: `Admin uploaded ${body.type}`,
      metadata: { type: body.type, label: body.label },
    });

    return c.json({ data: row }, 201);
  },
);

adminRouter.delete(
  "/orders/:orderId/documents",
  requirePermission(PERMISSIONS.DOCUMENTS_DELETE),
  zValidator("param", orderParamSchema),
  zValidator("json", deleteDocumentSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { orderId } = c.req.valid("param");
    const { index } = c.req.valid("json");
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) {
      throw new HTTPException(404, { message: "Order not found" });
    }
    const shippingDocuments = [...(order.shippingDocuments ?? [])];
    if (index >= shippingDocuments.length) {
      throw new HTTPException(404, { message: "Shipping document not found" });
    }
    shippingDocuments.splice(index, 1);
    const [row] = await db
      .update(orders)
      .set({ shippingDocuments, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();

    await db.insert(auditLogs).values({
      action: "order_document_removed",
      category: "order",
      severity: "info",
      entityType: "order",
      entityId: orderId,
      performedBy: authUser?.email ?? "admin",
      details: "Admin removed shipping document",
      metadata: { index },
    });

    return c.json({ data: row });
  },
);

// ─── Delete Order ─────────────────────────────────────────────────────────────

adminRouter.delete(
  "/orders/:orderId",
  requirePermission(PERMISSIONS.ORDERS_DELETE),
  zValidator("param", orderParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { orderId } = c.req.valid("param");
    const data = await deleteOrderForAdmin({
      orderId,
      performedBy: authUser?.email,
    });
    return c.json({ data });
  },
);

// ─── Delete Uploaded Design ───────────────────────────────────────────────────

const designParamSchema = z.object({
  designId: z.string().uuid(),
});

adminRouter.delete(
  "/uploaded-designs/:designId",
  requirePermission(PERMISSIONS.UPLOADED_DESIGNS_REVIEW),
  zValidator("param", designParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { designId } = c.req.valid("param");

    const design = await db.query.uploadedDesigns.findFirst({
      where: eq(uploadedDesigns.id, designId),
    });
    if (!design) {
      throw new HTTPException(404, { message: "Uploaded design not found" });
    }

    // Delete audit logs referencing this design
    await db.delete(auditLogs).where(
      and(eq(auditLogs.entityType, "uploaded_design"), eq(auditLogs.entityId, designId)),
    );

    // Delete the design
    const [deleted] = await db.delete(uploadedDesigns).where(eq(uploadedDesigns.id, designId)).returning();

    // Log the deletion
    await db.insert(auditLogs).values({
      action: "uploaded_design_deleted",
      category: "admin",
      severity: "warning",
      entityType: "uploaded_design",
      entityId: designId,
      performedBy: authUser?.email ?? "admin",
      details: `Admin deleted uploaded design ${design.submissionNumber}`,
      metadata: { submissionNumber: design.submissionNumber, userEmail: design.userEmail },
    });

    return c.json({ data: deleted });
  },
);
