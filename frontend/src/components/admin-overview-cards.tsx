"use client";

import { useMemo, useState, type ComponentType } from "react";
import { BellRing, Boxes, ClipboardList, DollarSign, Search, ShoppingCart, TrendingUp, UserRound, UsersRound } from "lucide-react";
import { DashboardModalActionBar, DashboardModalBody, DashboardModalFrame, DashboardModalHeader } from "@/components/admin/dashboard-modal";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";

type Order = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  totalUsd?: number | string | null;
  status?: string | null;
  paymentStatus?: string | null;
  createdAt?: string | null;
};

type Alert = {
  id: string;
  title?: string | null;
  message?: string | null;
  severity?: string | null;
  type?: string | null;
  createdAt?: string | null;
  isResolved?: boolean | null;
};

type Product = {
  id: string;
  name?: string | null;
  category?: string | null;
  region?: string | null;
  priceUsd?: number | string | null;
  isActive?: boolean | null;
};

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  lastLoginAt?: string | null;
};

type Row = Record<string, string>;

type Metric = {
  key: string;
  label: string;
  value: string;
  helper: string;
  tone: string;
  icon: any;
  columns: string[];
  rows: Row[];
};

function formatCurrency(value: number | string | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function AdminOverviewCards({
  orders,
  alerts,
  products,
  users,
}: {
  orders: Order[];
  alerts: Alert[];
  products: Product[];
  users: User[];
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const activeProducts = products.filter((product) => product.isActive);
  const customers = users.filter((user) => user.role === "customer");
  const employees = users.filter((user) => user.role === "employee");
  const activeAlerts = alerts.filter((alert) => !alert.isResolved);
  const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.totalUsd ?? 0), 0);

  const orderRows = (items: Order[]) =>
    items.map((order) => ({
      Order: order.orderNumber ?? order.id,
      Customer: order.customerName ?? "—",
      Email: order.userEmail ?? "—",
      Status: order.status ?? "—",
      Payment: order.paymentStatus ?? "—",
      Total: formatCurrency(order.totalUsd),
      Date: formatDate(order.createdAt),
    }));

  const metrics: Metric[] = [
    {
      key: "revenue",
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      helper: "Paid order value",
      tone: "from-emerald-800 to-emerald-600",
      icon: DollarSign,
      columns: ["Order", "Customer", "Payment", "Total", "Date"],
      rows: orderRows(paidOrders),
    },
    {
      key: "orders",
      label: "Total Orders",
      value: String(orders.length),
      helper: "All orders",
      tone: "from-slate-800 to-blue-700",
      icon: ShoppingCart,
      columns: ["Order", "Customer", "Status", "Payment", "Total"],
      rows: orderRows(orders),
    },
    {
      key: "customers",
      label: "Customers",
      value: String(customers.length),
      helper: "Registered customers",
      tone: "from-violet-800 to-violet-600",
      icon: UserRound,
      columns: ["Name", "Email", "Status", "Last Login"],
      rows: customers.map((user) => ({
        Name: user.name ?? "Unnamed user",
        Email: user.email ?? "—",
        Status: user.status ?? "—",
        "Last Login": formatDate(user.lastLoginAt),
      })),
    },
    {
      key: "employees",
      label: "Employees",
      value: String(employees.length),
      helper: "Staff accounts",
      tone: "from-sky-800 to-cyan-700",
      icon: UsersRound,
      columns: ["Name", "Email", "Status", "Last Login"],
      rows: employees.map((user) => ({
        Name: user.name ?? "Unnamed user",
        Email: user.email ?? "—",
        Status: user.status ?? "—",
        "Last Login": formatDate(user.lastLoginAt),
      })),
    },
    {
      key: "products",
      label: "Active Products",
      value: String(activeProducts.length),
      helper: "Visible catalog items",
      tone: "from-indigo-800 to-indigo-600",
      icon: Boxes,
      columns: ["Product", "Category", "Region", "Price"],
      rows: activeProducts.map((product) => ({
        Product: product.name ?? "Unnamed product",
        Category: product.category ?? "—",
        Region: product.region ?? "—",
        Price: formatCurrency(product.priceUsd),
      })),
    },
    {
      key: "pending",
      label: "Pending Orders",
      value: String(pendingOrders.length),
      helper: "Needs attention",
      tone: "from-amber-700 to-orange-600",
      icon: ClipboardList,
      columns: ["Order", "Customer", "Status", "Payment", "Total"],
      rows: orderRows(pendingOrders),
    },
    {
      key: "paid",
      label: "Paid Orders",
      value: String(paidOrders.length),
      helper: "Completed payments",
      tone: "from-teal-800 to-emerald-700",
      icon: TrendingUp,
      columns: ["Order", "Customer", "Payment", "Total", "Date"],
      rows: orderRows(paidOrders),
    },
    {
      key: "alerts",
      label: "Active Alerts",
      value: String(activeAlerts.length),
      helper: "Open system alerts",
      tone: "from-rose-800 to-rose-600",
      icon: BellRing,
      columns: ["Title", "Severity", "Type", "Created"],
      rows: activeAlerts.map((alert) => ({
        Title: alert.title ?? "Untitled alert",
        Severity: alert.severity ?? "—",
        Type: alert.type ?? "—",
        Created: formatDate(alert.createdAt),
      })),
    },
  ];

  const activeMetric = metrics.find((metric) => metric.key === activeKey) ?? null;
  const filteredRows = useMemo(() => {
    if (!activeMetric) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return activeMetric.rows;
    return activeMetric.rows.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(needle)));
  }, [activeMetric, query]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <button
              key={metric.key}
              type="button"
              onClick={() => {
                setActiveKey(metric.key);
                setQuery("");
              }}
              className={`group rounded-3xl bg-gradient-to-br ${metric.tone} p-5 text-left text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)] ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(15,23,42,0.22)]`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">{metric.label}</p>
                  <p className="mt-4 text-3xl font-bold tracking-tight text-white">{metric.value}</p>
                  <p className="mt-2 text-sm font-medium text-white/82">{metric.helper}</p>
                </div>
                <span className="rounded-2xl bg-white/12 p-3 ring-1 ring-white/15 transition group-hover:bg-white/18">
                  <Icon className="h-6 w-6" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {activeMetric ? (
        <DashboardModalFrame onClose={() => setActiveKey(null)} maxWidth="max-w-6xl">
          <DashboardModalHeader
            title={activeMetric.label}
            description={`${activeMetric.rows.length} total record${activeMetric.rows.length === 1 ? "" : "s"}`}
            icon={activeMetric.icon}
            onClose={() => setActiveKey(null)}
          />
          <DashboardModalActionBar>
            <label className="relative block w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-800" />
              {!query ? (
                <span className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                  Search {activeMetric.label.toLowerCase()}...
                </span>
              ) : null}
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </DashboardModalActionBar>
          <DashboardModalBody>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="overflow-x-auto">
                  <table className="min-w-[640px] w-full text-sm">
                    <TableHeader>
                      <TableHeadRow>
                        <TableHeadCell>No</TableHeadCell>
                        {activeMetric.columns.map((column) => (
                          <TableHeadCell key={column}>{column}</TableHeadCell>
                        ))}
                      </TableHeadRow>
                    </TableHeader>
                    <tbody>
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={activeMetric.columns.length + 1} className="px-5 py-12 text-center text-sm font-medium text-muted-foreground">
                            No matching records found.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, index) => (
                          <tr key={`${activeMetric.key}-${index}`} className="border-t border-border odd:bg-white even:bg-slate-50/70 hover:bg-amber-50/70">
                            <td className="px-5 py-4 font-semibold text-slate-500">{index + 1}</td>
                            {activeMetric.columns.map((column) => (
                              <td key={column} className="px-5 py-4 font-medium text-foreground">
                                {row[column] ?? "—"}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Showing {filteredRows.length} of {activeMetric.rows.length} records
              </p>
          </DashboardModalBody>
        </DashboardModalFrame>
      ) : null}
    </>
  );
}
