import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { asc, desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { db } from "../../lib/db/drizzle.js";
import { auditLogs, homepageSections, orders, products, systemAlerts, uploadedDesigns } from "../../lib/db/schema.js";
import { USER_ROLES } from "../../lib/auth/roles.js";
import { PERMISSIONS } from "../../lib/auth/permissions.js";
import {
  assignEmployeeAccessForAdmin,
  createEmployeeForAdmin,
  createCustomerForAdmin,
  deleteCustomerForAdmin,
  deleteUserForAdmin,
  getCustomerDetailForAdmin,
  getEmployeeDetailForAdmin,
  listCustomerMeasurementsForAdmin,
  listCustomersForAdmin,
  listUsersForAdmin,
  resetCustomerPasswordForAdmin,
  resetUserPasswordForAdmin,
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
import type { AppBindings } from "../../types/hono.js";

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
  gender: z.enum(["male", "female", "unisex"]),
});
const productPatchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  region: z.string().trim().min(1).optional(),
  subcategory: z.string().trim().optional(),
  category: z.string().trim().optional(),
  priceUsd: z.coerce.number().positive().optional(),
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
});
const createProductSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  region: z.string().trim().min(1),
  subcategory: z.string().trim().optional(),
  category: z.string().trim().optional(),
  priceUsd: z.coerce.number().positive(),
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
  appliesTo: z.enum(["all_orders", "catalog_orders", "custom_orders"]),
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
const createEmployeeSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  roleId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
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
}).refine((value) => Boolean(value.name || value.email || value.phone || value.accountStatus || value.avatarUrl || value.profile), {
  message: "At least one field must be provided",
});
const userStatusPatchSchema = z.object({
  status: z.enum(["active", "inactive", "suspended"]),
});
const userPasswordResetSchema = z.object({
  password: z.string().min(8).max(128),
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
  const catalogTypes = new Set(["new_order", "new_catalog_order"]);
  const refundTypes = new Set(["refund_issue", "refund_requested", "return_refund", "refund_pending"]);

  const counts = {
    payment: 0,
    custom_request: 0,
    custom_order: 0,
    catalog_order: 0,
    refund_issue: 0,
    total: 0,
    paymentIds: [] as string[],
    customRequestIds: [] as string[],
    customOrderIds: [] as string[],
    catalogOrderIds: [] as string[],
    refundIssueIds: [] as string[],
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
    if (orderType === "custom_order" || orderType === "custom_design_order") return true;
    if (orderType === "group_order") return orderHasUploadedDesign(order);
    return false;
  }

  function orderNeedsReview(order: typeof orderRows[number]) {
    return ["pending", "processing"].includes(String(order.status ?? "").toLowerCase()) ||
      String(order.paymentStatus ?? "").toLowerCase() === "awaiting_verification";
  }

  function hasPaymentRecord(order: typeof orderRows[number]) {
    return Boolean(order.paymentStatus || order.paymentMethod || order.paymentCurrency);
  }

  const customRequestRows = designRows.filter((design) =>
    ["submitted", "in_review", "under_review", "needs_changes"].includes(String(design.status ?? "").toLowerCase()),
  );
  const customOrderRows = orderRows.filter((order) => isCustomOrder(order) && orderNeedsReview(order));
  const catalogOrderRows = orderRows.filter((order) => !isCustomOrder(order) && orderNeedsReview(order));
  const paymentRows = orderRows.filter((order) => hasPaymentRecord(order));

  counts.custom_request = customRequestRows.length;
  counts.customRequestIds = customRequestRows.map((design) => String(design.id));
  counts.custom_order = customOrderRows.length;
  counts.customOrderIds = customOrderRows.map((order) => String(order.id));
  counts.catalog_order = catalogOrderRows.length;
  counts.catalogOrderIds = catalogOrderRows.map((order) => String(order.id));
  counts.payment = paymentRows.length;
  counts.paymentIds = paymentRows.map((order) => String(order.id));

  unresolvedAlerts.forEach((alert) => {
    const entityId = alert.entityId ? String(alert.entityId) : null;
    const order = entityId ? orderById.get(entityId) : null;
    const type = String(alert.type ?? "");

    if (customRequestTypes.has(type)) {
      if (entityId && !counts.customRequestIds.includes(entityId)) {
        counts.custom_request++;
        counts.customRequestIds.push(entityId);
      }
      return;
    }
    if (refundTypes.has(type)) {
      counts.refund_issue++;
      if (entityId) counts.refundIssueIds.push(entityId);
      return;
    }
    if (catalogTypes.has(type)) {
      if (isCustomOrder(order)) {
        if (entityId && !counts.customOrderIds.includes(entityId)) {
          counts.custom_order++;
          counts.customOrderIds.push(entityId);
        }
      } else {
        if (entityId && !counts.catalogOrderIds.includes(entityId)) {
          counts.catalog_order++;
          counts.catalogOrderIds.push(entityId);
        }
      }
    }
  });

  counts.total = counts.payment + counts.custom_request + counts.custom_order + counts.catalog_order + counts.refund_issue;

  return c.json({ data: counts });
});

adminRouter.get("/audit", requirePermission(PERMISSIONS.AUDIT_VIEW), zValidator("query", listQuerySchema), async (c) => {
  const { limit } = c.req.valid("query");
  const data = await db.query.auditLogs.findMany({
    orderBy: [desc(auditLogs.createdAt)],
    limit: limit ?? 150,
  });
  return c.json({ data });
});

