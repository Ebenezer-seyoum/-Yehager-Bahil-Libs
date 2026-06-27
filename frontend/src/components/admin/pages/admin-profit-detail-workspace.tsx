"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Calculator, ClipboardList, Package, Percent, Wallet } from "lucide-react";
import { AdminDetailHeader, AdminDetailLayout } from "@/components/admin/admin-detail-layout";

export type OrderProfit = {
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
  orderDate?: string | Date | null;
};

export type ProductProfitRow = {
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

export type ProfitSummary = {
  totalProducts?: string | number | null;
  totalOrders?: string | number | null;
  totalUnitsSold?: string | number | null;
  totalRevenueUsd?: string | number | null;
  totalProductionCostUsd?: string | number | null;
  totalNetProfitUsd?: string | number | null;
  averageProfitMargin?: string | number | null;
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

function dateLabel(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function Metric({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "green" | "blue" }) {
  return (
    <div className={`rounded-2xl border p-4 ${tone === "green" ? "border-emerald-100 bg-emerald-50" : tone === "blue" ? "border-blue-100 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
      <p className={`text-[10px] font-black uppercase tracking-widest ${tone === "green" ? "text-emerald-700" : tone === "blue" ? "text-blue-700" : "text-slate-500"}`}>{label}</p>
      <p className="mt-2 break-words text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function OrderProfitTable({ rows }: { rows: OrderProfit[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Qty</th>
            <th className="px-4 py-3">Revenue</th>
            <th className="px-4 py-3">Production Cost</th>
            <th className="px-4 py-3">Net Profit</th>
            <th className="px-4 py-3">Margin</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((order) => (
            <tr key={`${order.orderId}-${order.orderNumber}`}>
              <td className="px-4 py-4 font-black text-slate-950">#{order.orderNumber ?? order.orderId}</td>
              <td className="px-4 py-4">
                <p className="font-bold text-slate-900">{order.customerName ?? "Customer"}</p>
                <p className="text-xs font-semibold text-slate-500">{order.customerEmail}</p>
              </td>
              <td className="px-4 py-4 font-bold">{numberLabel(order.quantity)}</td>
              <td className="px-4 py-4 font-black">{money(order.revenueUsd)}</td>
              <td className="px-4 py-4 font-bold">{money(order.productionCostUsd)}</td>
              <td className={`px-4 py-4 font-black ${Number(order.netProfitUsd ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money(order.netProfitUsd)}</td>
              <td className="px-4 py-4 font-bold">{percent(order.marginPercent)}</td>
              <td className="px-4 py-4 font-semibold text-slate-600">{dateLabel(order.orderDate)}</td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-sm font-bold text-slate-400">No paid orders for this product yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function ProductProfitDetailWorkspace({ row }: { row: ProductProfitRow }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("overview");
  const orderRows = row.orderProfits ?? [];

  return (
    <AdminDetailLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      sections={[
        { id: "overview", label: "Profit Overview", icon: Wallet },
        { id: "costs", label: "Production Cost Setup", icon: Calculator },
        { id: "orders", label: "Order Profit Lines", icon: ClipboardList },
        { id: "calculation", label: "Calculation Summary", icon: Percent },
      ]}
      topHeader={
        <AdminDetailHeader
          icon={Package}
          iconTheme="bg-emerald-50 text-emerald-700 border-emerald-100"
          category="Product Profit"
          title={row.title}
          subtitle="Calculated product revenue, production cost, net profit, and order-level margin."
          onRefresh={() => router.refresh()}
          onBack={() => router.push("/admin/finance/profit-costs")}
          backLabel="Back to Profit"
        />
      }
      profileCard={
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Total Revenue" value={money(row.revenueUsd)} tone="blue" />
          <Metric label="Total Production Cost" value={money(row.totalProductionCostUsd)} />
          <Metric label="Total Net Profit" value={money(row.netProfitUsd)} tone="green" />
          <Metric label="Profit Margin" value={percent(row.marginPercent)} />
        </div>
      }
    >
      {activeSection === "overview" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Customer Selling Price" value={money(row.sellingPriceUsd)} />
          <Metric label="Orders Sold" value={numberLabel(row.orderCount)} />
          <Metric label="Units Sold" value={numberLabel(row.unitsSold)} />
          <Metric label="Status" value={row.status === "hidden" ? "Hidden" : "Active"} />
        </div>
      ) : null}

      {activeSection === "costs" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Unit Production Cost" value={money(row.productionCostPerUnitUsd)} />
          <Metric label="Designer Labor Cost" value={money(row.designerCostUsd)} />
          <Metric label="Production Tax Rate" value={percent(row.taxPercent)} />
          <Metric label="Other Production Costs" value={money(row.otherCostUsd)} />
        </div>
      ) : null}

      {activeSection === "orders" ? <OrderProfitTable rows={orderRows} /> : null}

      {activeSection === "calculation" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Calculation Summary</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Metric label="Formula" value="Revenue - Production Cost = Net Profit" />
            <Metric label="Revenue" value={money(row.revenueUsd)} tone="blue" />
            <Metric label="Production Cost" value={money(row.totalProductionCostUsd)} />
            <Metric label="Net Profit" value={money(row.netProfitUsd)} tone="green" />
          </div>
        </div>
      ) : null}
    </AdminDetailLayout>
  );
}

export function AllProfitSummaryDetailWorkspace({ rows, summary }: { rows: ProductProfitRow[]; summary: ProfitSummary | null }) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("system");
  const ranked = useMemo(() => {
    const byProfit = [...rows].sort((a, b) => Number(b.netProfitUsd ?? 0) - Number(a.netProfitUsd ?? 0));
    const byMargin = [...rows].filter((row) => Number(row.orderCount ?? 0) > 0).sort((a, b) => Number(a.marginPercent ?? 0) - Number(b.marginPercent ?? 0));
    return { highestProfit: byProfit[0], lowestMargin: byMargin[0] };
  }, [rows]);

  return (
    <AdminDetailLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      sections={[
        { id: "system", label: "System Summary", icon: Wallet },
        { id: "products", label: "Product Profit Summary", icon: Package },
        { id: "ranking", label: "Performance Ranking", icon: BarChart3 },
      ]}
      topHeader={
        <AdminDetailHeader
          icon={BarChart3}
          iconTheme="bg-blue-50 text-blue-700 border-blue-100"
          category="All Profit Summary"
          title="Profit Summary"
          subtitle="System-wide calculated revenue, production cost, net profit, and product performance."
          onRefresh={() => router.refresh()}
          onBack={() => router.push("/admin/finance/profit-costs")}
          backLabel="Back to Profit"
        />
      }
      profileCard={
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Total Revenue" value={money(summary?.totalRevenueUsd)} tone="blue" />
          <Metric label="Total Production Cost" value={money(summary?.totalProductionCostUsd)} />
          <Metric label="Total Net Profit" value={money(summary?.totalNetProfitUsd)} tone="green" />
          <Metric label="Average Margin" value={percent(summary?.averageProfitMargin)} />
        </div>
      }
    >
      {activeSection === "system" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Products Tracked" value={numberLabel(summary?.totalProducts)} />
          <Metric label="Paid Orders" value={numberLabel(summary?.totalOrders)} />
          <Metric label="Units Sold" value={numberLabel(summary?.totalUnitsSold)} />
          <Metric label="System Mode" value="Calculated" tone="blue" />
        </div>
      ) : null}

      {activeSection === "products" ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Units</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Production Cost</th>
                <th className="px-4 py-3">Net Profit</th>
                <th className="px-4 py-3">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.entityId}>
                  <td className="px-4 py-4 font-black text-slate-950">{row.title}</td>
                  <td className="px-4 py-4 font-bold">{numberLabel(row.orderCount)}</td>
                  <td className="px-4 py-4 font-bold">{numberLabel(row.unitsSold)}</td>
                  <td className="px-4 py-4 font-black">{money(row.revenueUsd)}</td>
                  <td className="px-4 py-4 font-bold">{money(row.totalProductionCostUsd)}</td>
                  <td className={`px-4 py-4 font-black ${Number(row.netProfitUsd ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money(row.netProfitUsd)}</td>
                  <td className="px-4 py-4 font-bold">{percent(row.marginPercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {activeSection === "ranking" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Metric label="Highest Profit Product" value={ranked.highestProfit ? `${ranked.highestProfit.title} - ${money(ranked.highestProfit.netProfitUsd)}` : "No product profit yet"} tone="green" />
          <Metric label="Lowest Margin Product" value={ranked.lowestMargin ? `${ranked.lowestMargin.title} - ${percent(ranked.lowestMargin.marginPercent)}` : "No margin data yet"} />
        </div>
      ) : null}
    </AdminDetailLayout>
  );
}
