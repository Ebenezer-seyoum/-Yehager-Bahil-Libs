import { desc } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { auditLogs, eventParticipants, orders, products, systemAlerts } from "../lib/db/schema.js";
import { listAllOrders } from "../repositories/orders-repository.js";
import { listUsers } from "../repositories/users-repository.js";

export type ReportDateRangeKey = "Today" | "Last 7 Days" | "Last 30 Days" | "This Month" | "This Year";

export type ReportsCenterQuery = {
  category?: string;
  report?: string;
  dateRange?: ReportDateRangeKey;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  country?: string;
  city?: string;
  customer?: string;
  employee?: string;
  driver?: string;
  product?: string;
  productCategory?: string;
  refundStatus?: string;
  ticketStatus?: string;
  priority?: string;
  search?: string;
  amountMin?: number;
  amountMax?: number;
  stockLevel?: string;
};

export type ReportsCenterDataset = {
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
};

export type ReportsCenterPayload = {
  generatedAt: string;
  query: ReportsCenterQuery;
  orders: ReportsCenterDataset;
  products: ReportsCenterDataset;
  customers: ReportsCenterDataset;
  delivery: ReportsCenterDataset;
  financial: ReportsCenterDataset;
  support: ReportsCenterDataset;
};

type OrderRow = Awaited<ReturnType<typeof listAllOrders>>[number] & {
  country?: string;
  city?: string;
};

type ProductRow = Awaited<ReturnType<typeof db.query.products.findMany>>[number];
type CustomerRow = Awaited<ReturnType<typeof listUsers>>[number] & {
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string | Date | null;
  country?: string;
  city?: string;
  statusLabel?: string;
};

function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().trim();
}

function toNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function toDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateRangeBounds(range: ReportDateRangeKey) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case "Today":
      break;
    case "Last 7 Days":
      start.setDate(end.getDate() - 6);
      break;
    case "Last 30 Days":
      start.setDate(end.getDate() - 29);
      break;
    case "This Month":
      start.setDate(1);
      break;
    case "This Year":
      start.setMonth(0, 1);
      break;
    default:
      start.setDate(end.getDate() - 29);
  }

  return { start, end };
}

function isWithinDateRange(value: unknown, range?: ReportDateRangeKey) {
  if (!range) return true;
  const date = toDate(value);
  if (!date) return false;
  const { start, end } = getDateRangeBounds(range);
  return date >= start && date <= end;
}

function getCountry(row: Record<string, unknown>) {
  const country = row.country ?? row.shippingCountry ?? (row.shippingAddress as { country?: string } | undefined)?.country;
  return typeof country === "string" ? country : "";
}

function getCity(row: Record<string, unknown>) {
  const city = row.city ?? (row.shippingAddress as { city?: string } | undefined)?.city ?? (row.shippingAddress as { town?: string } | undefined)?.town;
  return typeof city === "string" ? city : "";
}

function getOrderItems(order: Record<string, unknown>) {
  return Array.isArray(order.items) ? (order.items as Record<string, unknown>[]) : [];
}

function isPaid(order: Record<string, unknown>) {
  return ["paid", "succeeded", "complete", "completed"].includes(normalize(order.paymentStatus));
}

function isDelivered(order: Record<string, unknown>) {
  return ["delivered", "picked_up", "completed"].includes(normalize(order.status));
}

function isCancelled(order: Record<string, unknown>) {
  return ["cancelled", "canceled", "failed"].includes(normalize(order.status));
}

function isPending(order: Record<string, unknown>) {
  return ["pending", "processing", "in_progress"].includes(normalize(order.status));
}

function matchesSearch(row: Record<string, unknown>, search?: string) {
  const needle = normalize(search);
  if (!needle) return true;

  return [
    row.orderNumber,
    row.customerName,
    row.userEmail,
    row.name,
    row.email,
    row.title,
    row.message,
    row.subject,
    row.productName,
    row.category,
    row.driver,
    row.city,
    row.country,
  ].some((value) => normalize(value).includes(needle));
}

function matchesAmountRange(row: Record<string, unknown>, filters: ReportsCenterQuery) {
  const amount = toNumber(row.totalUsd ?? row.total ?? row.amount ?? row.revenueUsd ?? row.netRevenue);
  if (filters.amountMin !== undefined && amount < filters.amountMin) return false;
  if (filters.amountMax !== undefined && amount > filters.amountMax) return false;
  return true;
}

