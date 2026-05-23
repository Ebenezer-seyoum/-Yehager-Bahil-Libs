import type { ReportKey } from "./report-registry";
import {
  formatNumber,
  getOrderCountry,
  getOrderTotal,
  isCancelled,
  isDelivered,
  isPaid,
  isPending,
  money,
  normalize,
} from "./utils";

export type TableView = {
  columns: string[];
  rows: (string | number)[][];
};

const SALES_REPORTS = new Set([
  "daily-sales",
  "monthly-sales",
  "sales-by-product",
  "sales-by-category",
  "sales-by-country",
  "sales-by-customer",
  "sales-by-payment-method",
  "sales-growth",
  "sales-overview",
  "revenue-summary",
]);

const ORDER_REPORTS = new Set([
  "all-orders",
  "pending-orders",
  "delivered-orders",
  "cancelled-orders",
  "returned-orders",
  "orders-by-country",
  "orders-by-customer",
  "orders-by-date-range",
  "order-overview",
]);

const CUSTOMER_REPORTS = new Set([
  "customer-list",
  "new-customers",
  "returning-customers",
  "customer-location-report",
  "customer-purchase-history",
  "customer-overview",
  "top-customers",
]);

const DELIVERY_REPORTS = new Set([
  "delivery-summary",
  "driver-performance",
  "pending-deliveries",
  "delivered-packages",
  "failed-deliveries",
  "delivery-by-country-city",
  "delivery-overview",
  "delivery-performance",
]);

const PRODUCT_REPORTS = new Set([
  "product-performance",
  "low-stock",
  "best-selling-products",
  "product-category-report",
  "inventory-report",
  "product-revenue-report",
  "product-overview",
]);

const FINANCIAL_REPORTS = new Set([
  "revenue-report",
  "payment-methods",
  "refund-report",
  "profit-loss-summary",
  "tax-vat-summary",
  "outstanding-payments",
  "payment-overview",
  "refunds-returns",
]);

const SUPPORT_REPORTS = new Set([
  "support-tickets",
  "open-tickets",
  "closed-tickets",
  "customer-complaints",
  "response-time-report",
  "support-overview",
]);

function asDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateCell(value: unknown) {
  const date = asDate(value);
  return date ? date.toLocaleDateString() : String(value ?? "-");
}

function formatDateShort(value: unknown) {
  const date = asDate(value);
  return date ? date.toISOString().slice(5, 10) : "-";
}

function toRows(
  rows: Record<string, unknown>[],
  columns: string[],
  mapRow: (row: Record<string, unknown>, index: number) => (string | number)[],
): TableView {
  return {
    columns,
    rows: rows.map(mapRow),
  };
}

function groupBy(rows: Record<string, unknown>[], getLabel: (row: Record<string, unknown>) => string) {
  const bucket = new Map<string, { label: string; value: number }>();
  for (const row of rows) {
    const label = getLabel(row) || "Unknown";
    const current = bucket.get(label) ?? { label, value: 0 };
    current.value += 1;
    bucket.set(label, current);
  }
  return [...bucket.values()].sort((a, b) => b.value - a.value);
}

