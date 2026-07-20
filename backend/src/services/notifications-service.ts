import { and, desc, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { db } from "../lib/db/drizzle.js";
import { systemAlertReads, systemAlerts } from "../lib/db/schema.js";
import {
  canReceiveNotification,
  notificationHref,
  notificationRuleForType,
  type NotificationCategory,
} from "../lib/auth/notification-policy.js";
import { getUserByEmail } from "../repositories/users-repository.js";
import { getEffectivePermissionsForUser } from "./permissions-service.js";

type NotificationSelector = {
  alertIds?: string[];
  entityId?: string;
  category?: NotificationCategory;
  all?: boolean;
};

async function notificationContext(email: string) {
  const user = await getUserByEmail(email.trim().toLowerCase());
  if (!user || user.status !== "active") {
    throw new HTTPException(403, { message: "Forbidden" });
  }
  const permissions = user.role === "admin" ? [] : await getEffectivePermissionsForUser(user.id);
  return { user, permissions, isAdmin: user.role === "admin" };
}

async function accessibleAlerts(email: string) {
  const context = await notificationContext(email);
  const rows = await db.query.systemAlerts.findMany({
    where: eq(systemAlerts.isResolved, false),
    orderBy: [desc(systemAlerts.createdAt)],
    limit: 500,
  });
  const accessible = rows.filter((row) => canReceiveNotification(String(row.type), context.permissions, context.isAdmin));
  const alertIds = accessible.map((row) => row.id);
  const reads = alertIds.length
    ? await db
        .select({ alertId: systemAlertReads.alertId })
        .from(systemAlertReads)
        .where(and(eq(systemAlertReads.userId, context.user.id), inArray(systemAlertReads.alertId, alertIds)))
    : [];
  const readIds = new Set(reads.map((row) => row.alertId));
  return { ...context, alerts: accessible, readIds };
}

function publicNotification(row: typeof systemAlerts.$inferSelect, isRead: boolean) {
  const type = String(row.type);
  const rule = notificationRuleForType(type);
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type,
    category: rule.category,
    severity: row.severity,
    entityId: row.entityId,
    href: notificationHref(type, row.entityId),
    isRead,
    createdAt: row.createdAt,
  };
}

function uniqueEntityIds(items: Array<{ entityId: string | null }>) {
  return Array.from(new Set(items.map((item) => item.entityId).filter((id): id is string => Boolean(id))));
}

export async function listNotificationsForUser(email: string, limit = 100) {
  const { alerts, readIds } = await accessibleAlerts(email);
  return alerts.slice(0, Math.min(Math.max(limit, 1), 200)).map((row) => publicNotification(row, readIds.has(row.id)));
}

export async function notificationSummaryForUser(email: string) {
  const { alerts, readIds } = await accessibleAlerts(email);
  const unread = alerts.filter((row) => !readIds.has(row.id));
  const byCategory = (category: NotificationCategory) =>
    unread.filter((row) => notificationRuleForType(String(row.type)).category === category);

  const orders = byCategory("orders");
  const customOrders = byCategory("custom_orders");
  const payments = byCategory("payments");
  const customDesigns = byCategory("custom_designs");
  const returns = byCategory("returns");
  const shipping = byCategory("shipping");
  const catalogPrices = byCategory("catalog_prices");
  const support = byCategory("support");
  const genericAlerts = byCategory("alerts");

  return {
    orders: orders.length,
    orderIds: uniqueEntityIds(orders),
    customOrders: customOrders.length,
    customOrderIds: uniqueEntityIds(customOrders),
    payments: payments.length,
    paymentIds: uniqueEntityIds(payments),
    customDesigns: customDesigns.length,
    customDesignIds: uniqueEntityIds(customDesigns),
    refundIssues: returns.length,
    refundIssueIds: uniqueEntityIds(returns),
    shippingDelivery: shipping.length,
    shippingDeliveryIds: uniqueEntityIds(shipping),
    catalogPrices: catalogPrices.length,
    catalogPriceProductIds: uniqueEntityIds(catalogPrices),
    support: support.length,
    alerts: genericAlerts.length,
    total: unread.length,
    notifications: unread.slice(0, 20).map((row) => publicNotification(row, false)),
  };
}

export async function markNotificationsReadForUser(email: string, selector: NotificationSelector) {
  const { user, alerts } = await accessibleAlerts(email);
  const alertIdSet = new Set(selector.alertIds ?? []);
  const selected = alerts.filter((row) => {
    if (selector.all) return true;
    if (alertIdSet.size && alertIdSet.has(row.id)) return true;
    if (selector.entityId && row.entityId === selector.entityId) {
      return !selector.category || notificationRuleForType(String(row.type)).category === selector.category;
    }
    if (selector.category && notificationRuleForType(String(row.type)).category === selector.category) return true;
    return false;
  });

  if (selected.length) {
    await db
      .insert(systemAlertReads)
      .values(selected.map((row) => ({ alertId: row.id, userId: user.id, readAt: new Date() })))
      .onConflictDoNothing();
  }
  return { count: selected.length };
}
