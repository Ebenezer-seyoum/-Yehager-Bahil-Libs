import type { FilterFamily } from "./report-registry";
import {
  getDateRangeBounds,
  getOrderCountry,
  normalize,
  rowsInDateRange,
  type DateRangeKey,
} from "./utils";

export type FilterValues = Record<string, string>;

export const DATE_RANGE_OPTIONS: DateRangeKey[] = [
  "Today",
  "Last 7 Days",
  "Last 30 Days",
  "This Month",
  "This Year",
];

export const FILTER_FIELDS_BY_FAMILY: Record<FilterFamily, string[]> = {
  orders: ["dateRange", "status", "paymentMethod", "country", "city", "customerSearch", "employee", "amountMin", "amountMax"],
  sales: ["dateRange", "paymentMethod", "country", "city", "customerSearch", "product", "productCategory", "amountMin", "amountMax"],
  customers: ["dateRange", "country", "city", "customerSearch", "status"],
  products: ["category", "product", "productCategory", "stockLevel"],
  delivery: ["dateRange", "deliveryStatus", "country", "city", "driver", "employee"],
  financial: ["dateRange", "paymentMethod", "status", "country", "amountMin", "amountMax", "refundStatus"],
  support: ["dateRange", "ticketStatus", "priority", "customerSearch", "employee", "country"],
};

export function defaultFiltersForFamily(family: FilterFamily): FilterValues {
  const base: FilterValues = { dateRange: "Last 30 Days" };

  switch (family) {
    case "orders":
      return {
        ...base,
        status: "All Status",
        paymentMethod: "All Methods",
        country: "All Countries",
        city: "All Cities",
        employee: "All Employees",
        customerSearch: "",
        amountMin: "",
        amountMax: "",
      };
    case "sales":
      return {
        ...base,
        paymentMethod: "All Methods",
        country: "All Countries",
          city: "All Cities",
          customerSearch: "",
          product: "",
          productCategory: "All Categories",
          amountMin: "",
          amountMax: "",
      };
    case "customers":
      return {
        ...base,
        country: "All Countries",
          city: "All Cities",
        customerSearch: "",
          status: "All Status",
      };
    case "products":
      return {
          category: "All Categories",
          product: "",
          productCategory: "All Categories",
          stockLevel: "All Stock",
      };
    case "delivery":
      return {
        ...base,
        deliveryStatus: "All Status",
        country: "All Countries",
          city: "All Cities",
        driver: "All Drivers",
          employee: "All Employees",
      };
    case "financial":
      return {
        ...base,
        paymentMethod: "All Methods",
        status: "All Status",
          country: "All Countries",
          amountMin: "",
          amountMax: "",
          refundStatus: "All Refunds",
      };
    case "support":
        return {
          ...base,
          ticketStatus: "All Status",
          priority: "All Priority",
          customerSearch: "",
          employee: "All Employees",
          country: "All Countries",
        };
    default:
      return base;
  }
}

type OrderRow = Record<string, unknown>;
type ProductRow = Record<string, unknown>;

export function applyOrderFilters(rows: OrderRow[], filters: FilterValues) {
  let result = rows;

  if (filters.dateRange) {
    result = rowsInDateRange(
      result as { createdAt?: string | Date | null }[],
      filters.dateRange as DateRangeKey,
    ) as OrderRow[];
  }

  return result.filter((row) => {
    const statusMatch =
      !filters.status ||
      filters.status === "All Status" ||
      normalize(row.status) === normalize(filters.status);

    const paymentMatch =
      !filters.paymentMethod ||
      filters.paymentMethod === "All Methods" ||
      normalize(row.paymentMethod ?? row.paymentStatus) ===
        normalize(filters.paymentMethod);

    const countryMatch =
      !filters.country ||
      filters.country === "All Countries" ||
      normalize(getOrderCountry(row as Parameters<typeof getOrderCountry>[0])) ===
        normalize(filters.country);

    const cityMatch =
      !filters.city ||
      filters.city === "All Cities" ||
      normalize(
        String(
          row.city ??
            (row.shippingAddress as Record<string, unknown> | undefined)?.city ??
            (row.shippingAddress as Record<string, unknown> | undefined)?.town ??
            "",
        ),
      ) ===
        normalize(filters.city);

    const employeeMatch =
      !filters.employee ||
      filters.employee === "All Employees" ||
      normalize(row.employeeName ?? row.assignedTo) === normalize(filters.employee);

    const deliveryMatch =
      !filters.deliveryStatus ||
      filters.deliveryStatus === "All Status" ||
      normalize(
        row.deliveryStatus ?? row.shippingStatus ?? row.status,
      ) === normalize(filters.deliveryStatus);

    const driverMatch =
      !filters.driver ||
      filters.driver === "All Drivers" ||
      normalize(row.deliveryDriver ?? row.driverName ?? row.assignedDriver) ===
        normalize(filters.driver);

    const customerSearch = filters.customerSearch?.trim().toLowerCase();
    const customerMatch =
      !customerSearch ||
      [row.customerName, row.userEmail, row.email].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(customerSearch),
      );

    const amountMin = Number(filters.amountMin || 0);
    const amountMax = Number(filters.amountMax || Number.MAX_SAFE_INTEGER);
    const amount = Number(row.totalUsd ?? row.total ?? row.amount ?? 0);
    const amountMatch =
      Number.isFinite(amount) &&
      amount >= amountMin &&
      amount <= amountMax;

    return (
      statusMatch &&
      paymentMatch &&
      countryMatch &&
      cityMatch &&
      employeeMatch &&
      deliveryMatch &&
      driverMatch &&
      customerMatch &&
      amountMatch
    );
  });
}