adminRouter.get("/audit/:auditId", requirePermission(PERMISSIONS.AUDIT_VIEW), async (c) => {
  const auditId = c.req.param("auditId");
  const data = await db.query.auditLogs.findFirst({
    where: eq(auditLogs.id, auditId),
  });
  if (!data) {
    throw new HTTPException(404, { message: "Audit log not found" });
  }
  return c.json({ data });
});

adminRouter.get("/users", requirePermission(PERMISSIONS.EMPLOYEES_VIEW), zValidator("query", listQuerySchema), async (c) => {
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
    const data = await deleteCustomerForAdmin({
      userId,
      performedBy: authUser?.email,
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
  requirePermission(PERMISSIONS.ROLES_CREATE),
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
  requirePermission(PERMISSIONS.ROLES_EDIT),
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
  requirePermission(PERMISSIONS.ROLES_DELETE),
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
  requirePermission(PERMISSIONS.REPORTS_VIEW),
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
  requirePermission(PERMISSIONS.ROLES_MANAGE),
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

adminRouter.post("/users/customers", requirePermission(PERMISSIONS.CUSTOMERS_CREATE), zValidator("json", createEmployeeSchema), async (c) => {
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
  requirePermission(PERMISSIONS.EMPLOYEES_ASSIGN),
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
  requirePermission(PERMISSIONS.EMPLOYEES_STATUS_UPDATE),
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
  zValidator("json", userPasswordResetSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { userId } = c.req.valid("param");
    const { password } = c.req.valid("json");
    const data = await resetUserPasswordForAdmin({
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
    const data = await deleteUserForAdmin({
      userId,
      performedBy: authUser?.email,
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
  const data = await db.query.products.findMany({
    orderBy: [desc(products.createdAt)],
    limit: limit ?? 200,
  });
  return c.json({ data });
});

adminRouter.get(
  "/products/:productId",
  requirePermission(PERMISSIONS.PRODUCTS_VIEW),
  zValidator("param", productParamSchema),
  async (c) => {
    const { productId } = c.req.valid("param");
    const data = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    if (!data) {
      throw new HTTPException(404, { message: "Product not found" });
    }
    return c.json({ data });
  },
);


adminRouter.post(
  "/products",
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  zValidator("json", createProductSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const body = c.req.valid("json");
    const [row] = await db
      .insert(products)
      .values({
        name: body.name,
        description: body.description,
        region: body.region,
        subcategory: body.subcategory,
        category: body.category,
        priceUsd: body.priceUsd.toFixed(2),
        groomPriceUsd: body.groomPriceUsd == null ? null : body.groomPriceUsd.toFixed(2),
        familyRoles: body.familyRoles ?? undefined,
        uniqueId: body.uniqueId,
        images: body.images,
        fabricType: body.fabricType,
        embroideryStyle: body.embroideryStyle,
        gender: body.gender,
        tailoringDays: body.tailoringDays ?? 30,
        isActive: body.isActive ?? true,
        isFeatured: body.isFeatured ?? false,
      })
      .returning();

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
    if (Object.keys(body).length === 0) {
      throw new HTTPException(400, { message: "At least one product field must be updated" });
    }

    const [row] = await db
      .update(products)
      .set({
        name: body.name,
        description: body.description,
        region: body.region,
        subcategory: body.subcategory,
        category: body.category,
        priceUsd: body.priceUsd !== undefined ? body.priceUsd.toFixed(2) : undefined,
        groomPriceUsd:
          body.groomPriceUsd === undefined
            ? undefined
            : body.groomPriceUsd == null
              ? null
              : body.groomPriceUsd.toFixed(2),
        familyRoles: body.familyRoles === undefined ? undefined : body.familyRoles,
        uniqueId: body.uniqueId,
        gender: body.gender,
        fabricType: body.fabricType,
        embroideryStyle: body.embroideryStyle,
        tailoringDays: body.tailoringDays,
        images: body.images,
        isActive: body.isActive,
        isFeatured: body.isFeatured,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (!row) {
      throw new HTTPException(404, { message: "Product not found" });
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

    return c.json({ data: row });
  },
);

adminRouter.delete(
  "/products/:productId",
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  zValidator("param", productParamSchema),
  async (c) => {
    const authUser = c.get("authUser");
    const { productId } = c.req.valid("param");
    const [row] = await db
      .update(products)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (!row) {
      throw new HTTPException(404, { message: "Product not found" });
    }

    await db.insert(auditLogs).values({
      action: "product_archived",
      category: "inventory",
      severity: "warning",
      entityType: "product",
      entityId: productId,
      performedBy: authUser?.email ?? "admin",
      details: "Admin archived product",
      metadata: { name: row.name },
    });

    return c.json({ data: row });
  },
);

adminRouter.post(
  "/orders/:orderId/documents",
  requirePermission(PERMISSIONS.ORDERS_EDIT),
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
    const patch =
      body.type === "pickup_id"
        ? { pickupIdUrl: body.url, pickupIdUploadedAt: now }
        : body.type === "pickup_signed"
          ? { pickupSignedDocUrl: body.url, pickupSignedDocUploadedAt: now, status: "picked_up", pickupCompletedAt: now }
          : body.type === "pickup_proof"
            ? { pickupProofUrl: body.url, pickupProofUploadedAt: now, status: "picked_up" }
            : {
                shippingDocuments: [
                  ...(order.shippingDocuments ?? []),
                  { url: body.url, label: body.label ?? "Document", uploadedAt: now.toISOString() },
                ],
                status: order.status === "delivered" ? order.status : "shipped",
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
  requirePermission(PERMISSIONS.ORDERS_EDIT),
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