function buildTable(reportKey: ReportKey, rows: Record<string, unknown>[]): TableView | null {
  if (SALES_REPORTS.has(reportKey)) {
    if (reportKey === "sales-by-product") {
      return toRows(rows, ["Product", "Units Sold", "Revenue", "Country", "Status"], (row, index) => [
        String(row.productName ?? row.name ?? `Product ${index + 1}`),
        Number(row.unitsSold ?? row.quantity ?? 0),
        money(Number(row.revenueUsd ?? row.totalUsd ?? row.total ?? row.amount ?? 0)),
        String(row.country ?? getOrderCountry(row as Parameters<typeof getOrderCountry>[0]) ?? "-"),
        String(row.status ?? row.paymentStatus ?? "-"),
      ]);
    }

    if (reportKey === "sales-by-category") {
      return toRows(rows, ["Category", "Units Sold", "Revenue", "Orders", "Country"], (row) => [
        String(row.category ?? row.sectionName ?? "Unknown"),
        Number(row.unitsSold ?? row.quantity ?? 0),
        money(Number(row.revenueUsd ?? row.totalUsd ?? row.total ?? row.amount ?? 0)),
        Number(row.totalOrders ?? 0),
        String(row.country ?? "-"),
      ]);
    }

    if (reportKey === "sales-by-country") {
      return toRows(rows, ["Country", "Orders", "Revenue", "Top Customer"], (row) => [
        String(row.country ?? "Unknown"),
        Number(row.totalOrders ?? 0),
        money(Number(row.totalSpent ?? row.revenueUsd ?? row.totalUsd ?? row.total ?? 0)),
        String(row.customerName ?? row.name ?? row.customer ?? "-"),
      ]);
    }

    if (reportKey === "sales-by-customer") {
      return toRows(rows, ["Customer", "Email", "Country", "Orders", "Revenue"], (row) => [
        String(row.customerName ?? row.name ?? row.customer ?? "Customer"),
        String(row.userEmail ?? row.email ?? "-"),
        String(row.country ?? "-"),
        Number(row.totalOrders ?? 0),
        money(Number(row.totalSpent ?? row.revenueUsd ?? row.totalUsd ?? row.total ?? 0)),
      ]);
    }

    if (reportKey === "sales-by-payment-method") {
      return toRows(rows, ["Payment Method", "Orders", "Revenue", "Currency"], (row) => [
        String(row.paymentMethod ?? "Unknown"),
        Number(row.totalOrders ?? 0),
        money(Number(row.totalSpent ?? row.amount ?? row.totalUsd ?? row.total ?? 0)),
        String(row.currency ?? "USD"),
      ]);
    }

    return toRows(rows, ["Date", "Order ID", "Customer", "Country", "Revenue", "Status"], (row, index) => [
      formatDateCell(row.createdAt ?? row.date ?? `-`),
      String(row.orderNumber ?? row.id ?? `#${index + 1}`),
      String(row.customerName ?? row.userEmail ?? row.name ?? "Customer"),
      String(row.country ?? getOrderCountry(row as Parameters<typeof getOrderCountry>[0]) ?? "-"),
      money(Number(row.totalUsd ?? row.total ?? row.amount ?? row.revenueUsd ?? 0)),
      String(row.status ?? row.paymentStatus ?? "-"),
    ]);
  }

  if (ORDER_REPORTS.has(reportKey)) {
    return toRows(rows, ["Order ID", "Customer", "Date", "Status", "Total Amount", "Payment Status", "Delivery Status", "Assigned Employee"], (row) => [
      String(row.orderNumber ?? row.id ?? "-"),
      String(row.customerName ?? row.userEmail ?? row.name ?? "Customer"),
      formatDateCell(row.createdAt),
      String(row.status ?? "pending"),
      money(Number(row.totalUsd ?? row.total ?? 0)),
      String(row.paymentStatus ?? "pending"),
      String(row.deliveryStatus ?? row.shippingStatus ?? row.status ?? "pending"),
      String(row.employeeName ?? row.assignedEmployee ?? "Unassigned"),
    ]);
  }

  if (CUSTOMER_REPORTS.has(reportKey)) {
    return toRows(rows, ["Customer Name", "Email", "Country", "Total Orders", "Total Spent", "Last Order Date", "Status"], (row) => [
      String(row.name ?? row.customerName ?? "Customer"),
      String(row.email ?? row.userEmail ?? "-"),
      String(row.country ?? "-"),
      Number(row.totalOrders ?? 0),
      money(Number(row.totalSpent ?? 0)),
      formatDateCell(row.lastOrderDate ?? row.createdAt),
      String(row.statusLabel ?? row.status ?? "active"),
    ]);
  }

  if (DELIVERY_REPORTS.has(reportKey)) {
    return toRows(rows, ["Delivery ID", "Order ID", "Driver", "Customer", "Location", "Status", "Delivery Date", "Delivery Time"], (row) => [
      String(row.deliveryId ?? row.id ?? "-"),
      String(row.orderId ?? row.orderNumber ?? "-"),
      String(row.driver ?? row.deliveryDriver ?? row.assignedDriver ?? "Not assigned"),
      String(row.customer ?? row.customerName ?? "Customer"),
      String(row.location ?? ([row.city, row.country].filter(Boolean).join(", ") || "-")),
      String(row.status ?? row.deliveryStatus ?? "pending"),
      formatDateCell(row.deliveryDate ?? row.createdAt),
      String(row.deliveryTime ?? "-"),
    ]);
  }

  if (PRODUCT_REPORTS.has(reportKey)) {
    return toRows(rows, ["Product Name", "Category", "Stock", "Units Sold", "Revenue", "Status", "Last Updated"], (row) => [
      String(row.name ?? row.productName ?? "Product"),
      String(row.category ?? row.sectionName ?? "Uncategorized"),
      row.lowStockAlertCount !== undefined ? String(row.lowStockAlertCount) : String(row.stock ?? row.quantity ?? "—"),
      Number(row.unitsSold ?? 0),
      money(Number(row.revenueUsd ?? row.totalUsd ?? row.total ?? 0)),
      String(row.stockState ?? row.status ?? (row.isActive === false ? "Inactive" : "Active")),
      formatDateCell(row.updatedAt ?? row.createdAt),
    ]);
  }

  if (FINANCIAL_REPORTS.has(reportKey)) {
    return toRows(rows, ["Transaction ID", "Date", "Order ID", "Payment Method", "Amount", "Currency", "Refund Status", "Net Revenue"], (row) => [
      String(row.transactionId ?? row.id ?? row.orderId ?? "-"),
      formatDateCell(row.date ?? row.createdAt),
      String(row.orderId ?? row.orderNumber ?? "-"),
      String(row.paymentMethod ?? "Unknown"),
      money(Number(row.amount ?? row.totalUsd ?? row.total ?? 0)),
      String(row.currency ?? "USD"),
      String(row.refundStatus ?? row.paymentStatus ?? "-"),
      money(Number(row.netRevenue ?? row.amount ?? row.totalUsd ?? row.total ?? 0)),
    ]);
  }

  if (SUPPORT_REPORTS.has(reportKey)) {
    return toRows(rows, ["Ticket ID", "Customer", "Subject", "Priority", "Status", "Assigned Employee", "Created Date", "Response Time"], (row) => [
      String(row.ticketId ?? row.id ?? "-"),
      String(row.customer ?? row.customerName ?? row.email ?? "Customer"),
      String(row.subject ?? row.title ?? row.message ?? "-"),
      String(row.priority ?? row.severity ?? "normal"),
      String(row.status ?? row.alertStatus ?? "open"),
      String(row.assignedEmployee ?? row.resolvedBy ?? "Unassigned"),
      formatDateCell(row.createdAt),
      String(row.responseTime ?? "-"),
    ]);
  }

  return null;
}

