"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle2, Clock, DollarSign, Mail, Package, Truck, Users, XCircle } from "lucide-react";
import { AdminRevenueCharts } from "@/components/admin-revenue-charts";
import { AdminWorkflowPipeline } from "@/components/admin-workflow-pipeline";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { KPIGrid } from "@/components/admin/kpi-grid";
import { 
  DashboardModalFrame, 
  DashboardModalHeader, 
  DashboardModalActionBar, 
  DashboardModalBody 
} from "@/components/admin/dashboard-modal";
import { can } from "@/lib/permissions";
import { rowsInDateRange } from "@/lib/reports/utils";
import { cn } from "@/lib/utils";
import { PAGE_TABS } from "@/lib/admin/page-tabs-config";
import { getDateRangeBounds, money, normalize } from "@/lib/reports/utils";
import type { AdminWorkspaceData } from "@/lib/admin/types";

type AnyRow = Record<string, any>;

export function AdminDashboardWorkspace({ data }: { data: AdminWorkspaceData }) {
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const isAdmin = session?.user?.role === "admin";

  const [open, setOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalValue, setModalValue] = useState("");
  const [modalRows, setModalRows] = useState<AnyRow[]>([]);
  const [modalColumns, setModalColumns] = useState<string[]>([]);
  const [modalFullPage, setModalFullPage] = useState<string | null>(null);
  const [modalRangeLabel, setModalRangeLabel] = useState<string>("");
  const [modalSearch, setModalSearch] = useState("");

  function cardAllowed(permissionKey?: string) {
    if (!permissionKey) return true;
    return isAdmin || can(permissions, permissionKey);
  }

  function openModal(payload: {
    title: string;
    value: string;
    rows: AnyRow[];
    columns: string[];
    rangeLabel?: string;
    fullPage?: string;
  }) {
    setModalTitle(payload.title);
    setModalValue(payload.value);
    setModalRows(payload.rows.slice(0, 100));
    setModalColumns(payload.columns);
    setModalFullPage(payload.fullPage ?? null);
    setModalRangeLabel(payload.rangeLabel ?? "");
    setModalSearch("");
    setOpen(true);
  }

  const filteredModalRows = useMemo(() => {
    const q = normalize(modalSearch);
    if (!q) return modalRows;
    return modalRows.filter((row) => {
      const haystack = modalColumns.map((c) => String(row?.[c] ?? "")).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [modalColumns, modalRows, modalSearch]);

  function exportModalCsv() {
    if (!modalColumns.length) return;
    const escapeCell = (value: unknown) => {
      const s = String(value ?? "");
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      modalColumns.join(","),
      ...filteredModalRows.map((row) => modalColumns.map((c) => escapeCell(row?.[c])).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${modalTitle || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpi = (model: {
    id: string;
    title: string;
    value: string;
    description: string;
    color: "green" | "blue" | "yellow" | "red" | "purple" | "teal" | "gray";
    icon: any;
    permissionKey?: string;
    onClick?: () => void;
  }) => ({
    ...model,
    changePercent: 0,
    positiveIsGood: true,
  });

  const dashboardHideKpiTabs = (PAGE_TABS.dashboard ?? []).map((t) => t.id).filter((id) => id !== "overview");

  return (
    <AdminWorkspace
      pageId="dashboard"
      initialData={data}
      hideTabs
      hideFilters
      hideKpisOnTabs={dashboardHideKpiTabs}
      showDateRange
      pageClassName="rounded-2xl bg-slate-50"
      footer={<AdminRevenueCharts orders={(data.orders ?? []) as any} />}
    >
      {({ filteredData, dateRange, activeTab }) => {
        const orders = ((filteredData.orders ?? []) as AnyRow[]).slice();
        const users = ((data.users ?? []) as AnyRow[]).slice();
        const products = ((data.products ?? []) as AnyRow[]).slice();
        const supportAll = ((data.support ?? []) as AnyRow[]).slice();

        const { start, end } = getDateRangeBounds(dateRange);
        const rangeLabel = `${dateRange} (${start.toLocaleDateString()} – ${end.toLocaleDateString()})`;
        const inRange = (row: AnyRow, keys: string[]) => {
          for (const key of keys) {
            const raw = row?.[key];
            if (!raw) continue;
            const d = new Date(String(raw));
            if (!Number.isNaN(d.getTime())) return d >= start && d <= end;
          }
          return false;
        };

        const supportTickets = supportAll.filter((t) => inRange(t, ["lastMessageAt", "updatedAt", "createdAt"]));

        const isPaid = (o: AnyRow) => ["paid", "succeeded", "complete", "completed"].includes(normalize(o.paymentStatus));
        const byStatus = (statusList: string[]) => orders.filter((o) => statusList.includes(normalize(o.status)));

        const totalRevenue = orders.filter(isPaid).reduce((sum, o) => sum + Number(o.totalUsd ?? o.total ?? 0), 0);
        const totalOrders = orders.length;
        const pendingOrders = byStatus(["pending"]);
        const deliveredOrders = byStatus(["delivered", "picked_up", "completed"]);
        const totalCustomers = users.filter((u) => normalize(u.role) === "customer").length;
        const totalClothes = products.length;
        const failedPayments = orders.filter((o) => normalize(o.paymentStatus) === "failed");
        const supportIssues = supportTickets.filter((t) => normalize(t.status) !== "resolved");

        const primaryCards = [
          kpi({
            id: "totalRevenue",
            title: "Total Revenue",
            value: money(totalRevenue),
            description: "Paid orders revenue",
            color: "green",
            icon: DollarSign,
            permissionKey: "payments.view",
            onClick: () =>
              openModal({
                title: "Total Revenue",
                value: money(totalRevenue),
                rows: orders.filter(isPaid),
                columns: ["id", "status", "paymentStatus", "paymentMethod", "paymentCurrency", "totalUsd", "createdAt"],
                fullPage: "/admin/payments",
                rangeLabel,
              }),
          }),
          kpi({
            id: "totalOrders",
            title: "Total Orders",
            value: String(totalOrders),
            description: "All orders in range",
            color: "blue",
            icon: Truck,
            permissionKey: "orders.view",
            onClick: () =>
              openModal({
                title: "Total Orders",
                value: String(totalOrders),
                rows: orders,
                columns: ["id", "status", "totalUsd", "paymentStatus", "createdAt"],
                fullPage: "/admin/catalog-orders",
                rangeLabel,
              }),
          }),
          kpi({
            id: "pendingOrders",
            title: "Pending Orders",
            value: String(pendingOrders.length),
            description: "Needs attention",
            color: "yellow",
            icon: Clock,
            permissionKey: "orders.view",
            onClick: () =>
              openModal({
                title: "Pending Orders",
                value: String(pendingOrders.length),
                rows: pendingOrders,
                columns: ["id", "customerName", "totalUsd", "createdAt"],
                fullPage: "/admin/catalog-orders?tab=pending",
                rangeLabel,
              }),
          }),
          kpi({
            id: "deliveredOrders",
            title: "Delivered Orders",
            value: String(deliveredOrders.length),
            description: "Completed",
            color: "green",
            icon: CheckCircle2,
            permissionKey: "orders.view",
            onClick: () =>
              openModal({
                title: "Delivered Orders",
                value: String(deliveredOrders.length),
                rows: deliveredOrders,
                columns: ["id", "customerName", "status", "deliveredAt", "createdAt"],
                fullPage: "/admin/catalog-orders?tab=delivered",
                rangeLabel,
              }),
          }),
          kpi({
            id: "totalCustomers",
            title: "Total Customers",
            value: String(totalCustomers),
            description: "Customer accounts",
            color: "purple",
            icon: Users,
            permissionKey: "customers.view",
            onClick: () =>
              openModal({
                title: "Total Customers",
                value: String(totalCustomers),
                rows: users.filter((u) => normalize(u.role) === "customer"),
                columns: ["id", "name", "email", "createdAt"],
                fullPage: "/admin/customers",
                rangeLabel,
              }),
          }),
          kpi({
            id: "totalClothes",
            title: "Total Clothes",
            value: String(totalClothes),
            description: "All clothing items",
            color: "teal",
            icon: Package,
            permissionKey: "products.view",
            onClick: () =>
              openModal({
                title: "Total Clothes",
                value: String(totalClothes),
                rows: products,
                columns: ["id", "name", "status", "stock", "createdAt"],
                fullPage: "/admin/inventory",
                rangeLabel,
              }),
          }),
          kpi({
            id: "failedPayments",
            title: "Failed Payments",
            value: String(failedPayments.length),
            description: "Payment issues",
            color: "red",
            icon: XCircle,
            permissionKey: "payments.view",
            onClick: () =>
              openModal({
                title: "Failed Payments",
                value: String(failedPayments.length),
                rows: failedPayments,
                columns: ["id", "paymentMethod", "paymentStatus", "createdAt"],
                fullPage: "/admin/payments?tab=failed",
                rangeLabel,
              }),
          }),
          kpi({
            id: "supportIssues",
            title: "Support Issues",
            value: String(supportIssues.length),
            description: "Open support tickets",
            color: "yellow",
            icon: Mail,
            permissionKey: "support.view",
            onClick: () =>
              openModal({
                title: "Support Issues",
                value: String(supportIssues.length),
                rows: supportIssues,
                columns: ["ticketNumber", "subject", "category", "priority", "status", "lastMessageAt"],
                fullPage: "/admin/support-inbox",
                rangeLabel,
              }),
          }),
        ].filter((card) => cardAllowed(card.permissionKey));

        return (
          <div className="space-y-4">
            <section className="space-y-2" />

            <AdminWorkflowPipeline orders={orders as any} />

            {open && (
              <DashboardModalFrame onClose={() => setOpen(false)} maxWidth="max-w-5xl">
                <DashboardModalHeader
                  title={modalTitle}
                  description={
                    <>
                      Total: <span className="font-semibold text-white">{modalValue}</span>
                      {modalRangeLabel ? <span className="ml-2 text-blue-100">• {modalRangeLabel}</span> : null}
                    </>
                  }
                  onClose={() => setOpen(false)}
                />
                
                <DashboardModalActionBar>
                   <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
                    <div className="flex-1">
                      <input
                        value={modalSearch}
                        onChange={(e) => setModalSearch(e.target.value)}
                        placeholder="Search records…"
                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-500 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                       <button
                        type="button"
                        onClick={exportModalCsv}
                        className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                      >
                        Export CSV
                      </button>
                      {modalFullPage ? (
                        <a
                          href={modalFullPage}
                          className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
                        >
                          View Full Page
                        </a>
                      ) : null}
                    </div>
                  </div>
                </DashboardModalActionBar>

                <DashboardModalBody>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="border-b border-blue-100 bg-blue-50 text-slate-900">
                        <tr>
                          {modalColumns.map((col) => (
                            <th key={col} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredModalRows.length === 0 ? (
                          <tr>
                            <td className="px-4 py-6 text-slate-700" colSpan={modalColumns.length}>
                              No records found for this KPI.
                            </td>
                          </tr>
                        ) : (
                          filteredModalRows.map((row, index) => (
                            <tr
                              key={String(row?.id ?? row?.ticketNumber ?? index)}
                              className="border-b border-slate-100 text-slate-800 hover:bg-blue-50/40"
                            >
                              {modalColumns.map((col) => (
                                <td key={col} className="px-4 py-3 text-foreground">
                                  {String(row?.[col] ?? "—")}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </DashboardModalBody>
              </DashboardModalFrame>
            )}
          </div>
        );
      }}
    </AdminWorkspace>
  );
}
