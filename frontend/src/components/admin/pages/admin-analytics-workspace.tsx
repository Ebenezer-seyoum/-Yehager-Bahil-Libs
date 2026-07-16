"use client";

import { useState, useMemo, type ComponentType, type ReactNode } from "react";
import {
  BarChart2, TrendingUp, Users, ShoppingBag, DollarSign, Package,
  CheckCircle2, Clock, XCircle, Truck, Target, Zap, Globe,
  Award, Star, AlertTriangle, Activity, PieChart, RefreshCw,
  ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hardRefreshPage } from "@/lib/hard-refresh";

/* ─────────────────────────────────────────────────────────────
   Types & Helpers
───────────────────────────────────────────────────────────── */
type DataRow = Record<string, unknown>;
type Order = DataRow;
type Product = DataRow;
type User = DataRow;
type DateRange = "7d" | "30d" | "90d" | "1y" | "all";
type IconComponent = ComponentType<{ className?: string }>;

function norm(v: unknown) { return String(v ?? "").toLowerCase().trim(); }

function rowDate(row: DataRow) {
  const raw = row.createdAt ?? row.created_at ?? row.created ?? row.date ?? row.updatedAt ?? row.updated_at;
  const value = typeof raw === "string" || typeof raw === "number" || raw instanceof Date ? raw : 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function orderAmount(order: Order) {
  return Number(order.totalUsd ?? order.total_usd ?? order.total ?? order.amount ?? order.amountUsd ?? order.amount_usd ?? 0) || 0;
}

function isPaidOrder(order: Order) {
  return ["paid", "succeeded", "success", "complete", "completed", "verified"].includes(norm(order.paymentStatus ?? order.payment_status));
}

function isCustomer(user: User) {
  const role = norm(user.role ?? user.roleName ?? user.role_name ?? user.accountType ?? user.account_type);
  return !role || role === "customer" || role === "user";
}

function rowArray(value: unknown): DataRow[] {
  return Array.isArray(value) ? value.filter((item): item is DataRow => typeof item === "object" && item !== null) : [];
}

function money(n: number) {
  if (!Number.isFinite(n) || n === 0) return "$0.00";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ORDER_STATUS_COLORS: Record<string, string> = {
  delivered: "bg-emerald-500", picked_up: "bg-emerald-400", completed: "bg-emerald-600",
  pending: "bg-amber-400", tailoring: "bg-blue-400", quality_check: "bg-purple-400",
  shipped: "bg-cyan-400", ready_for_pickup: "bg-orange-400",
  failed: "bg-red-500", refunded: "bg-slate-400", cancelled: "bg-red-400",
};

/* ─────────────────────────────────────────────────────────────
   Shared UI Primitives
───────────────────────────────────────────────────────────── */
function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <BarChart2 className="h-10 w-10 text-slate-200 mb-3" />
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function KpiHero({
  label, value, sub, icon: Icon, gradient, trend, trendUp,
}: {
  label: string; value: string; sub: string; icon: IconComponent;
  gradient: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-[1.75rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
      gradient
    )}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-2xl group-hover:scale-150 transition-transform duration-500" />
      <div className="relative z-10 flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70 mb-2">{label}</p>
          <p className="text-4xl font-black text-white tracking-tight leading-none break-all">{value}</p>
          <p className="mt-2 text-xs font-medium text-white/60">{sub}</p>
        </div>
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm ml-3">
          <Icon className="h-7 w-7 text-white" />
        </div>
      </div>
      {trend && (
        <div className={cn(
          "relative z-10 mt-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest",
          trendUp ? "text-white/90" : "text-red-200"
        )}>
          {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {trend}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, subtitle, icon: Icon, children }: {
  title: string; subtitle: string; icon: IconComponent; children: ReactNode;
}) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100">
          <Icon className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">{title}</h2>
          <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* Simple bar chart — pure CSS */
function BarChart({ data, color = "bg-indigo-500" }: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  if (!data.length) return <EmptyState label="No data for this period" />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-32 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
          <div className="relative flex-1 flex items-end w-full justify-center">
            <div
              className={cn("w-full max-w-[28px] rounded-t-lg transition-all duration-700", color)}
              style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
            />
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap z-10 shadow-lg">
              {d.value}
            </div>
          </div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate w-full text-center">{d.label}</p>
        </div>
      ))}
    </div>
  );
}