function chartFallback(reportKey: ReportKey, rows: Record<string, unknown>[]) {
  if (!rows.length) return [];

  if (SALES_REPORTS.has(reportKey)) {
    if (reportKey === "sales-by-product") {
      return rows.slice(0, 8).map((row, index) => ({
        label: String(row.productName ?? row.name ?? `Product ${index + 1}`).slice(0, 14),
        value: Number(row.revenueUsd ?? row.totalUsd ?? row.total ?? row.amount ?? 0),
      }));
    }

    if (reportKey === "sales-by-category") {
      return rows.slice(0, 8).map((row, index) => ({
        label: String(row.category ?? row.sectionName ?? `Category ${index + 1}`).slice(0, 14),
        value: Number(row.revenueUsd ?? row.totalUsd ?? row.total ?? row.amount ?? 0),
      }));
    }

    if (reportKey === "sales-by-payment-method") {
      return rows.slice(0, 8).map((row, index) => ({
        label: String(row.paymentMethod ?? `Method ${index + 1}`).slice(0, 14),
        value: Number(row.totalSpent ?? row.amount ?? row.totalUsd ?? row.total ?? 0),
      }));
    }

    return rows.slice(-14).map((row, index) => ({
      label: formatDateShort(row.createdAt ?? row.date ?? `Point ${index + 1}`),
      value: Number(row.totalUsd ?? row.total ?? row.revenueUsd ?? row.amount ?? 0),
      orders: Number(row.totalOrders ?? row.itemsCount ?? 1),
    }));
  }

  if (ORDER_REPORTS.has(reportKey)) {
    return groupBy(rows, (row) => normalize(String(row.status ?? row.paymentStatus ?? "unknown"))).map((bucket) => ({
      label: bucket.label,
      value: bucket.value,
    }));
  }

  if (CUSTOMER_REPORTS.has(reportKey)) {
    return rows.slice(0, 8).map((row, index) => ({
      label: String(row.name ?? row.customerName ?? row.email ?? `Customer ${index + 1}`).slice(0, 14),
      value: Number(row.totalSpent ?? 0),
    }));
  }

  if (DELIVERY_REPORTS.has(reportKey)) {
    return groupBy(rows, (row) => normalize(String(row.status ?? row.deliveryStatus ?? "unknown"))).map((bucket) => ({
      label: bucket.label,
      value: bucket.value,
    }));
  }

  if (PRODUCT_REPORTS.has(reportKey)) {
    return rows.slice(0, 8).map((row, index) => ({
      label: String(row.name ?? row.productName ?? `Product ${index + 1}`).slice(0, 14),
      value: Number(row.revenueUsd ?? row.unitsSold ?? 0),
    }));
  }

  if (FINANCIAL_REPORTS.has(reportKey)) {
    return rows.slice(0, 8).map((row, index) => ({
      label: String(row.paymentMethod ?? row.refundStatus ?? `Bucket ${index + 1}`).slice(0, 14),
      value: Number(row.amount ?? row.netRevenue ?? row.totalUsd ?? 0),
    }));
  }

  if (SUPPORT_REPORTS.has(reportKey)) {
    return groupBy(rows, (row) => normalize(String(row.status ?? row.priority ?? "unknown"))).map((bucket) => ({
      label: bucket.label,
      value: bucket.value,
    }));
  }

  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const row of rows) {
    if (!row.createdAt) continue;
    const key = String(row.createdAt).slice(0, 10);
    const bucket = byDay.get(key) ?? { revenue: 0, orders: 0 };
    bucket.orders += 1;
    if (isPaid(row as { paymentStatus?: string | null })) {
      bucket.revenue += getOrderTotal(row as Parameters<typeof getOrderTotal>[0]);
    }
    byDay.set(key, bucket);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, bucket]) => ({
      label: date.slice(5),
      value: bucket.revenue,
      orders: bucket.orders,
    }));
}