function filterRows(rows: Record<string, unknown>[], filters: ReportsCenterQuery, family: "orders" | "products" | "customers" | "delivery" | "financial" | "support") {
  return rows.filter((row) => {
    const dateMatch = isWithinDateRange(row.createdAt, filters.dateRange);
    const searchMatch = matchesSearch(row, filters.search ?? filters.customer ?? filters.product);
    const countryMatch = !filters.country || normalize(filters.country) === "all countries" || normalize(row.country ?? getCountry(row)).includes(normalize(filters.country));

    if (family === "orders" || family === "delivery" || family === "financial") {
      const statusMatch = !filters.status || normalize(filters.status) === "all status" || normalize(row.status) === normalize(filters.status) || normalize(row.deliveryStatus) === normalize(filters.status);
      const paymentMatch = !filters.paymentMethod || normalize(filters.paymentMethod) === "all methods" || normalize(row.paymentMethod ?? row.paymentStatus) === normalize(filters.paymentMethod) || normalize(row.paymentStatus) === normalize(filters.paymentStatus);
      const employeeMatch = !filters.employee || normalize(filters.employee) === "all employees" || normalize(row.employeeName ?? row.assignedEmployee) === normalize(filters.employee);
      const driverMatch = !filters.driver || normalize(filters.driver) === "all drivers" || normalize(row.driver ?? row.deliveryDriver ?? row.assignedDriver) === normalize(filters.driver);
      const cityMatch = !filters.city || normalize(row.city ?? getCity(row)).includes(normalize(filters.city));
      const amountMatch = matchesAmountRange(row, filters);

      return dateMatch && searchMatch && countryMatch && statusMatch && paymentMatch && employeeMatch && driverMatch && cityMatch && amountMatch;
    }

    if (family === "products") {
      const categoryMatch = !filters.productCategory || normalize(filters.productCategory) === "all categories" || normalize(row.category ?? row.sectionName) === normalize(filters.productCategory);
      const productMatch = !filters.product || normalize(row.name ?? row.productName).includes(normalize(filters.product));
      const stockLevelMatch = !filters.stockLevel || normalize(filters.stockLevel) === "all stock" || normalize(row.stockState ?? row.inventoryStatus).includes(normalize(filters.stockLevel));
      return dateMatch && searchMatch && countryMatch && categoryMatch && productMatch && stockLevelMatch;
    }

    if (family === "customers") {
      const cityMatch = !filters.city || normalize(row.city ?? "").includes(normalize(filters.city));
      const statusMatch = !filters.status || normalize(filters.status) === "all status" || normalize(row.statusLabel ?? row.status) === normalize(filters.status);
      return dateMatch && searchMatch && countryMatch && cityMatch && statusMatch;
    }

    if (family === "support") {
      const ticketStatusMatch = !filters.ticketStatus || normalize(filters.ticketStatus) === "all status" || normalize(row.status) === normalize(filters.ticketStatus) || normalize(row.alertStatus) === normalize(filters.ticketStatus);
      const priorityMatch = !filters.priority || normalize(filters.priority) === "all priority" || normalize(row.priority ?? row.severity) === normalize(filters.priority);
      return dateMatch && searchMatch && countryMatch && ticketStatusMatch && priorityMatch;
    }

    return dateMatch && searchMatch && countryMatch;
  });
}