/* Conic donut */
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let cumulative = 0;
  const gradient = segments.map((seg) => {
    const start = Math.round((cumulative / total) * 360);
    cumulative += seg.value;
    const end = Math.round((cumulative / total) * 360);
    return `${seg.color} ${start}deg ${end}deg`;
  }).join(", ");

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="h-28 w-28 rounded-full shadow-md"
        style={{ background: segments.length ? `conic-gradient(${gradient})` : "#f1f5f9" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-white shadow-inner flex flex-col items-center justify-center">
          <span className="text-sm font-black text-slate-900">{total}</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase">Total</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Workspace Component
───────────────────────────────────────────────────────────── */
export function AdminAnalyticsWorkspace({
  orders: initialOrders,
  products: initialProducts,
  users: initialUsers,
}: {
  orders: Order[];
  products: Product[];
  users: User[];
}) {
  const [range, setRange] = useState<DateRange>("all");

  const orders = initialOrders ?? [];
  const products = initialProducts ?? [];
  const users = initialUsers ?? [];

  /* ── Date cutoff ── */
  const cutoff = useMemo(() => {
    const now = new Date();
    if (range === "7d") return new Date(now.getTime() - 7 * 86_400_000);
    if (range === "30d") return new Date(now.getTime() - 30 * 86_400_000);
    if (range === "90d") return new Date(now.getTime() - 90 * 86_400_000);
    if (range === "1y") return new Date(now.getTime() - 365 * 86_400_000);
    return new Date(0);
  }, [range]);

  const filteredOrders = useMemo(() =>
    orders.filter((o) => rowDate(o) >= cutoff),
    [orders, cutoff]
  );

  /* ── Core metrics ── */
  const m = useMemo(() => {
    const revenue = filteredOrders.filter(isPaidOrder).reduce((s, o) => s + orderAmount(o), 0);
    const totalOrders = filteredOrders.length;
    const paidOrders = filteredOrders.filter(isPaidOrder).length;
    const pendingCount = filteredOrders.filter((o) => norm(o.status) === "pending").length;
    const deliveredCount = filteredOrders.filter((o) =>
      ["delivered", "picked_up", "completed", "fulfilled"].includes(norm(o.status))
    ).length;
    const failedCount = filteredOrders.filter((o) => norm(o.paymentStatus ?? o.payment_status) === "failed").length;
    const avgOrderValue = paidOrders ? revenue / paidOrders : 0;
    const conversionRate = totalOrders ? pct(paidOrders, totalOrders) : 0;
    const customers = users.filter(isCustomer);
    const newCustomers = customers.filter((u) => rowDate(u) >= cutoff).length;
    return {
      revenue, totalOrders, paidOrders, pendingCount, deliveredCount, failedCount,
      avgOrderValue, conversionRate, customers: customers.length, newCustomers,
      products: products.length,
    };
  }, [filteredOrders, users, products, cutoff]);

  /* ── 12-month buckets helper ── */
  function monthBuckets(): { label: string; value: number }[] {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return { label: MONTHS[d.getMonth()], value: 0 };
    });
  }

  const revenueByMonth = useMemo(() => {
    const now = new Date();
    const buckets = monthBuckets();
    orders.forEach((o) => {
      if (!isPaidOrder(o)) return;
      const d = rowDate(o);
      const ago = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (ago >= 0 && ago < 12) buckets[11 - ago].value += orderAmount(o);
    });
    return buckets;
  }, [orders]);

  const ordersByMonth = useMemo(() => {
    const now = new Date();
    const buckets = monthBuckets();
    orders.forEach((o) => {
      const d = rowDate(o);
      const ago = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (ago >= 0 && ago < 12) buckets[11 - ago].value++;
    });
    return buckets;
  }, [orders]);

  const customersByMonth = useMemo(() => {
    const now = new Date();
    const buckets = monthBuckets();
    users.filter(isCustomer).forEach((u) => {
      const d = rowDate(u);
      const ago = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (ago >= 0 && ago < 12) buckets[11 - ago].value++;
    });
    return buckets;
  }, [users]);

  const ordersByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const s = norm(o.status) || "unknown";
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
  }, [filteredOrders]);

  const paymentMethodSplit = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const m = norm(o.paymentMethod) || "unknown";
      counts[m] = (counts[m] ?? 0) + 1;
    });
    const COLORS = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];
    return Object.entries(counts).map(([label, value], i) => ({ label, value, color: COLORS[i % COLORS.length] }));
  }, [filteredOrders]);

  const orderTypeSplit = useMemo(() => [
    { label: "Catalog", value: filteredOrders.filter((o) => norm(o.orderType) !== "custom").length, color: "#6366f1" },
    { label: "Custom", value: filteredOrders.filter((o) => norm(o.orderType) === "custom").length, color: "#8b5cf6" },
  ], [filteredOrders]);

  const topProducts = useMemo(() => {
    const salesMap: Record<string, number> = {};
    orders.forEach((o) => {
      rowArray(o.items).forEach((item) => {
        const name = String(item.productName ?? item.name ?? "Unknown");
        salesMap[name] = (salesMap[name] ?? 0) + 1;
      });
    });
    return Object.entries(salesMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
  }, [orders]);

  const fulfillmentRate = pct(m.deliveredCount, m.totalOrders);
  const maxRevMonth = Math.max(...revenueByMonth.map((b) => b.value), 1);

  const rangeLabel: Record<DateRange, string> = {
    "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days",
    "1y": "Last 12 months", "all": "All time",
  };

  /* ─────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* ── Standard page header (matches employees/overview style) ── */}
      <header className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl relative overflow-hidden ring-1 ring-black/[0.02] border-l-[4px] border-l-indigo-500">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 shadow-sm">
              <BarChart2 className="h-10 w-10" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 mb-1">Analytics & Reports</p>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Analytics Center</h1>
              <p className="mt-1 text-sm font-medium text-slate-500 max-w-2xl">
                Real-time business intelligence — revenue, orders, customers, and product performance.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 shrink-0 items-end">
            {/* Date range pills */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1 border border-slate-200">
              {(["7d", "30d", "90d", "1y", "all"] as DateRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200",
                    range === r
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white"
                  )}
                >
                  {r === "all" ? "All" : r}
                </button>
              ))}
            </div>
            {/* Refresh button */}
            <button
              type="button"
              onClick={() => hardRefreshPage()}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 transition-all disabled:opacity-60 group"
            >
              <RefreshCw className="h-4 w-4 text-slate-400 group-hover:rotate-180 transition-transform duration-500" />
              Refresh
            </button>
          </div>
        </div>

        {/* Range indicator badge */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-100 px-3 py-1.5">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">{rangeLabel[range]}</span>
          <span className="text-[10px] text-indigo-400 font-bold">• {m.totalOrders} orders · {m.customers} customers · {m.products} products</span>
        </div>
      </header>

      {/* ── Hero KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiHero label="Total Revenue" value={money(m.revenue)} sub={`From ${m.paidOrders} paid orders`} icon={DollarSign}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" trend={`${m.conversionRate}% conversion`} trendUp={m.conversionRate > 40} />
        <KpiHero label="Total Orders" value={String(m.totalOrders)} sub={`${m.pendingCount} pending · ${m.deliveredCount} delivered`} icon={ShoppingBag}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700" trend={m.totalOrders > 0 ? "Orders in period" : "No orders yet"} trendUp={m.totalOrders > 0} />
        <KpiHero label="Total Customers" value={String(m.customers)} sub={`${m.newCustomers} new this period`} icon={Users}
          gradient="bg-gradient-to-br from-violet-500 to-violet-700" trend="Registered accounts" trendUp={true} />
        <KpiHero label="Avg. Order Value" value={money(m.avgOrderValue)} sub={`${m.failedCount} failed payments`} icon={Target}
          gradient="bg-gradient-to-br from-rose-500 to-rose-700" trend={m.failedCount === 0 ? "No failures" : `${m.failedCount} failed`} trendUp={m.failedCount === 0} />
      </div>

      {/* ── Status mini-KPIs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Delivered", value: m.deliveredCount, icon: CheckCircle2, cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
          { label: "Pending", value: m.pendingCount, icon: Clock, cls: "text-amber-700 bg-amber-50 border-amber-200" },
          { label: "Failed Payments", value: m.failedCount, icon: XCircle, cls: "text-red-700 bg-red-50 border-red-200" },
          { label: "Catalog Items", value: m.products, icon: Package, cls: "text-blue-700 bg-blue-50 border-blue-200" },
        ].map((item) => (
          <div key={item.label} className={cn("rounded-2xl border p-5 flex items-center gap-4", item.cls)}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <item.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{item.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Revenue & Orders charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionCard title="Revenue Over Time" subtitle="Monthly revenue from paid orders — last 12 months" icon={TrendingUp}>
          <BarChart data={revenueByMonth.map((b) => ({ label: b.label, value: Math.round(b.value) }))} color="bg-emerald-500" />
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>Peak: {money(maxRevMonth)}</span>
            <span>Period total: {money(revenueByMonth.reduce((s, b) => s + b.value, 0))}</span>
          </div>
        </SectionCard>

        <SectionCard title="Orders Over Time" subtitle="Monthly order volume — last 12 months" icon={Activity}>
          <BarChart data={ordersByMonth} color="bg-blue-500" />
          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>Peak: {Math.max(...ordersByMonth.map((b) => b.value), 0)} orders</span>
            <span>Period total: {ordersByMonth.reduce((s, b) => s + b.value, 0)} orders</span>
          </div>
        </SectionCard>
      </div>

      {/* ── Order Status Breakdown & Payment Method Split ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SectionCard title="Order Status Breakdown" subtitle="Distribution of orders by current status" icon={PieChart}>
            {ordersByStatus.length === 0 ? (
              <EmptyState label="No orders in this period" />
            ) : (
              <div className="space-y-3">
                {ordersByStatus.map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className="w-32 shrink-0 text-xs font-black uppercase tracking-wider text-slate-600 truncate capitalize">
                      {label.replaceAll("_", " ")}
                    </div>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all duration-700", ORDER_STATUS_COLORS[label] ?? "bg-slate-400")}
                        style={{ width: `${pct(value, m.totalOrders)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-black text-slate-700">{value}</span>
                    <span className="w-10 text-right text-[10px] font-bold text-slate-400">{pct(value, m.totalOrders)}%</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard title="Payment Methods" subtitle="How customers pay" icon={Zap}>
          {paymentMethodSplit.length === 0 ? (
            <EmptyState label="No payment data" />
          ) : (
            <div className="flex flex-col items-center gap-6">
              <DonutChart segments={paymentMethodSplit} />
              <div className="space-y-2 w-full">
                {paymentMethodSplit.map((seg) => (
                  <div key={seg.label} className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                    <span className="flex-1 text-xs font-bold text-slate-700 capitalize truncate">
                      {seg.label.replaceAll("_", " ")}
                    </span>
                    <span className="text-xs font-black text-slate-900">{seg.value}</span>
                    <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{pct(seg.value, m.totalOrders)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Order Type & Fulfillment gauge & Conversion KPIs ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Order type split */}
        <SectionCard title="Order Types" subtitle="Catalog vs. Custom orders in period" icon={Globe}>
          {m.totalOrders === 0 ? (
            <EmptyState label="No orders in period" />
          ) : (
            <div className="flex flex-col items-center gap-6">
              <DonutChart segments={orderTypeSplit} />
              <div className="space-y-2 w-full">
                {orderTypeSplit.map((seg) => (
                  <div key={seg.label} className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: seg.color }} />
                    <span className="flex-1 text-xs font-bold text-slate-700">{seg.label}</span>
                    <span className="text-xs font-black text-slate-900">{seg.value}</span>
                    <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{pct(seg.value, m.totalOrders)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Fulfillment gauge */}
        <SectionCard title="Fulfillment Rate" subtitle="Delivered orders vs. total" icon={Truck}>
          <div className="flex flex-col items-center gap-5 py-2">
            <div className="relative flex items-center justify-center">
              <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke={fulfillmentRate >= 70 ? "#10b981" : fulfillmentRate >= 40 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset={`${2 * Math.PI * 38 * (1 - fulfillmentRate / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-slate-900">{fulfillmentRate}%</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fulfilled</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                <p className="text-xl font-black text-emerald-700">{m.deliveredCount}</p>
                <p className="text-[10px] font-bold text-emerald-500 uppercase">Delivered</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                <p className="text-xl font-black text-slate-700">{m.totalOrders}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Conversion health */}
        <SectionCard title="Conversion Health" subtitle="Key rate indicators" icon={Award}>
          {m.totalOrders === 0 ? (
            <EmptyState label="No orders in period" />
          ) : (
            <div className="space-y-4">
              {[
                { label: "Payment Conversion", val: m.conversionRate, text: `${m.conversionRate}%`, color: m.conversionRate > 60 ? "bg-emerald-500" : m.conversionRate > 30 ? "bg-amber-500" : "bg-red-500" },
                { label: "Fulfillment Rate", val: fulfillmentRate, text: `${fulfillmentRate}%`, color: fulfillmentRate > 60 ? "bg-blue-500" : "bg-amber-500" },
                { label: "Failure Rate", val: pct(m.failedCount, m.totalOrders), text: `${pct(m.failedCount, m.totalOrders)}%`, color: pct(m.failedCount, m.totalOrders) < 5 ? "bg-emerald-500" : "bg-red-500" },
                { label: "New Customers (period)", val: m.customers ? pct(m.newCustomers, m.customers) : 0, text: `${m.newCustomers} new`, color: "bg-violet-500" },
              ].map((item) => (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">{item.label}</span>
                    <span className="text-xs font-black text-slate-900">{item.text}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-700", item.color)} style={{ width: `${Math.min(item.val, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Customer growth chart ── */}
      <SectionCard title="Customer Growth" subtitle="New customer registrations — last 12 months" icon={Users}>
        <BarChart data={customersByMonth} color="bg-violet-500" />
        <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-bold">
          <span>Total customers: {m.customers}</span>
          <span>New this period: {m.newCustomers}</span>
        </div>
      </SectionCard>

      {/* ── Top Products & Period Summary ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionCard title="Top Products" subtitle="Most ordered items across all time" icon={Star}>
          {topProducts.length === 0 ? (
            <EmptyState label="No product order data available" />
          ) : (
            <div className="space-y-3">
              {topProducts.map(({ name, count }, i) => (
                <div key={name} className="flex items-center gap-4">
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black",
                    i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-orange-300 text-orange-800" : "bg-slate-100 text-slate-500"
                  )}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-900 truncate">{name}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct(count, topProducts[0]?.count ?? 1)}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-black text-slate-700 shrink-0 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Period Summary" subtitle={`All metrics for: ${rangeLabel[range]}`} icon={AlertTriangle}>
          <div className="divide-y divide-slate-100">
            {[
              { label: "Total Revenue", value: money(m.revenue), badge: "green" },
              { label: "Total Orders", value: String(m.totalOrders), badge: "blue" },
              { label: "Paid Orders", value: String(m.paidOrders), badge: "green" },
              { label: "Pending Orders", value: String(m.pendingCount), badge: "amber" },
              { label: "Delivered Orders", value: String(m.deliveredCount), badge: "green" },
              { label: "Failed Payments", value: String(m.failedCount), badge: m.failedCount > 0 ? "red" : "green" },
              { label: "Avg. Order Value", value: money(m.avgOrderValue), badge: "blue" },
              { label: "Conversion Rate", value: `${m.conversionRate}%`, badge: m.conversionRate > 50 ? "green" : "amber" },
              { label: "Fulfillment Rate", value: `${fulfillmentRate}%`, badge: fulfillmentRate > 50 ? "green" : "amber" },
              { label: "Total Customers", value: String(m.customers), badge: "violet" },
              { label: "New Customers", value: String(m.newCustomers), badge: "violet" },
              { label: "Catalog Products", value: String(m.products), badge: "blue" },
            ].map(({ label, value, badge }) => (
              <div key={label} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-bold text-slate-600">{label}</span>
                <span className={cn("text-xs font-black px-3 py-1 rounded-full",
                  badge === "green" ? "bg-emerald-50 text-emerald-700" :
                  badge === "blue" ? "bg-blue-50 text-blue-700" :
                  badge === "amber" ? "bg-amber-50 text-amber-700" :
                  badge === "red" ? "bg-red-50 text-red-700" :
                  badge === "violet" ? "bg-violet-50 text-violet-700" :
                  "bg-slate-50 text-slate-600"
                )}>{value}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