export type SummaryItem = { label: string; value: string };

function summaryFallback(reportKey: ReportKey, rows: Record<string, unknown>[]) {
  if (SALES_REPORTS.has(reportKey)) {
    const revenue = rows.reduce((sum, row) => sum + Number(row.revenueUsd ?? row.totalUsd ?? row.total ?? row.amount ?? 0), 0);
    return [
      { label: "Rows", value: formatNumber(rows.length) },
      { label: "Revenue", value: money(revenue) },
      { label: "Top bucket", value: String(rows[0]?.productName ?? rows[0]?.category ?? rows[0]?.paymentMethod ?? rows[0]?.country ?? "-") },
      { label: "Avg row value", value: money(rows.length ? revenue / rows.length : 0) },
    ];
  }

  if (ORDER_REPORTS.has(reportKey)) {
    const paid = rows.filter((row) => isPaid(row as { paymentStatus?: string | null }));
    const revenue = paid.reduce((sum, row) => sum + getOrderTotal(row as Parameters<typeof getOrderTotal>[0]), 0);
    const delivered = rows.filter((row) => isDelivered(row as { status?: string | null }));
    const pending = rows.filter((row) => isPending(row as { status?: string | null }));
    return [
      { label: "Orders", value: formatNumber(rows.length) },
      { label: "Delivered", value: formatNumber(delivered.length) },
      { label: "Pending", value: formatNumber(pending.length) },
      { label: "Revenue", value: money(revenue) },
    ];
  }

  if (CUSTOMER_REPORTS.has(reportKey)) {
    const totalSpent = rows.reduce((sum, row) => sum + Number(row.totalSpent ?? 0), 0);
    return [
      { label: "Customers", value: formatNumber(rows.length) },
      { label: "Total spent", value: money(totalSpent) },
      { label: "Returning", value: formatNumber(rows.filter((row) => Number(row.totalOrders ?? 0) > 1).length) },
      { label: "Top country", value: String(rows[0]?.country ?? "-") },
    ];
  }

  if (DELIVERY_REPORTS.has(reportKey)) {
    return [
      { label: "Deliveries", value: formatNumber(rows.length) },
      { label: "Success rate", value: rows.length ? `${Math.round((rows.filter((row) => isDelivered(row as { status?: string | null })).length / rows.length) * 100)}%` : "0%" },
      { label: "Pending", value: formatNumber(rows.filter((row) => isPending(row as { status?: string | null })).length) },
      { label: "Failed", value: formatNumber(rows.filter((row) => isCancelled(row as { status?: string | null })).length) },
    ];
  }

  if (PRODUCT_REPORTS.has(reportKey)) {
    const lowStock = rows.filter((row) => Number(row.lowStockAlertCount ?? 0) > 0 || Number(row.stock ?? 0) <= 5);
    const revenue = rows.reduce((sum, row) => sum + Number(row.revenueUsd ?? row.totalUsd ?? row.total ?? 0), 0);
    return [
      { label: "Products", value: formatNumber(rows.length) },
      { label: "Low stock", value: formatNumber(lowStock.length) },
      { label: "Revenue", value: money(revenue) },
      { label: "Units sold", value: formatNumber(rows.reduce((sum, row) => sum + Number(row.unitsSold ?? 0), 0)) },
    ];
  }

  if (FINANCIAL_REPORTS.has(reportKey)) {
    const revenue = rows.reduce((sum, row) => sum + Number(row.amount ?? row.netRevenue ?? row.totalUsd ?? row.total ?? 0), 0);
    return [
      { label: "Transactions", value: formatNumber(rows.length) },
      { label: "Revenue", value: money(revenue) },
      { label: "Refunds", value: formatNumber(rows.filter((row) => normalize(row.refundStatus).includes("refund")).length) },
      { label: "Outstanding", value: formatNumber(rows.filter((row) => normalize(row.paymentStatus) !== "paid").length) },
    ];
  }

  if (SUPPORT_REPORTS.has(reportKey)) {
    return [
      { label: "Tickets", value: formatNumber(rows.length) },
      { label: "Open", value: formatNumber(rows.filter((row) => normalize(row.status) === "open").length) },
      { label: "Closed", value: formatNumber(rows.filter((row) => normalize(row.status) === "closed").length) },
      { label: "Critical", value: formatNumber(rows.filter((row) => normalize(row.priority) === "critical").length) },
    ];
  }

  return null;
}