function buildCustomerRows(users: CustomerRow[], ordersRows: OrderRow[]) {
  const customerMap = new Map<string, CustomerRow>();

  for (const user of users) {
    const email = String(user.email ?? "").toLowerCase();
    if (!email) continue;
    customerMap.set(email, {
      ...user,
      totalOrders: 0,
      totalSpent: 0,
      country: user.country ?? "",
      city: user.city ?? "",
      statusLabel: user.status ?? "active",
    });
  }

  for (const order of ordersRows) {
    const email = String(order.userEmail ?? order.customerEmail ?? "").toLowerCase();
    if (!email) continue;
    const existing = customerMap.get(email) ?? {
      id: order.userId ?? order.id,
      email: order.userEmail,
      name: order.customerName ?? order.userEmail,
      status: "active",
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      totalOrders: 0,
      totalSpent: 0,
      country: getCountry(order),
      city: getCity(order),
      statusLabel: "active",
    };

    existing.totalOrders = toNumber(existing.totalOrders) + 1;
    existing.totalSpent = toNumber(existing.totalSpent) + toNumber(order.totalUsd ?? order.total);
    if (!existing.country) existing.country = getCountry(order);
    if (!existing.city) existing.city = getCity(order);
    existing.lastOrderDate = order.createdAt ?? existing.lastOrderDate;
    customerMap.set(email, existing as CustomerRow);
  }

  return Array.from(customerMap.values()).sort((a, b) => toNumber(b.totalSpent) - toNumber(a.totalSpent));
}

function buildProductRows(productsRows: ProductRow[], ordersRows: OrderRow[], alerts: Record<string, unknown>[]) {
  const usage = new Map<string, { unitsSold: number; revenueUsd: number }>();
  const nameUsage = new Map<string, { unitsSold: number; revenueUsd: number }>();

  for (const order of ordersRows) {
    for (const item of getOrderItems(order)) {
      const productId = String(item.product_id ?? item.productId ?? "").trim();
      const productName = String(item.product_name ?? item.productName ?? "").trim();
      const quantity = toNumber(item.quantity ?? 1);
      const lineTotal = toNumber(item.line_total_usd ?? item.lineTotalUsd ?? item.line_total ?? item.totalUsd);

      if (productId) {
        const bucket = usage.get(productId) ?? { unitsSold: 0, revenueUsd: 0 };
        bucket.unitsSold += quantity;
        bucket.revenueUsd += lineTotal;
        usage.set(productId, bucket);
      }

      if (productName) {
        const bucket = nameUsage.get(productName.toLowerCase()) ?? { unitsSold: 0, revenueUsd: 0 };
        bucket.unitsSold += quantity;
        bucket.revenueUsd += lineTotal;
        nameUsage.set(productName.toLowerCase(), bucket);
      }
    }
  }

  const lowStockAlerts = new Map<string, number>();
  for (const alert of alerts) {
    if (normalize(alert.type) !== "low_stock") continue;
    const entityId = String(alert.entityId ?? "").trim();
    if (!entityId) continue;
    lowStockAlerts.set(entityId, (lowStockAlerts.get(entityId) ?? 0) + 1);
  }

  return productsRows.map((product) => {
    const usageById = usage.get(product.id) ?? { unitsSold: 0, revenueUsd: 0 };
    const usageByName = nameUsage.get(String(product.name ?? "").toLowerCase()) ?? { unitsSold: 0, revenueUsd: 0 };
    const stockAlertCount = lowStockAlerts.get(product.id) ?? 0;

    return {
      id: product.id,
      name: product.name,
      category: product.category ?? "Uncategorized",
      region: product.region,
      subcategory: product.subcategory,
      gender: product.gender,
      priceUsd: product.priceUsd,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      tailoringDays: product.tailoringDays,
      images: product.images,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      unitsSold: usageById.unitsSold || usageByName.unitsSold,
      revenueUsd: usageById.revenueUsd || usageByName.revenueUsd,
      lowStockAlertCount: stockAlertCount,
      stockState: stockAlertCount > 0 ? "Low stock alert" : product.isActive ? "In catalog" : "Inactive",
    };
  });
}

function buildDeliveryRows(ordersRows: OrderRow[]) {
  return ordersRows.map((order) => ({
    deliveryId: order.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    driver: order.carrier ?? order.pickupPersonName ?? order.pickupLocation ?? "Not assigned",
    customer: order.customerName,
    location: [getCity(order), getCountry(order)].filter(Boolean).join(", ") || getCountry(order) || "Unknown",
    status: order.status,
    deliveryStatus: order.status,
    deliveryDate: order.updatedAt ?? order.createdAt,
    deliveryTime: order.updatedAt && order.createdAt ? `${Math.max(0, Math.round((new Date(String(order.updatedAt)).getTime() - new Date(String(order.createdAt)).getTime()) / 3_600_000))}h` : "Unknown",
    employee: order.employeeName ?? order.assignedEmployee ?? "Unassigned",
    country: getCountry(order),
    city: getCity(order),
    createdAt: order.createdAt,
  }));
}

