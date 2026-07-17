import type { AdminPageId } from "./types";

export const FILTER_PLACEHOLDERS: Record<AdminPageId, string> = {
  dashboard: "Search dashboard data...",
  employees: "Search employees by name, email, or role...",
  customers: "Search customers by name or email...",
  roles: "Search roles and permissions...",
  products: "Search clothes by name, category, or cultural style...",
  sections: "Search tribes or regions...",
  orders: "Search by order #, customer, or email...",
  "returns-refunds": "Search returns by order, customer, refund status, or reason...",
  "shipping-delivery": "Search deliveries by order, customer, address, carrier, or status...",
  payments: "Search payments by order, customer, or reference...",
  transactions: "Search transactions by order, customer, method, or status...",
  "customer-credits": "Search customers by name, email, balance, or credit activity...",
  "profit-costs": "Search products, custom orders, customers, or profit records...",
  "coupons-discounts": "Search promotions by code, product, customer, or discount type...",
  documents: "Search documents by order or customer...",
  "uploaded-designs": "Search custom designs by submission #, title, customer, or status...",
  "exchange-rate": "Search currencies...",
  reports: "Search reports...",
  "support-inbox": "Search by customer, email, or subject...",
  settings: "Search settings...",
  "activity-logs": "Search activity logs...",
  alerts: "Search alerts...",
};

export function filterPlaceholderFor(pageId: AdminPageId) {
  return FILTER_PLACEHOLDERS[pageId] ?? "Search records...";
}
