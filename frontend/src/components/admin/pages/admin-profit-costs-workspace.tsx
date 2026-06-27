"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BarChart3, Wallet } from "lucide-react";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import type { AdminWorkspaceData } from "@/lib/admin/types";

type OrderProfit = {
  orderId?: string;
  orderNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  quantity?: string | number | null;
  sellingPriceUsd?: string | number | null;
  productionCostUsd?: string | number | null;
  revenueUsd?: string | number | null;
  netProfitUsd?: string | number | null;
  marginPercent?: string | number | null;
  paymentStatus?: string | null;
  orderDate?: string | Date | null;
};

type ProductProfitRow = {
  entityId: string;
  title: string;
  status?: string | null;
  sellingPriceUsd?: string | number | null;
  designerCostUsd?: string | number | null;
  taxPercent?: string | number | null;
  otherCostUsd?: string | number | null;
  productionCostPerUnitUsd?: string | number | null;
  orderCount?: string | number | null;
  unitsSold?: string | number | null;
  revenueUsd?: string | number | null;
  totalProductionCostUsd?: string | number | null;
  netProfitUsd?: string | number | null;
  marginPercent?: string | number | null;
  orderProfits?: OrderProfit[];
};

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n) : "$0.00";
}

function percent(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%` : "0%";
}

function numberLabel(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function ProfitTable({ rows }: { rows: ProductProfitRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <TableHeader>
            <TableHeadRow>
              <TableHeadCell>No</TableHeadCell>
              <TableHeadCell>Product</TableHeadCell>
              <TableHeadCell>Orders / Units</TableHeadCell>
              <TableHeadCell>Revenue</TableHeadCell>
              <TableHeadCell>Net Profit</TableHeadCell>
              <TableHeadCell>Margin</TableHeadCell>
              <TableHeadCell>Detail</TableHeadCell>
            </TableHeadRow>
          </TableHeader>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row.entityId} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-black text-slate-500">{index + 1}</td>
                <td className="px-5 py-4">
                  <p className="font-black text-slate-950">{row.title}</p>
                  <p className="text-xs font-bold text-slate-500">{row.status === "hidden" ? "Hidden product" : "Active product"}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-black text-slate-900">{numberLabel(row.orderCount)} orders</p>
                  <p className="text-xs font-bold text-slate-500">{numberLabel(row.unitsSold)} units</p>
                </td>
                <td className="px-5 py-4 font-black">{money(row.revenueUsd)}</td>
                <td className={`px-5 py-4 font-black ${Number(row.netProfitUsd ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money(row.netProfitUsd)}</td>
                <td className="px-5 py-4 font-bold">{percent(row.marginPercent)}</td>
                <td className="px-5 py-4">
                  <DashboardTableActions>
                    <DashboardActionButton action="view" href={`/admin/finance/profit-costs/${row.entityId}`} aria-label="Open profit details" />
                  </DashboardTableActions>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-sm font-black uppercase tracking-widest text-slate-400">No product profit records found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminProfitCostsWorkspace({ data }: { data: AdminWorkspaceData; canManage?: boolean }) {
  const rows = useMemo(() => (data.catalogProfitRows ?? []) as ProductProfitRow[], [data.catalogProfitRows]);

  return (
    <AdminWorkspace
      pageId="profit-costs"
      initialData={data}
      hideKpis
      title="Profit Performance"
      subtitle="Calculated product revenue, production cost, net profit, and order-level profit detail."
      icon={Wallet}
      defaultTab="summary"
      actions={
        <Link href="/admin/finance/profit-costs/summary" className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-black active:scale-95">
          <BarChart3 className="h-4 w-4" />
          All Profit Summary
        </Link>
      }
    >
      {({ activeTab, search }) => {
        const query = search.trim().toLowerCase();
        const filteredRows = rows.filter((row) => [row.title, row.status].join(" ").toLowerCase().includes(query));
        return (
          <div className="space-y-5">
            {activeTab === "summary" ? (
              <>
                <ProfitTable rows={filteredRows} />
              </>
            ) : null}
            {activeTab === "catalog" ? <ProfitTable rows={filteredRows} /> : null}
          </div>
        );
      }}
    </AdminWorkspace>
  );
}