function buildFinancialRows(ordersRows: OrderRow[]) {
  return ordersRows.map((order) => {
    const total = toNumber(order.totalUsd ?? order.total);
    const shipping = toNumber(order.shippingCostUsd);
    const refundStatus = normalize(order.paymentStatus) === "refunded" || normalize(order.status) === "cancelled" ? "Refunded" : "Not refunded";

    return {
      transactionId: order.stripeSessionId ?? order.id,
      date: order.createdAt,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      amount: total,
      currency: order.paymentCurrency ?? "USD",
      refundStatus,
      netRevenue: Math.max(0, total - shipping),
      country: getCountry(order),
      customer: order.customerName,
      createdAt: order.createdAt,
      status: order.status,
    };
  });
}

function buildSupportRows(alerts: Record<string, unknown>[], auditRows: Record<string, unknown>[]) {
  const supportRows = alerts.map((alert) => ({
    ticketId: alert.id,
    customer: alert.entityId ?? alert.resolvedBy ?? "System",
    subject: alert.title,
    message: alert.message,
    priority: alert.severity,
    status: alert.isResolved ? "closed" : "open",
    assignedEmployee: alert.resolvedBy ?? "Unassigned",
    createdAt: alert.createdAt,
    responseTime: alert.isResolved ? "Resolved" : "Pending",
    country: "",
    city: "",
    type: alert.type,
    alertStatus: alert.isResolved ? "closed" : "open",
  }));

  const supportAuditRows = auditRows
    .filter((row) => normalize(row.category) === "support")
    .map((row) => ({
      ticketId: row.id,
      customer: row.performedBy ?? "Customer",
      subject: row.details ?? row.action,
      message: row.details ?? row.action,
      priority: row.severity ?? "info",
      status: "closed",
      assignedEmployee: row.performedBy ?? "Support",
      createdAt: row.createdAt,
      responseTime: "Closed",
      country: "",
      city: "",
      type: row.action,
      alertStatus: "closed",
    }));

  return [...supportRows, ...supportAuditRows];
}

function summarizeOrders(rows: OrderRow[]) {
  const paid = rows.filter(isPaid);
  const delivered = rows.filter(isDelivered);
  const pending = rows.filter(isPending);
  const cancelled = rows.filter(isCancelled);
  const revenue = paid.reduce((sum, row) => sum + toNumber(row.totalUsd ?? row.total), 0);

  return {
    totalOrders: rows.length,
    totalRevenue: revenue,
    deliveredOrders: delivered.length,
    pendingOrders: pending.length,
    cancelledOrders: cancelled.length,
    paidOrders: paid.length,
  };
}

function summarizeProducts(rows: Record<string, unknown>[]) {
  return {
    totalProducts: rows.length,
    activeProducts: rows.filter((row) => row.isActive !== false).length,
    featuredProducts: rows.filter((row) => Boolean(row.isFeatured)).length,
    lowStockAlerts: rows.filter((row) => toNumber(row.lowStockAlertCount) > 0).length,
    unitsSold: rows.reduce((sum, row) => sum + toNumber(row.unitsSold), 0),
    revenueUsd: rows.reduce((sum, row) => sum + toNumber(row.revenueUsd), 0),
  };
}

function summarizeCustomers(rows: Record<string, unknown>[]) {
  const returning = rows.filter((row) => toNumber(row.totalOrders) > 1);
  const countries = new Map<string, number>();
  for (const row of rows) {
    const country = String(row.country ?? "").trim();
    if (!country) continue;
    countries.set(country, (countries.get(country) ?? 0) + 1);
  }
  const topCountry = [...countries.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    totalCustomers: rows.length,
    returningCustomers: returning.length,
    newCustomers: rows.filter((row) => toNumber(row.totalOrders) <= 1).length,
    topCountry: topCountry?.[0] ?? "Unknown",
    totalSpent: rows.reduce((sum, row) => sum + toNumber(row.totalSpent), 0),
  };
}

