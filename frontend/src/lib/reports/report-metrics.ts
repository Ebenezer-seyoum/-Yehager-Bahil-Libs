import type { LucideIcon } from "lucide-react";
import { Clock, ShoppingBag, Truck, WalletCards, XCircle } from "lucide-react";
import {
  comparisonPeriodLabel,
  formatChange,
  formatNumber,
  getComparisonPeriodBounds,
  getOrderTotal,
  isCancelled,
  isDelivered,
  isPaid,
  isPending,
  money,
  percentChange,
  rowsBetweenDates,
  type DateRangeKey,
} from "./utils";

type OrderRow = {
  createdAt?: string | Date | null;
  paymentStatus?: string | null;
  status?: string | null;
  totalUsd?: number | string | null;
  total?: number | string | null;
};

export type MetricCardData = {
  icon: LucideIcon;
  title: string;
  value: string;
  changeValue: number;
  color: string;
  positiveIsGood: boolean;
};

export function calculateGlobalMetrics(
  orders: OrderRow[],
  dateRange: DateRangeKey = "Last 30 Days",
): { metrics: MetricCardData[]; comparisonLabel: string } {
  const { currentStart, currentEnd, previousStart, previousEnd } =
    getComparisonPeriodBounds(dateRange);

  const currentRows = rowsBetweenDates(orders, currentStart, currentEnd);
  const previousRows = rowsBetweenDates(orders, previousStart, previousEnd);

  const currentRevenue = currentRows
    .filter(isPaid)
    .reduce((sum, row) => sum + getOrderTotal(row), 0);

  const previousRevenue = previousRows
    .filter(isPaid)
    .reduce((sum, row) => sum + getOrderTotal(row), 0);

  const currentOrders = currentRows.length;
  const previousOrders = previousRows.length;

  const currentDelivered = currentRows.filter(isDelivered).length;
  const previousDelivered = previousRows.filter(isDelivered).length;

  const currentPending = currentRows.filter(isPending).length;
  const previousPending = previousRows.filter(isPending).length;

  const currentCancelled = currentRows.filter(isCancelled).length;
  const previousCancelled = previousRows.filter(isCancelled).length;

  return {
    comparisonLabel: comparisonPeriodLabel(dateRange),
    metrics: [
      {
        icon: WalletCards,
        title: "Total Revenue",
        value: money(currentRevenue),
        changeValue: percentChange(currentRevenue, previousRevenue),
        color: "blue",
        positiveIsGood: true,
      },
      {
        icon: ShoppingBag,
        title: "Total Orders",
        value: formatNumber(currentOrders),
        changeValue: percentChange(currentOrders, previousOrders),
        color: "green",
        positiveIsGood: true,
      },
      {
        icon: Truck,
        title: "Delivered Orders",
        value: formatNumber(currentDelivered),
        changeValue: percentChange(currentDelivered, previousDelivered),
        color: "purple",
        positiveIsGood: true,
      },
      {
        icon: Clock,
        title: "Pending Orders",
        value: formatNumber(currentPending),
        changeValue: percentChange(currentPending, previousPending),
        color: "orange",
        positiveIsGood: false,
      },
      {
        icon: XCircle,
        title: "Cancelled Orders",
        value: formatNumber(currentCancelled),
        changeValue: percentChange(currentCancelled, previousCancelled),
        color: "rose",
        positiveIsGood: false,
      },
    ],
  };
}

export { formatChange };
