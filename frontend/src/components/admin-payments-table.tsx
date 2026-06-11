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
  customerName?: string | null;
  userEmail?: string | null;
  totalUsd?: number | string | null;
  totalEtb?: number | string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
  createdAt?: string | null;
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

export function AdminPaymentsTable({
  initialOrders,
  externalSearch,
  onFilteredCountChange,
}: {
  initialOrders: Order[];
  externalSearch?: string;
  viewMode?: "modal" | "page";
  onFilteredCountChange?: (count: number) => void;
}) {
  const router = useRouter();

  const filteredOrders = useMemo(() => {
    const q = externalSearch?.toLowerCase().trim();
    return initialOrders.filter((o) => {
      if (!q) return true;
      return (
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q) ||
        o.userEmail?.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    });
  }, [initialOrders, externalSearch]);

  useEffect(() => {
    onFilteredCountChange?.(filteredOrders.length);
  }, [filteredOrders.length, onFilteredCountChange]);

  function openPaymentDetail(orderId: string) {
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
              const isEtb = order.paymentMethod === "etb_bank_transfer" || order.paymentCurrency === "ETB";
              const MethodIcon = isEtb ? Landmark : CreditCard;
              const status = STATUS_CONFIG[order.paymentStatus || "pending"] || STATUS_CONFIG.pending;
              
              return (
                <tr 
                  key={order.id} 
                  className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                  onClick={() => openPaymentDetail(order.id)}
                >
                  <td className="px-6 py-6 text-sm font-black text-slate-300 group-hover:text-slate-900 transition-colors">
                    {index + 1}
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-0.5">
                       <span className="font-bold text-slate-900">{formatDate(order.createdAt)}</span>
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <span className="font-mono text-sm font-black tracking-widest text-slate-900">
                      #{order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 uppercase tracking-tight">{order.customerName || "Walking Customer"}</span>
                      <span className="text-xs font-bold text-slate-400">{order.userEmail || "-"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-3">
                       <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 text-slate-400 group-hover:text-primary transition-colors">
                          <MethodIcon className="h-5 w-5" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-900">{isEtb ? "Bank Transfer" : "Stripe Card"}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{order.paymentCurrency || "USD"} Gateway</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-1">
                       <span className="text-base font-black text-slate-900 tracking-tight">{formatUsd(order.totalUsd)}</span>
                       {isEtb && order.totalEtb && <span className="text-[10px] font-black uppercase text-primary tracking-widest">≈ {Number(order.totalEtb).toLocaleString()} ETB</span>}
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
                        onClick={(e) => {
                           e.stopPropagation();
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