function insightsFallback(reportKey: ReportKey, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    return ["No data matches the current filters. Try widening the date range or clearing filters."];
  }

  const insights: string[] = [];

  if (SALES_REPORTS.has(reportKey)) {
    const top = [...rows].sort((a, b) => Number(b.revenueUsd ?? b.totalUsd ?? b.total ?? b.amount ?? 0) - Number(a.revenueUsd ?? a.totalUsd ?? a.total ?? a.amount ?? 0))[0];
    if (top) {
      insights.push(`Top performer: ${String(top.productName ?? top.category ?? top.paymentMethod ?? top.country ?? "Item")}.`);
    }
    insights.push(`${formatNumber(rows.length)} records in this sales view.`);
  }

  if (ORDER_REPORTS.has(reportKey)) {
    const cancelled = rows.filter((row) => isCancelled(row as { status?: string | null })).length;
    insights.push(`${formatNumber(cancelled)} cancelled order(s) in the selected data.`);
  }

  if (CUSTOMER_REPORTS.has(reportKey)) {
    const top = [...rows].sort((a, b) => Number(b.totalSpent ?? 0) - Number(a.totalSpent ?? 0))[0];
    if (top) {
      insights.push(`Top customer: ${String(top.name ?? top.email ?? top.customerName ?? "Customer")} at ${money(Number(top.totalSpent ?? 0))}.`);
    }
  }

  if (DELIVERY_REPORTS.has(reportKey)) {
    const inProgress = rows.filter((row) => isPending(row as { status?: string | null }) || normalize(row.status) === "shipped").length;
    insights.push(`${formatNumber(inProgress)} delivery record(s) still in progress.`);
  }

  if (PRODUCT_REPORTS.has(reportKey)) {
    const lowStock = rows.filter((row) => Number(row.lowStockAlertCount ?? 0) > 0 || Number(row.stock ?? 0) <= 5).length;
    insights.push(`${formatNumber(lowStock)} product(s) need inventory attention.`);
  }

  if (FINANCIAL_REPORTS.has(reportKey)) {
    const refunds = rows.filter((row) => normalize(row.refundStatus).includes("refund")).length;
    insights.push(`${formatNumber(refunds)} refund-related transaction(s) in this selection.`);
  }

  if (SUPPORT_REPORTS.has(reportKey)) {
    const open = rows.filter((row) => normalize(row.status) === "open").length;
    insights.push(`${formatNumber(open)} support ticket(s) still open.`);
  }

  if (!insights.length) {
    const paid = rows.filter((r) => isPaid(r as { paymentStatus?: string | null }));
    const rate = rows.length ? ((paid.length / rows.length) * 100).toFixed(1) : "0";
    insights.push(`${rate}% of rows in this report are paid orders.`);

    const statusCounts = new Map<string, number>();
    for (const row of rows) {
      const key = normalize(row.status) || "unknown";
      statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
    }
    const topStatus = [...statusCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (topStatus) {
      insights.push(`Most common status: ${topStatus[0]} (${topStatus[1]} rows).`);
    }
  }

  return insights.slice(0, 5);
}

