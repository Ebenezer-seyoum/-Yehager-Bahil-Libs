import type { FilterValues } from "./report-filters";
import { type ReportsPayload } from "./report-data";

export type ReportsFetchInput = {
  category?: string;
  report?: string;
  filters?: FilterValues;
};

export function buildReportsQuery(input: ReportsFetchInput) {
  const params = new URLSearchParams();
  const filters = input.filters ?? {};

  if (input.category) params.set("category", input.category);
  if (input.report) params.set("report", input.report);

  if (filters.dateRange) params.set("dateRange", filters.dateRange);

  if (filters.status && !["All Status", "All Orders"].includes(filters.status)) {
    params.set("status", filters.status);
  }

  if (filters.paymentMethod && filters.paymentMethod !== "All Methods") {
    params.set("paymentStatus", filters.paymentMethod);
    params.set("paymentMethod", filters.paymentMethod);
  }

  if (filters.country && filters.country !== "All Countries") {
    params.set("country", filters.country);
  }

  if (filters.city && filters.city !== "All Cities") {
    params.set("city", filters.city);
  }

  if (filters.employee && filters.employee !== "All Employees") {
    params.set("employee", filters.employee);
  }

  if (filters.driver && filters.driver !== "All Drivers") {
    params.set("driver", filters.driver);
  }

  if (filters.product && filters.product.trim()) {
    params.set("product", filters.product.trim());
  }

  if (filters.productCategory && filters.productCategory !== "All Categories") {
    params.set("productCategory", filters.productCategory);
  }

  if (filters.ticketStatus && filters.ticketStatus !== "All Status") {
    params.set("ticketStatus", filters.ticketStatus);
  }

  if (filters.priority && filters.priority !== "All Priority") {
    params.set("priority", filters.priority);
  }

  if (filters.refundStatus && filters.refundStatus !== "All Refunds") {
    params.set("refundStatus", filters.refundStatus);
  }

  if (filters.customerSearch?.trim()) {
    params.set("customer", filters.customerSearch.trim());
    params.set("search", filters.customerSearch.trim());
  }

  if (filters.amountMin?.trim()) {
    params.set("amountMin", filters.amountMin.trim());
  }

  if (filters.amountMax?.trim()) {
    params.set("amountMax", filters.amountMax.trim());
  }

  if (filters.stockLevel && filters.stockLevel !== "All Stock") {
    params.set("stockLevel", filters.stockLevel);
  }

  return params.toString();
}

export async function fetchReportsPayload(input: ReportsFetchInput = {}): Promise<ReportsPayload> {
  const query = buildReportsQuery(input);

  const response = await fetch(query ? `/api/backend/admin/reports?${query}` : "/api/backend/admin/reports", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load reports data");
  }

  const json = await response.json();
  return json?.data ?? json;
}
