export function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatNumber(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString();
}

export function normalize(value: unknown) {
  return String(value ?? "").toLowerCase().trim();
}

export function percentChange(current: number, previous: number) {
  if (!previous && !current) return 0;
  if (!previous && current) return 100;
  return ((current - previous) / previous) * 100;
}

export function formatChange(value: number) {
  return `${Math.abs(value).toFixed(1)}%`;
}

export function getOrderDate(row: { createdAt?: string | Date | null }) {
  if (!row.createdAt) return null;
  return new Date(row.createdAt);
}

export function getOrderTotal(row: {
  totalUsd?: number | string | null;
  total?: number | string | null;
  amount?: number | string | null;
}) {
  return Number(row.totalUsd ?? row.total ?? row.amount ?? 0);
}

export function getOrderCountry(row: {
  country?: string | null;
  shippingCountry?: string | null;
  shippingAddress?: { country?: string } | null;
}) {
  if (row.country) return row.country;
  if (row.shippingCountry) return row.shippingCountry;
  const country = row.shippingAddress?.country;
  return typeof country === "string" ? country : "";
}

export function isPaid(row: { paymentStatus?: string | null }) {
  return ["paid", "succeeded", "complete", "completed"].includes(
    normalize(row.paymentStatus),
  );
}

export function isDelivered(row: { status?: string | null }) {
  return ["delivered", "picked_up", "completed"].includes(normalize(row.status));
}

export function isPending(row: { status?: string | null }) {
  return ["pending", "processing", "in_progress"].includes(normalize(row.status));
}

export function isCancelled(row: { status?: string | null }) {
  return ["cancelled", "canceled", "failed"].includes(normalize(row.status));
}

export type DateRangeKey =
  | "Today"
  | "Yesterday"
  | "Last 7 Days"
  | "Last 30 Days"
  | "This Month"
  | "Last Month"
  | "This Year";

export function getDateRangeBounds(range: DateRangeKey): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case "Today":
      break;
    case "Yesterday": {
      start.setDate(end.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    }
    case "Last 7 Days":
      start.setDate(end.getDate() - 6);
      break;
    case "Last 30 Days":
      start.setDate(end.getDate() - 29);
      break;
    case "This Month":
      start.setDate(1);
      break;
    case "Last Month": {
      const monthStart = new Date(end);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      monthStart.setMonth(monthStart.getMonth() - 1);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setMilliseconds(monthEnd.getMilliseconds() - 1);
      start.setTime(monthStart.getTime());
      end.setTime(monthEnd.getTime());
      break;
    }
    case "This Year":
      start.setMonth(0, 1);
      break;
    default:
      start.setDate(end.getDate() - 29);
  }

  return { start, end };
}

export function rowsInDateRange<T extends { createdAt?: string | Date | null }>(
  rows: T[],
  range: DateRangeKey,
) {
  const { start, end } = getDateRangeBounds(range);
  return rows.filter((row) => {
    const date = getOrderDate(row);
    if (!date) return false;
    return date >= start && date <= end;
  });
}

export function rowsBetweenDates<T extends { createdAt?: string | Date | null }>(
  rows: T[],
  start: Date,
  end: Date,
) {
  return rows.filter((row) => {
    const date = getOrderDate(row);
    if (!date) return false;
    return date >= start && date <= end;
  });
}

export function getComparisonPeriodBounds(range: DateRangeKey) {
  const { start: currentStart, end: currentEnd } = getDateRangeBounds(range);
  const previousEnd = new Date(currentStart);
  previousEnd.setMilliseconds(previousEnd.getMilliseconds() - 1);

  const previousStart = new Date(previousEnd);
  const durationDays = Math.max(
    1,
    Math.ceil((currentEnd.getTime() - currentStart.getTime()) / 86_400_000) + 1,
  );
  previousStart.setDate(previousEnd.getDate() - (durationDays - 1));
  previousStart.setHours(0, 0, 0, 0);

  return { currentStart, currentEnd, previousStart, previousEnd };
}

export function comparisonPeriodLabel(range: DateRangeKey) {
  switch (range) {
    case "Today":
      return "vs yesterday";
    case "Last 7 Days":
      return "vs prior 7 days";
    case "Last 30 Days":
      return "vs prior 30 days";
    case "This Month":
      return "vs prior month";
    case "This Year":
      return "vs prior year";
    default:
      return "vs previous period";
  }
}

export function getLastNDaysRows<T extends { createdAt?: string | Date | null }>(
  rows: T[],
  days: number,
  offsetDays = 0,
) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() - offsetDays);
  end.setHours(23, 59, 59, 999);

  const start = new Date(end);
  start.setDate(end.getDate() - days);
  start.setHours(0, 0, 0, 0);

  return rows.filter((row) => {
    const date = getOrderDate(row);
    if (!date) return false;
    return date >= start && date <= end;
  });
}