export function applyProductFilters(
  rows: ProductRow[],
  filters: FilterValues,
  onlyLowStock = false,
) {
  const threshold = Number(filters.stockThreshold || filters.stockLevel || 10);

  return rows.filter((row) => {
    const categoryMatch =
      !filters.category ||
      filters.category === "All Categories" ||
      normalize(row.category ?? row.sectionName) === normalize(filters.category);

    const productMatch =
      !filters.product ||
      String(row.name ?? row.title ?? "").toLowerCase().includes(filters.product.toLowerCase());

    const productCategoryMatch =
      !filters.productCategory ||
      filters.productCategory === "All Categories" ||
      normalize(row.category ?? row.sectionName) === normalize(filters.productCategory);

    const stockLevelMatch =
      !filters.stockLevel ||
      filters.stockLevel === "All Stock" ||
      (normalize(filters.stockLevel) === "low stock"
        ? Number(row.stock ?? row.quantity ?? 0) <= threshold
        : true);

    if (!onlyLowStock) return categoryMatch && productMatch && productCategoryMatch && stockLevelMatch;

    const stock = Number(row.stock ?? row.quantity ?? 0);
    return categoryMatch && productMatch && productCategoryMatch && stock <= threshold;
  });
}

export function applyCustomerFilters(
  rows: Record<string, unknown>[],
  filters: FilterValues,
) {
  let result = rows;

  if (filters.dateRange) {
    result = rowsInDateRange(
      result as { createdAt?: string | Date | null }[],
      filters.dateRange as DateRangeKey,
    ) as Record<string, unknown>[];
  }

  return result.filter((row) => {
    const countryMatch =
      !filters.country ||
      filters.country === "All Countries" ||
      normalize(row.country) === normalize(filters.country);

    const cityMatch =
      !filters.city ||
      filters.city === "All Cities" ||
      normalize(row.city) === normalize(filters.city);

    const search = filters.customerSearch?.trim().toLowerCase();
    const searchMatch =
      !search ||
      [row.name, row.email, row.customerName].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(search),
      );

    const statusMatch =
      !filters.status ||
      filters.status === "All Status" ||
      normalize(row.status ?? row.statusLabel) === normalize(filters.status);

    return countryMatch && cityMatch && searchMatch && statusMatch;
  });
}

export function applySupportFilters(
  rows: Record<string, unknown>[],
  filters: FilterValues,
) {
  return rows.filter((row) => {
    const ticketStatusMatch =
      !filters.ticketStatus ||
      filters.ticketStatus === "All Status" ||
      normalize(row.status ?? row.alertStatus) === normalize(filters.ticketStatus);

    const priorityMatch =
      !filters.priority ||
      filters.priority === "All Priority" ||
      normalize(row.priority ?? row.severity) === normalize(filters.priority);

    const countryMatch =
      !filters.country ||
      filters.country === "All Countries" ||
      normalize(row.country) === normalize(filters.country);

    const employeeMatch =
      !filters.employee ||
      filters.employee === "All Employees" ||
      normalize(row.assignedEmployee ?? row.resolvedBy) === normalize(filters.employee);

    const search = filters.customerSearch?.trim().toLowerCase();
    const searchMatch =
      !search ||
      [row.customer, row.subject, row.message, row.title].some((value) =>
        String(value ?? "").toLowerCase().includes(search),
      );

    return ticketStatusMatch && priorityMatch && countryMatch && employeeMatch && searchMatch;
  });
}

export function buildSelectOptions(
  rows: Record<string, unknown>[],
  field: string,
  fallback: string,
) {
  const values = rows
    .map((row) => row[field])
    .filter(Boolean)
    .map((value) => String(value));

  return [fallback, ...Array.from(new Set(values))];
}

export function globalKpiDateBounds(globalDateRange: DateRangeKey) {
  return getDateRangeBounds(globalDateRange);
}