export function buildTableView(reportKey: ReportKey, rows: Record<string, unknown>[]): TableView {
  if (!rows.length) {
    return { columns: [], rows: [] };
  }

  const custom = buildTable(reportKey, rows);
  if (custom) return custom;

  return {
    columns: ["Order", "Customer", "Status", "Payment", "Total", "Date"],
    rows: rows.map((row, index) => [
      String(row.orderNumber ?? row.id ?? `#ORD-${index + 1}`),
      String(row.customerName ?? row.userEmail ?? "Customer"),
      String(row.status ?? "pending").replaceAll("_", " "),
      String(row.paymentStatus ?? "pending").replaceAll("_", " "),
      money(Number(row.totalUsd ?? row.total ?? 0)),
      row.createdAt
        ? new Date(String(row.createdAt)).toLocaleDateString()
        : "-",
    ]),
  };
}

export function buildChartData(reportKey: ReportKey, rows: Record<string, unknown>[]) {
  const custom = chartFallback(reportKey, rows);
  if (custom) return custom;
  return [];
}

export function buildSummary(reportKey: ReportKey, rows: Record<string, unknown>[]): SummaryItem[] {
  const custom = summaryFallback(reportKey, rows);
  if (custom) return custom;

  const paid = rows.filter((r) => isPaid(r as { paymentStatus?: string | null }));
  const revenue = paid.reduce(
    (sum, row) => sum + getOrderTotal(row as Parameters<typeof getOrderTotal>[0]),
    0,
  );
  const pending = rows.filter((r) => isPending(r as { status?: string | null }));

  return [
    { label: "Rows", value: formatNumber(rows.length) },
    { label: "Paid orders", value: formatNumber(paid.length) },
    { label: "Revenue", value: money(revenue) },
    { label: "Pending", value: formatNumber(pending.length) },
  ];
}

export function buildInsights(reportKey: ReportKey, rows: Record<string, unknown>[]): string[] {
  return insightsFallback(reportKey, rows);
}