import type { ReportKey } from "./report-registry";
import { applyCustomerFilters, applyOrderFilters, applyProductFilters, applySupportFilters } from "./report-filters";
import type { FilterValues } from "./report-filters";
import { getOrderCountry, normalize } from "./utils";

export type ReportsPayload = {
  generatedAt?: string;
  query?: Record<string, unknown>;
  orders?: {
    rows?: Record<string, unknown>[];
    summary?: Record<string, unknown>;
  };
  products?: { rows?: Record<string, unknown>[] };
  customers?: { rows?: Record<string, unknown>[] };
  support?: { rows?: Record<string, unknown>[] };
  delivery?: { rows?: Record<string, unknown>[]; summary?: Record<string, unknown> };
  financial?: { rows?: Record<string, unknown>[]; summary?: Record<string, unknown> };
};

export function buildCustomerRows(
  users: Record<string, unknown>[],
  orders: Record<string, unknown>[],
) {
  const byEmail = new Map<string, Record<string, unknown>>();

  for (const user of users) {
    if (normalize(user.role) !== "customer") continue;
    const email = String(user.email ?? "").toLowerCase();
    if (!email) continue;
    byEmail.set(email, {
      name: user.name ?? user.fullName ?? "Customer",
      email: user.email,
      country: user.country ?? "",
      createdAt: user.createdAt,
      totalOrders: 0,
      totalSpent: 0,
    });
  }

  for (const order of orders) {
    const email = String(order.userEmail ?? order.customerEmail ?? "").toLowerCase();
    if (!email) continue;

    const existing = byEmail.get(email) ?? {
      name: order.customerName ?? "Customer",
      email: order.userEmail ?? order.customerEmail,
      country: getOrderCountry(order as Parameters<typeof getOrderCountry>[0]),
      createdAt: order.createdAt,
      totalOrders: 0,
      totalSpent: 0,
    };

    existing.totalOrders = Number(existing.totalOrders ?? 0) + 1;
    existing.totalSpent =
      Number(existing.totalSpent ?? 0) +
      Number(order.totalUsd ?? order.total ?? 0);

    if (!existing.country) {
      existing.country = getOrderCountry(order as Parameters<typeof getOrderCountry>[0]);
    }

    byEmail.set(email, existing);
  }

  return Array.from(byEmail.values()).sort(
    (a, b) => Number(b.totalSpent ?? 0) - Number(a.totalSpent ?? 0),
  );
}

export function getRowsForReport(
  reportKey: ReportKey,
  payload: ReportsPayload,
  filteredOrders: Record<string, unknown>[],
  filters: FilterValues,
) {
  const products = payload.products?.rows ?? [];
  const customers = payload.customers?.rows ?? [];
  const support = payload.support?.rows ?? [];
  const delivery = payload.delivery?.rows ?? [];
  const financial = payload.financial?.rows ?? [];

  switch (reportKey) {
    case "product-overview":
    case "low-stock":
    case "product-performance":
    case "best-selling-products":
    case "product-category-report":
    case "inventory-report":
    case "product-revenue-report":
      return applyProductFilters(products, filters, reportKey === "low-stock");
    case "customer-overview":
    case "customer-list":
    case "new-customers":
    case "returning-customers":
    case "customer-location-report":
    case "customer-purchase-history":
      return applyCustomerFilters(customers, filters);
    case "top-customers":
      return [...customers].sort(
        (a, b) => Number(b.totalSpent ?? 0) - Number(a.totalSpent ?? 0),
      );
    case "delivery-overview":
    case "delivery-performance":
    case "delivery-summary":
    case "driver-performance":
    case "pending-deliveries":
    case "delivered-packages":
    case "failed-deliveries":
    case "delivery-by-country-city":
      return delivery;
    case "payment-overview":
    case "refunds-returns":
    case "revenue-report":
    case "payment-methods":
    case "refund-report":
    case "profit-loss-summary":
    case "tax-vat-summary":
    case "outstanding-payments":
      return financial.length ? financial : filteredOrders;
    case "support-overview":
    case "support-tickets":
    case "open-tickets":
    case "closed-tickets":
    case "customer-complaints":
    case "response-time-report":
      return applySupportFilters(support, filters);
    case "all-orders":
    case "pending-orders":
    case "delivered-orders":
    case "cancelled-orders":
    case "returned-orders":
    case "orders-by-country":
    case "orders-by-customer":
    case "orders-by-date-range":
    case "order-overview":
      return applyOrderFilters(filteredOrders, filters);
    case "daily-sales":
    case "monthly-sales":
    case "sales-by-product":
    case "sales-by-category":
    case "sales-by-country":
    case "sales-by-customer":
    case "sales-by-payment-method":
    case "sales-growth":
    case "sales-overview":
    case "revenue-summary":
      return applyOrderFilters(filteredOrders, filters);
    default:
      return filteredOrders;
  }
}

function normalizeOrderRows(rows: Record<string, unknown>[]) {
  return rows.map((row) => ({
    ...row,
    country: getOrderCountry(row as Parameters<typeof getOrderCountry>[0]),
  }));
}

export function prepareReportsPayload(
  orderReport: { rows?: Record<string, unknown>[]; summary?: Record<string, unknown> } | null,
  products: Record<string, unknown>[],
  users: Record<string, unknown>[],
): ReportsPayload {
  const orders = normalizeOrderRows(orderReport?.rows ?? []);
  const customerRows = buildCustomerRows(users, orders);

  return {
    orders: {
      rows: orders,
      summary: orderReport?.summary,
    },
    products: { rows: products },
    customers: { rows: customerRows },
    support: { rows: [] },
    delivery: { rows: [] },
    financial: { rows: [] },
  };
}

export function filterOrdersForReport(
  orders: Record<string, unknown>[],
  filters: FilterValues,
) {
  return applyOrderFilters(orders, filters);
}
