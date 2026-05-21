import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { db } from "../../lib/db/drizzle.js";
import { auditLogs, orders, products, systemAlerts } from "../../lib/db/schema.js";
import { USER_ROLES } from "../../lib/auth/roles.js";
import { PERMISSIONS } from "../../lib/auth/permissions.js";
import {
  createEmployeeForAdmin,
  createCustomerForAdmin,
  deleteUserForAdmin,
  listUsersForAdmin,
  resetUserPasswordForAdmin,
  updateUserProfileForAdminService,
  updateRoleForAdmin,
  updateUserStatusForAdmin,
} from "../../services/users-service.js";
import { createRoleForAdmin, listRolesForAdmin, updateRolePermissionsForAdmin } from "../../services/roles-service.js";
import { getEffectivePermissionsForUser, listPermissionsForAdmin, updateUserPermissionsForAdmin } from "../../services/permissions-service.js";
import { getOrderReport, toOrderReportCsv } from "../../services/reports-service.js";
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
});
const createRoleSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(500).optional(),
});
const userParamSchema = z.object({
  userId: z.string().uuid(),
});
const rolePatchSchema = z.object({
  role: z.enum(USER_ROLES),
});
const userProfilePatchSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(320),
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
const rolePermissionsPatchSchema = z.object({
  permissions: z.array(z.string().trim().min(1)).max(100),
});
const orderReportQuerySchema = z.object({
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  customer: z.string().optional(),
  country: z.string().optional(),
});

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

adminRouter.post("/users/customers", requirePermission(PERMISSIONS.EMPLOYEES_CREATE), zValidator("json", createEmployeeSchema), async (c) => {
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
    const data = await updateRoleForAdmin({
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
  requirePermission(PERMISSIONS.EMPLOYEES_EDIT),
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

adminRouter.get("/products", requirePermission(PERMISSIONS.PRODUCTS_VIEW), zValidator("query", listQuerySchema), async (c) => {
  const { limit } = c.req.valid("query");
  const data = await db.query.products.findMany({
    orderBy: [desc(products.createdAt)],
    limit: limit ?? 200,
  });
  return c.json({ data });
});

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
