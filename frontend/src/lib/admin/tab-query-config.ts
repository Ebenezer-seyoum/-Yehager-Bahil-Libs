import type { AdminPageId, AdminWorkspaceData, TabAccent } from "./types";

export type TabQueryRule = {
  id: string;
  label: string;
  accent?: TabAccent;
  tableColumnsKey?: string;
  filterKey?: string;
  exportType?: string;
};

type Row = Record<string, unknown>;

function norm(value: unknown) {
  return String(value ?? "").toLowerCase().trim();
}

function isEmployee(user: Row) {
  return ["employee", "admin"].includes(norm(user.role));
}

function isCustomer(user: Row) {
  return norm(user.role) === "customer";
}

function isPaid(row: Row) {
  return ["paid", "succeeded", "complete", "completed"].includes(norm(row.paymentStatus));
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function isRecent(dateValue: unknown, days = 30) {
  if (!dateValue) return false;
  const date = new Date(String(dateValue));
  return !Number.isNaN(date.getTime()) && date >= daysAgo(days);
}

function productStock(product: Row) {
  const stock = Number(product.stockQuantity ?? product.stock ?? product.quantity ?? 999);
  return Number.isFinite(stock) ? stock : 999;
}

function materialStatus(product: Row) {
  const materials = product.productionMaterials;
  if (!Array.isArray(materials) || materials.length === 0) return "material_not_assigned";
  if (
    materials.some((row) => {
      const material = row as Record<string, unknown>;
      return Number(material.availableQty ?? 0) < Number(material.requiredQty ?? 0);
    })
  ) {
    return "material_shortage";
  }
  if (
    materials.some((row) => {
      const material = row as Record<string, unknown>;
      return Number(material.availableQty ?? 0) <= Number(material.lowStockLevel ?? 0);
    })
  ) {
    return "low_material";
  }
  return "ready_to_produce";
}

function filterOrders(orders: Row[], tabId: string): Row[] {
  switch (tabId) {
    case "new":
      return orders.filter((o) => isRecent(o.createdAt, 7));
    case "pending":
      return orders.filter((o) => norm(o.status) === "pending");
    case "processing":
      return orders.filter((o) => ["processing", "quality_check"].includes(norm(o.status)));
    case "tailoring":
      return orders.filter((o) => norm(o.status) === "tailoring" || Boolean(o.measurementStatus));
    case "ready":
      return orders.filter((o) => ["ready_for_pickup", "shipped"].includes(norm(o.status)));
    case "delivered":
      return orders.filter((o) => ["delivered", "picked_up"].includes(norm(o.status)));
    case "cancelled":
      return orders.filter((o) => ["cancelled", "canceled"].includes(norm(o.status)));
    case "returned":
      return orders.filter((o) => norm(o.status) === "returned");
    case "custom":
      return orders.filter((o) => Boolean(o.measurementStatus) || norm(o.status) === "tailoring");
    default:
      return orders;
  }
}

function filterProducts(products: Row[], tabId: string): Row[] {
  switch (tabId) {
    case "active":
      return products.filter((p) => p.isActive !== false);
    case "draft":
      return products.filter((p) => p.isActive === false);
    case "low-stock":
      return products.filter((p) => ["low_material", "material_shortage", "material_not_assigned"].includes(materialStatus(p)) || (productStock(p) > 0 && productStock(p) <= 5));
    case "out-of-stock":
      return products.filter((p) => productStock(p) <= 0);
    case "featured":
      return products.filter((p) => Boolean(p.isFeatured));
    case "best-selling":
      return [...products].sort(
        (a, b) => Number(b.totalSold ?? b.soldCount ?? 0) - Number(a.totalSold ?? a.soldCount ?? 0),
      );
    case "categories":
      return products.filter((p) => p.category || p.region || p.subcategory);
    case "variants":
      return products.filter((p) => {
        const roles = p.familyRoles;
        return (Array.isArray(roles) && roles.length > 0) || p.gender || p.fabricType;
      });
    case "images":
      return products.filter((p) => Array.isArray(p.images) && (p.images as unknown[]).length > 0);
    default:
      return products;
  }
}

function filterSections(sections: Row[], tabId: string): Row[] {
  switch (tabId) {
    case "active":
      return sections.filter((section) => section.isActive !== false);
    case "inactive":
      return sections.filter((section) => section.isActive === false);
    default:
      return sections;
  }
}

function filterAlerts(alerts: Row[], tabId: string): Row[] {
  const actionableTypes = new Set([
    "payment_review",
    "payment_proof_uploaded",
    "custom_design_submitted",
    "design_review",
    "custom_design_awaiting_payment",
    "new_order",
    "new_catalog_order",
    "refund_issue",
    "refund_requested",
    "return_refund",
    "refund_pending",
  ]);
  switch (tabId) {
    case "new":
      return alerts.filter((alert) => !alert.isResolved && actionableTypes.has(norm(alert.type)));
    case "read":
      return alerts.filter((alert) => Boolean(alert.isResolved));
    case "archived":
      return [];
    default:
      return alerts;
  }
}

function filterUsers(users: Row[], tabId: string, kind: "employee" | "customer"): Row[] {
  const base = users.filter(kind === "employee" ? isEmployee : isCustomer);
  switch (tabId) {
    case "active":
      return base.filter((u) => norm(u.accountStatus ?? u.status) === "active");
    case "inactive":
      return base.filter((u) => {
        const s = norm(u.accountStatus ?? u.status);
        return s !== "active";
      });
    case "new":
      return base.filter((u) => isRecent(u.createdAt, 10));
    case "access_pending":
    case "unassigned":
      if (kind !== "employee") return base;
      return base.filter((u) => {
        const roleStatus = norm(u.roleStatus);
        const assignedRoleId = norm(u.assignedRoleId);
        return roleStatus === "unassigned" || !assignedRoleId || assignedRoleId === "null" || assignedRoleId === "undefined";
      });
    case "top":
      return [...base].sort((a, b) => Number(b.totalSpent ?? 0) - Number(a.totalSpent ?? 0));
    default:
      return base;
  }
}

function filterPayments(orders: Row[], tabId: string): Row[] {
  const paymentRows = orders.filter(
    (o) => o.paymentMethod || o.paymentCurrency || o.paymentStatus,
  );

  switch (tabId) {
    case "overview":
    case "all":
      return paymentRows;
    case "stripe":
      return paymentRows.filter(
        (o) => norm(o.paymentMethod).includes("stripe") || norm(o.paymentMethod) === "card",
      );
    case "bank":
      return paymentRows.filter((o) =>
        ["bank", "transfer", "qr", "mobile", "etb"].some((k) => norm(o.paymentMethod).includes(k)),
      );
    case "pending":
      return paymentRows.filter((o) => ["awaiting_verification", "pending"].includes(norm(o.paymentStatus)));
    case "verified":
      return paymentRows.filter((o) => norm(o.paymentStatus) === "paid");
    case "failed":
      return paymentRows.filter((o) => norm(o.paymentStatus) === "failed");
    case "refunds":
      return paymentRows.filter((o) => norm(o.paymentStatus) === "refunded");
    case "currency":
      return [...paymentRows].sort((a, b) =>
        String(a.paymentCurrency ?? "USD").localeCompare(String(b.paymentCurrency ?? "USD")),
      );
    case "tax":
      return paymentRows.filter(
        (o) =>
          isPaid(o) ||
          Number(o.taxAmount ?? o.tax ?? o.vatAmount ?? 0) > 0 ||
          norm(o.paymentStatus) === "paid",
      );
    default:
      return paymentRows;
  }
}

function filterDocuments(orders: Row[], tabId: string): Row[] {
  switch (tabId) {
    case "pickup":
      return orders.filter((o) => norm(o.fulfillmentType) === "pickup");
    case "mailed":
      return orders.filter((o) => norm(o.fulfillmentType) !== "pickup");
    case "needs_review":
      return orders.filter((o) => {
        const isPickup = norm(o.fulfillmentType) === "pickup";
        const missingPickupDocs = isPickup && (!o.pickupIdUrl || !o.pickupSignedDocUrl);
        const awaitingVerification = norm(o.paymentStatus) === "awaiting_verification";
        return missingPickupDocs || awaitingVerification;
      });
    case "payment_proof":
      return orders.filter((o) => Boolean(o.paymentProofUrl));
    case "complete":
      return orders.filter((o) => {
        const isPickup = norm(o.fulfillmentType) === "pickup";
        const pickupComplete = !isPickup || (Boolean(o.pickupIdUrl) && Boolean(o.pickupSignedDocUrl));
        const shippingComplete = isPickup || (Array.isArray(o.shippingDocuments) && (o.shippingDocuments as unknown[]).length > 0);
        return pickupComplete && shippingComplete;
      });
    default:
      return orders;
  }
}

function filterAudit(rows: Row[], tabId: string): Row[] {
  switch (tabId) {
    case "admin":
      return rows.filter((r) => norm(r.actorRole).includes("admin") || norm(r.entityType) === "user");
    case "orders":
      return rows.filter((r) => norm(r.entityType).includes("order"));
    case "payments":
      return rows.filter((r) => norm(r.action).includes("payment") || norm(r.entityType).includes("payment"));
    case "products":
      return rows.filter((r) => norm(r.entityType).includes("product"));
    case "customers":
      return rows.filter((r) => norm(r.entityType).includes("customer") || norm(r.action).includes("customer"));
    case "security":
      return rows.filter((r) => norm(r.action).includes("security") || norm(r.action).includes("permission"));
    case "errors":
      return rows.filter((r) => norm(r.severity) === "error" || norm(r.level) === "error");
    default:
      return rows;
  }
}

function filterUploadedDesigns(rows: Row[], tabId: string): Row[] {
  if (tabId === "all") return rows;
  if (tabId === "pending_review") {
    return rows.filter((row) => ["submitted", "in_review"].includes(norm(row.status)));
  }
  if (tabId === "completed_request") {
    return rows.filter((row) => ["completed_request", "approved"].includes(norm(row.status)));
  }
  return rows.filter((row) => norm(row.status) === norm(tabId));
}

function filterDashboard(data: AdminWorkspaceData, tabId: string): AdminWorkspaceData {
  const orders = data.orders ?? [];
  const users = data.users ?? [];
  const products = data.products ?? [];
  const alerts = data.alerts ?? [];

  switch (tabId) {
    case "sales":
      return { ...data, orders: orders.filter(isPaid) };
    case "orders":
      return { ...data, orders };
    case "customers":
      return { ...data, users: users.filter(isCustomer) };
    case "products":
      return { ...data, products };
    case "payments":
      return { ...data, orders: filterPayments(orders, "all") };
    case "delivery":
      return {
        ...data,
        orders: orders.filter((o) =>
          ["shipped", "delivered", "picked_up", "ready_for_pickup"].includes(norm(o.status)),
        ),
      };
    case "alerts":
      return { ...data, alerts: alerts.filter((a) => !a.isResolved) };
    default:
      return data;
  }
}

/** Apply tab query rules to workspace data (real API rows). */
export function applyTabQuery(
  pageId: AdminPageId,
  tabId: string,
  data: AdminWorkspaceData,
): AdminWorkspaceData {
  const orders = data.orders ?? [];
  const products = data.products ?? [];
  const users = data.users ?? [];
  const audit = data.audit ?? [];
  const uploadedDesigns = data.uploadedDesigns ?? [];
  const sections = data.sections ?? [];
  const alerts = data.alerts ?? [];

  switch (pageId) {
    case "dashboard":
      return filterDashboard(data, tabId);
    case "orders":
      return { ...data, orders: filterOrders(orders, tabId) };
    case "payments":
      return { ...data, orders: filterPayments(orders, tabId) };
    case "products":
      return { ...data, products: filterProducts(products, tabId) };
    case "sections":
      return { ...data, sections: filterSections(sections, tabId) };
    case "employees":
      return { ...data, users: filterUsers(users, tabId, "employee") };
    case "customers":
      return { ...data, users: filterUsers(users, tabId, "customer") };
    case "activity-logs":
      return { ...data, audit: filterAudit(audit, tabId) };
    case "alerts":
      return { ...data, alerts: filterAlerts(alerts, tabId) };
    case "uploaded-designs":
      return { ...data, uploadedDesigns: filterUploadedDesigns(uploadedDesigns, tabId) };
    case "documents":
      return { ...data, orders: filterDocuments(orders, tabId) };
    default:
      return data;
  }
}

export function getTableColumnsKey(pageId: AdminPageId, tabId: string) {
  return `${pageId}:${tabId}`;
}
