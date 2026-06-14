"use client";

import { useEffect, useMemo, useState } from "react";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import { CreditCard, Landmark, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Order = {
  id: string;
  orderNumber?: string | null;
  order_number?: string | null;
  customerName?: string | null;
  customer_name?: string | null;
  userEmail?: string | null;
  user_email?: string | null;
  totalUsd?: number | string | null;
  total_usd?: number | string | null;
  totalEtb?: number | string | null;
  total_etb?: number | string | null;
  paymentStatus?: string | null;
  payment_status?: string | null;
  paymentMethod?: string | null;
  payment_method?: string | null;
  paymentCurrency?: string | null;
  payment_currency?: string | null;
  createdAt?: string | null;
  created_at?: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: any }> = {
  awaiting_verification: { label: "Pending Review", class: "bg-rose-50 text-rose-700 border-rose-100", icon: AlertCircle },
  paid: { label: "Verified", class: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
  failed: { label: "Rejected", class: "bg-slate-100 text-slate-500 border-slate-200", icon: XCircle },
  pending: { label: "Awaiting Proof", class: "bg-amber-50 text-amber-700 border-amber-100", icon: Clock },
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatUsd(value?: number | string | null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function getOrderNumber(order: Order) {
  return order.orderNumber ?? order.order_number ?? order.id.slice(0, 8).toUpperCase();
}

function getCustomerName(order: Order) {
  return order.customerName ?? order.customer_name ?? "Walking Customer";
}

function getCustomerEmail(order: Order) {
  return order.userEmail ?? order.user_email ?? "-";
}

function getTotalUsd(order: Order) {
  return order.totalUsd ?? order.total_usd;
}

function getTotalEtb(order: Order) {
  return order.totalEtb ?? order.total_etb;
}

function getPaymentStatus(order: Order) {
  return order.paymentStatus ?? order.payment_status ?? "pending";
}

function getPaymentMethod(order: Order) {
  return order.paymentMethod ?? order.payment_method ?? "stripe";
}

function getPaymentCurrency(order: Order) {
  return order.paymentCurrency ?? order.payment_currency ?? "USD";
}

function getCreatedAt(order: Order) {
  return order.createdAt ?? order.created_at;
}

function isBankPayment(order: Order) {
  return getPaymentMethod(order) === "etb_bank_transfer" || getPaymentCurrency(order) === "ETB";
}

export function AdminPaymentsTable({
  initialOrders,
  externalSearch,
  statusFilter = "all",
  methodFilter = "all",
  currencyFilter = "all",
  onFilteredCountChange,
}: {
  initialOrders: Order[];
  externalSearch?: string;
  statusFilter?: string;
  methodFilter?: string;
  currencyFilter?: string;
  viewMode?: "modal" | "page";
  onFilteredCountChange?: (count: number) => void;
}) {
  const router = useRouter();
  const [viewedPaymentIds, setViewedPaymentIds] = useState<string[]>([]);

  useEffect(() => {
    const key = "admin-viewed-payment-notifications";
    const read = () => {
      try {
        const raw = window.localStorage.getItem(key);
        setViewedPaymentIds(raw ? JSON.parse(raw) : []);
      } catch {
        setViewedPaymentIds([]);
      }
    };
    const onViewed = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!id) return;
      setViewedPaymentIds((current) => {
        const next = Array.from(new Set([...current, id]));
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      });
    };
    read();
    window.addEventListener("admin-payment-viewed", onViewed);
    return () => window.removeEventListener("admin-payment-viewed", onViewed);
  }, []);

  const filteredOrders = useMemo(() => {
    const q = externalSearch?.toLowerCase().trim();
    return initialOrders.filter((order) => {
      const method = isBankPayment(order) ? "bank" : "stripe";
      const matchesStatus = statusFilter === "all" || getPaymentStatus(order) === statusFilter;
      const matchesMethod = methodFilter === "all" || method === methodFilter;
      const matchesCurrency = currencyFilter === "all" || getPaymentCurrency(order) === currencyFilter;
      if (!q) return matchesStatus && matchesMethod && matchesCurrency;
      const matchesSearch =
        getOrderNumber(order).toLowerCase().includes(q) ||
        getCustomerName(order).toLowerCase().includes(q) ||
        getCustomerEmail(order).toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q);
      return matchesStatus && matchesMethod && matchesCurrency && matchesSearch;
    });
  }, [currencyFilter, externalSearch, initialOrders, methodFilter, statusFilter]);

  useEffect(() => {
    onFilteredCountChange?.(filteredOrders.length);
  }, [filteredOrders.length, onFilteredCountChange]);

  function openPaymentDetail(orderId: string) {
    window.dispatchEvent(new CustomEvent("admin-payment-viewed", { detail: orderId }));
    fetch(`/api/backend/orders/admin/${orderId}`).catch((err) => {
      console.error("Could not mark payment notification read:", err);
    });
    router.push(`/admin/payments/${orderId}`);
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left text-sm text-slate-900">
          <TableHeader>
            <TableHeadRow>
              <TableHeadCell className="w-14">No</TableHeadCell>
              <TableHeadCell>Transaction Date</TableHeadCell>
              <TableHeadCell>Reference/Order</TableHeadCell>
              <TableHeadCell>Customer Profile</TableHeadCell>
              <TableHeadCell>Financial Method</TableHeadCell>
              <TableHeadCell>Total Amount</TableHeadCell>
              <TableHeadCell>Verification</TableHeadCell>
              <TableHeadCell>Action</TableHeadCell>
            </TableHeadRow>
          </TableHeader>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.map((order, index) => {
              const paymentStatus = getPaymentStatus(order);
              const paymentCurrency = getPaymentCurrency(order);
              const createdAt = getCreatedAt(order);
              const totalEtb = getTotalEtb(order);
              const isEtb = isBankPayment(order);
              const MethodIcon = isEtb ? Landmark : CreditCard;
              const status = STATUS_CONFIG[paymentStatus] || STATUS_CONFIG.pending;
              const highlightRow = !viewedPaymentIds.includes(order.id);

              return (
                <tr
                  key={order.id}
                  className={cn("transition-all cursor-pointer group hover:bg-slate-50/80", highlightRow && "border-l-4 border-l-blue-500 bg-blue-50/70")}
                  onClick={() => openPaymentDetail(order.id)}
                >
                  <td className="px-6 py-6 text-sm font-black text-slate-300 group-hover:text-slate-900 transition-colors">
                    {index + 1}
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-900">{formatDate(createdAt)}</span>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        {createdAt ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-2">
                      {highlightRow ? <span className="rounded-full border border-blue-200 bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">New</span> : null}
                      <span className="font-mono text-sm font-black tracking-widest text-slate-900">
                        #{getOrderNumber(order)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 uppercase tracking-tight">{getCustomerName(order)}</span>
                      <span className="text-xs font-bold text-slate-400">{getCustomerEmail(order)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 group-hover:text-primary transition-colors">
                        <MethodIcon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-900">{isEtb ? "Bank Transfer" : "Stripe Card"}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{paymentCurrency} Gateway</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-black text-slate-900 tracking-tight">{formatUsd(getTotalUsd(order))}</span>
                      {isEtb && totalEtb ? <span className="text-[10px] font-black uppercase text-primary tracking-widest">~ {Number(totalEtb).toLocaleString()} ETB</span> : null}
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                      status.class
                    )}>
                      <status.icon className="h-3 w-3" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <DashboardTableActions>
                      <DashboardActionButton
                        action="view"
                        onClick={(event) => {
                          event.stopPropagation();
                          openPaymentDetail(order.id);
                        }}
                      />
                    </DashboardTableActions>
                  </td>
                </tr>
              );
            })}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-20 text-center text-sm font-black uppercase tracking-widest text-slate-400">
                  No financial records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
