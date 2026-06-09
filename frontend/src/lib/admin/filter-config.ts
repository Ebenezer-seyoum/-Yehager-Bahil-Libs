import type { AdminPageId } from "./types";

export const FILTER_PLACEHOLDERS: Record<AdminPageId, string> = {
  dashboard: "Search dashboard data...",
  employees: "Search employees by name, email, or role...",
  customers: "Search customers by name or email...",
  roles: "Search roles and permissions...",
  products: "Search clothes by name, category, or cultural style...",
  sections: "Search sections...",
  orders: "Search by order #, customer, or email...",
  payments: "Search payments by order, customer, or reference...",
  documents: "Search documents by order or customer...",
  "uploaded-designs": "Search custom designs by submission #, title, customer, or status...",
  "exchange-rate": "Search currencies...",
  reports: "Search reports...",
  "support-inbox": "Search by ticket #, customer, email, subject, or order id...",
  settings: "Search settings...",
  "activity-logs": "Search activity logs...",
  alerts: "Search alerts...",
};

export function filterPlaceholderFor(pageId: AdminPageId) {
  return FILTER_PLACEHOLDERS[pageId] ?? "Search records...";
}
