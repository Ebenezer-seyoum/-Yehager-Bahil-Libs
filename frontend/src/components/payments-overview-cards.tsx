"use client";

import type { ComponentType } from "react";
import { Banknote, Clock3, CreditCard, DollarSign, RefreshCw, XCircle } from "lucide-react";

type Order = {
  id: string;
  totalUsd?: number | string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
};

type Alert = { id: string; isResolved?: boolean | null; title?: string | null; createdAt?: string | null };
type Product = { id: string; name?: string | null; isActive?: boolean | null };
type User = { id: string; role?: string | null; name?: string | null; email?: string | null };

type Metric = {
  key: string;
  label: string;
  value: string;
  helper: string;
  tone: string;
  icon: ComponentType<{ className?: string }>;
};

function formatCurrency(value: number | string | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

export function PaymentsOverviewCards({
  orders,
}: {
  orders: Order[];
  alerts: Alert[];
  products: Product[];
  users: User[];
}) {
  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.totalUsd ?? 0), 0);
  const stripeRevenue = paidOrders.reduce((sum, order) => {
    const method = order.paymentMethod ?? "";
    if (String(method).toLowerCase().includes("stripe") || String(order.paymentCurrency).toUpperCase() === "USD") {
      return sum + Number(order.totalUsd ?? 0);
    }
    return sum;
  }, 0);
  const etbRevenueUsd = paidOrders
    .filter((order) => order.paymentMethod === "etb_bank_transfer" || order.paymentCurrency === "ETB")
    .reduce((sum, order) => sum + Number(order.totalUsd ?? 0), 0);
  const awaitingCount = orders.filter((order) => order.paymentStatus === "awaiting_verification").length;
  const failedCount = orders.filter((order) => order.paymentStatus === "failed").length;
  const refundedCount = orders.filter((order) => order.paymentStatus === "refunded").length;

  const metrics: Metric[] = [
    {
      key: "total_revenue",
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      helper: "Paid order value",
      tone: "from-emerald-800 to-emerald-600",
      icon: DollarSign,
    },
    {
      key: "stripe_revenue",
      label: "Stripe Revenue",
      value: formatCurrency(stripeRevenue),
      helper: "Card checkout",
      tone: "from-slate-800 to-blue-700",
      icon: CreditCard,
    },
    {
      key: "etb_revenue",
      label: "ETB Revenue",
      value: formatCurrency(etbRevenueUsd),
      helper: "Bank transfers",
      tone: "from-amber-700 to-orange-600",
      icon: Banknote,
    },
    {
      key: "awaiting",
      label: "Awaiting Verification",
      value: String(awaitingCount),
      helper: "Needs review",
      tone: "from-yellow-700 to-amber-600",
      icon: Clock3,
    },
    {
      key: "failed",
      label: "Failed Payments",
      value: String(failedCount),
      helper: "Declined or rejected",
      tone: "from-rose-800 to-rose-600",
      icon: XCircle,
    },
    {
      key: "refunded",
      label: "Refunded",
      value: String(refundedCount),
      helper: "Returned funds",
      tone: "from-violet-800 to-violet-600",
      icon: RefreshCw,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.key} className={`group min-h-44 rounded-3xl bg-gradient-to-br ${metric.tone} p-5 text-left text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)] ring-1 ring-white/10`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">{metric.label}</p>
                <p className="mt-4 text-3xl font-bold tracking-tight text-white">{metric.value}</p>
                <p className="mt-2 text-sm font-medium text-white/82">{metric.helper}</p>
              </div>
              <span className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15">
                <Icon className="h-6 w-6" />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