function summarizeDelivery(rows: Record<string, unknown>[]) {
  const delivered = rows.filter((row) => ["delivered", "picked_up", "completed"].includes(normalize(row.status)));
  const failed = rows.filter((row) => ["cancelled", "failed", "canceled"].includes(normalize(row.status)));
  const pending = rows.filter((row) => ["pending", "processing", "shipped"].includes(normalize(row.status)));

  return {
    totalDeliveries: rows.length,
    deliverySuccessRate: rows.length ? Math.round((delivered.length / rows.length) * 100) : 0,
    pendingDeliveries: pending.length,
    failedDeliveries: failed.length,
  };
}

function summarizeFinancial(rows: Record<string, unknown>[]) {
  const revenue = rows.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const refunds = rows.filter((row) => normalize(row.refundStatus).includes("refund"));
  const paymentMethods = new Map<string, number>();
  for (const row of rows) {
    const method = String(row.paymentMethod ?? "Unknown");
    paymentMethods.set(method, (paymentMethods.get(method) ?? 0) + 1);
  }
  const topMethod = [...paymentMethods.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    totalTransactions: rows.length,
    revenueUsd: revenue,
    refundCount: refunds.length,
    paymentMethod: topMethod?.[0] ?? "Unknown",
    outstandingPayments: rows.filter((row) => normalize(row.paymentStatus) !== "paid").length,
  };
}

function summarizeSupport(rows: Record<string, unknown>[]) {
  const open = rows.filter((row) => normalize(row.status) === "open");
  const closed = rows.filter((row) => normalize(row.status) === "closed");
  const critical = rows.filter((row) => normalize(row.priority) === "critical");

  return {
    totalTickets: rows.length,
    openTickets: open.length,
    closedTickets: closed.length,
    criticalTickets: critical.length,
  };
}

export async function getReportsCenterPayload(filters: ReportsCenterQuery = {}): Promise<ReportsCenterPayload> {
  const limit = 1000;
  const [ordersRows, productRows, usersRows, alertsRows, auditRows] = await Promise.all([
    listAllOrders(limit),
    db.query.products.findMany({ orderBy: [desc(products.createdAt)], limit }),
    listUsers(limit),
    db.query.systemAlerts.findMany({ orderBy: [desc(systemAlerts.createdAt)], limit }),
    db.query.auditLogs.findMany({ orderBy: [desc(auditLogs.createdAt)], limit }),
  ]);

  const enrichedOrders = ordersRows.map((order) => ({
    ...order,
    country: getCountry(order as Record<string, unknown>),
    city: getCity(order as Record<string, unknown>),
    itemsCount: getOrderItems(order as Record<string, unknown>).length,
  }));

  const customerRows = buildCustomerRows(usersRows as CustomerRow[], enrichedOrders as OrderRow[]);
  const enrichedProducts = buildProductRows(productRows as ProductRow[], enrichedOrders as OrderRow[], alertsRows as Record<string, unknown>[]);
  const deliveryRows = buildDeliveryRows(enrichedOrders as OrderRow[]);
  const financialRows = buildFinancialRows(enrichedOrders as OrderRow[]);
  const supportRows = buildSupportRows(alertsRows as Record<string, unknown>[], auditRows as Record<string, unknown>[]);

  const filteredOrders = filterRows(enrichedOrders, filters, "orders");
  const filteredProducts = filterRows(enrichedProducts, filters, "products");
  const filteredCustomers = filterRows(customerRows, filters, "customers");
  const filteredDelivery = filterRows(deliveryRows, filters, "delivery");
  const filteredFinancial = filterRows(financialRows, filters, "financial");
  const filteredSupport = filterRows(supportRows, filters, "support");

  return {
    generatedAt: new Date().toISOString(),
    query: filters,
    orders: {
      rows: filteredOrders,
      summary: summarizeOrders(filteredOrders as OrderRow[]),
    },
    products: {
      rows: filteredProducts,
      summary: summarizeProducts(filteredProducts),
    },
    customers: {
      rows: filteredCustomers,
      summary: summarizeCustomers(filteredCustomers),
    },
    delivery: {
      rows: filteredDelivery,
      summary: summarizeDelivery(filteredDelivery),
    },
    financial: {
      rows: filteredFinancial,
      summary: summarizeFinancial(filteredFinancial),
    },
    support: {
      rows: filteredSupport,
      summary: summarizeSupport(filteredSupport),
    },
  };
}
