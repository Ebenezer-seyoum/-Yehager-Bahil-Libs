"use client";

import Link from "next/link";
import {
  ArchiveRestore,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Database,
  FileCheck,
  HardDrive,
  LockKeyhole,
  Package,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Truck,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminPageId, AdminWorkspaceData } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type Mode = "returns" | "shipping" | "transactions" | "coupons";
type Row = Record<string, unknown>;

type OperationRow = {
  id: string;
  primary: string;
  secondary: string;
  status: string;
  amount?: string;
  reference?: string;
  date?: string;
  href?: string;
  badgeTone: "green" | "blue" | "yellow" | "red" | "slate";
};

const modeConfig: Record<Mode, { pageId: AdminPageId; empty: string; description: string }> = {
  returns: {
    pageId: "returns-refunds",
    empty: "No return or refund records match this view.",
    description: "Return and refund records are derived from live order and payment status.",
  },
  shipping: {
    pageId: "shipping-delivery",
    empty: "No shipping or delivery records match this view.",
    description: "Delivery status is derived from fulfillment and order status.",
  },
  transactions: {
    pageId: "transactions",
    empty: "No transaction records match this view.",
    description: "Transactions are built from live payment records on orders.",
  },
  coupons: {
    pageId: "coupons-discounts",
    empty: "No coupon or discount records exist in current order/product data.",
    description: "Coupon activity appears here when orders or products contain discount fields.",
  },
};

function norm(value: unknown) {
  return String(value ?? "").toLowerCase().trim();
}

function text(value: unknown, fallback = "-") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function money(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function dateLabel(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function orderId(order: Row) {
  return text(order.orderNumber ?? order.orderNo ?? order.id, "Order");
}

function customer(order: Row) {
  return text(order.customerName ?? order.name ?? order.userName ?? order.userEmail ?? order.email, "Customer not recorded");
}

function orderAmount(order: Row) {
  return money(order.totalUsd ?? order.total ?? order.amount ?? order.grandTotal ?? order.totalAmount);
}

function returnStatus(order: Row) {
  const explicit = norm(order.returnStatus ?? order.refundStatus);
  if (explicit) return explicit;
  const payment = norm(order.paymentStatus);
  const status = norm(order.status);
  if (payment === "refunded") return "refunded";
  if (status === "returned") return "approved";
  if (["cancelled", "canceled"].includes(status)) return "rejected";
  if (payment === "refund_pending") return "pending";
  return "pending";
}

function shippingStatus(order: Row) {
  const explicit = norm(order.deliveryStatus ?? order.shippingStatus);
  if (explicit) return explicit;
  const status = norm(order.status);
  if (["delivered", "picked_up"].includes(status)) return "delivered";
  if (status === "out_for_delivery") return "out_for_delivery";
  if (status === "shipped") return "shipped";
  if (["cancelled", "canceled", "failed"].includes(status)) return "failed";
  return "preparing";
}

function toneFor(status: string): OperationRow["badgeTone"] {
  if (["paid", "approved", "delivered", "completed", "succeeded", "active"].includes(status)) return "green";
  if (["shipped", "out_for_delivery", "used"].includes(status)) return "blue";
  if (["pending", "preparing", "awaiting_verification"].includes(status)) return "yellow";
  if (["failed", "rejected", "refunded", "expired", "cancelled", "canceled"].includes(status)) return "red";
  return "slate";
}

function statusLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildRows(mode: Mode, data: AdminWorkspaceData): OperationRow[] {
  const orders = data.orders ?? [];
  const products = data.products ?? [];
  const audit = data.audit ?? [];

  if (mode === "returns") {
    return orders
      .filter((order) => {
        const status = norm(order.status);
        const payment = norm(order.paymentStatus);
        return Boolean(order.returnStatus ?? order.refundStatus ?? order.refundAmount) || status === "returned" || payment === "refunded" || payment === "refund_pending";
      })
      .map((order) => {
        const status = returnStatus(order);
        return {
          id: String(order.id ?? orderId(order)),
          primary: orderId(order),
          secondary: customer(order),
          status,
          amount: money(order.refundAmount ?? order.totalUsd ?? order.total ?? order.amount ?? order.grandTotal ?? order.totalAmount),
          reference: text(order.refundReason ?? order.returnReason ?? order.paymentMethod, "No reason recorded"),
          date: dateLabel(order.updatedAt ?? order.createdAt),
          href: order.id ? `/admin/orders/${order.id}?from=returns` : undefined,
          badgeTone: toneFor(status),
        };
      });
  }

  if (mode === "shipping") {
    return orders.map((order) => {
      const status = shippingStatus(order);
      return {
        id: String(order.id ?? orderId(order)),
        primary: orderId(order),
        secondary: customer(order),
        status,
        amount: text(order.carrier ?? order.fulfillmentType ?? order.shippingMethod, "Delivery method pending"),
        reference: text(order.trackingNumber ?? order.shippingAddress ?? order.pickupLocation, "No tracking details"),
        date: dateLabel(order.updatedAt ?? order.createdAt),
        href: order.id ? `/admin/orders/${order.id}` : undefined,
        badgeTone: toneFor(status),
      };
    });
  }

  if (mode === "transactions") {
    return orders
      .filter((order) => order.paymentStatus || order.paymentMethod || order.paymentCurrency)
      .map((order) => {
        const status = norm(order.paymentStatus) || "pending";
        return {
          id: String(order.id ?? orderId(order)),
          primary: orderId(order),
          secondary: customer(order),
          status,
          amount: orderAmount(order),
          reference: text(order.paymentMethod ?? order.paymentReference ?? order.stripePaymentIntentId, "Payment method pending"),
          date: dateLabel(order.paidAt ?? order.updatedAt ?? order.createdAt),
          href: order.id ? `/admin/payments/${order.id}` : undefined,
          badgeTone: toneFor(status),
        };
      });
  }

  if (mode === "coupons") {
    const orderDiscounts = orders
      .filter((order) => order.couponCode || order.discountCode || Number(order.discountAmount ?? 0) > 0)
      .map((order) => {
        const code = text(order.couponCode ?? order.discountCode, "Manual discount");
        return {
          id: `order-${String(order.id ?? code)}`,
          primary: code,
          secondary: `Used by ${customer(order)}`,
          status: "used",
          amount: money(order.discountAmount ?? order.discountTotal),
          reference: orderId(order),
          date: dateLabel(order.updatedAt ?? order.createdAt),
          href: order.id ? `/admin/orders/${order.id}` : undefined,
          badgeTone: toneFor("used"),
        };
      });
    const productDiscounts = products
      .filter((product) => Number(product.discountPercent ?? product.discountAmount ?? 0) > 0 || (Number(product.compareAtPrice ?? 0) > Number(product.price ?? 0) && Number(product.price ?? 0) > 0))
      .map((product) => ({
        id: `product-${String(product.id ?? product.name)}`,
        primary: text(product.discountCode ?? product.code ?? product.name, "Product discount"),
        secondary: text(product.name ?? product.title, "Catalog item"),
        status: product.isActive === false ? "expired" : "active",
        amount: money(product.discountAmount ?? product.compareAtPrice),
        reference: text(product.category ?? product.region, "Catalog discount"),
        date: dateLabel(product.updatedAt ?? product.createdAt),
        href: product.id ? `/admin/inventory/${product.id}` : undefined,
        badgeTone: toneFor(product.isActive === false ? "expired" : "active"),
      }));
    return [...orderDiscounts, ...productDiscounts];
  }

  return [];
}

function filterRows(mode: Mode, rows: OperationRow[], tab: string, search: string) {
  const query = search.trim().toLowerCase();
  return rows.filter((row) => {
    const tabMatch =
      tab === "all" ||
      tab === "overview" ||
      row.status === tab ||
      false;
    const searchMatch = query
      ? [row.primary, row.secondary, row.status, row.amount, row.reference, row.date].some((value) => String(value ?? "").toLowerCase().includes(query))
      : true;
    return tabMatch && searchMatch;
  });
}

function OperationMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ message, description }: { message: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-slate-400" />
      <h2 className="mt-4 text-lg font-black text-slate-950">{message}</h2>
      <p className="mt-2 text-sm font-medium text-slate-500">{description}</p>
    </div>
  );
}

export function AdminOperationsWorkspace({ data, mode }: { data: AdminWorkspaceData; mode: Mode }) {
  const config = modeConfig[mode];
  const allRows = useMemo(() => buildRows(mode, data), [data, mode]);

  return (
    <AdminWorkspace pageId={config.pageId} initialData={data} hideKpis showDateRange={mode !== "backup"}>
      {({ activeTab, search, setDisplayedRecordsCount }) => (
        <OperationsContent
          activeTab={activeTab}
          allRows={allRows}
          config={config}
          mode={mode}
          search={search}
          setDisplayedRecordsCount={setDisplayedRecordsCount}
        />
      )}
    </AdminWorkspace>
  );
}

function OperationsContent({
  activeTab,
  allRows,
  config,
  mode,
  search,
  setDisplayedRecordsCount,
}: {
  activeTab: string;
  allRows: OperationRow[];
  config: (typeof modeConfig)[Mode];
  mode: Mode;
  search: string;
  setDisplayedRecordsCount: (count: number | null) => void;
}) {
  const rows = useMemo(() => filterRows(mode, allRows, activeTab, search), [activeTab, allRows, mode, search]);

  useEffect(() => {
    setDisplayedRecordsCount(rows.length);
  }, [rows.length, setDisplayedRecordsCount]);

  const completed = rows.filter((row) => ["completed", "paid", "approved", "delivered", "active", "used"].includes(row.status)).length;
  const pending = rows.filter((row) => ["pending", "preparing", "awaiting_verification"].includes(row.status)).length;
  const failed = rows.filter((row) => ["failed", "rejected", "refunded", "expired"].includes(row.status)).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <OperationMetric label="Records" value={String(rows.length)} icon={FileCheck} />
        <OperationMetric label="Completed" value={String(completed)} icon={CheckCircle2} />
        <OperationMetric label="Pending" value={String(pending)} icon={mode === "shipping" ? Truck : Package} />
        <OperationMetric label="Exceptions" value={String(failed)} icon={mode === "transactions" ? CreditCard : XCircle} />
      </div>

      {rows.length === 0 ? (
        <EmptyState message={config.empty} description={config.description} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Record</th>
                  <th className="px-5 py-4">Owner</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Amount / Method</th>
                  <th className="px-5 py-4">Reference</th>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-5 py-4 font-black text-slate-950">{row.primary}</td>
                    <td className="px-5 py-4 font-semibold text-slate-600">{row.secondary}</td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-black",
                          row.badgeTone === "green" && "bg-emerald-100 text-emerald-700",
                          row.badgeTone === "blue" && "bg-blue-100 text-blue-700",
                          row.badgeTone === "yellow" && "bg-amber-100 text-amber-700",
                          row.badgeTone === "red" && "bg-rose-100 text-rose-700",
                          row.badgeTone === "slate" && "bg-slate-100 text-slate-700",
                        )}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">{row.amount ?? "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{row.reference ?? "-"}</td>
                    <td className="px-5 py-4 text-slate-500">{row.date ?? "-"}</td>
                    <td className="px-5 py-4">
                      {row.href ? (
                        <Link href={row.href} className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-100">
                          Open
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-slate-400">Audit only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

function BackupOperationsContent({ activeTab, rows, canEdit }: { activeTab: string; rows: OperationRow[]; canEdit: boolean }) {
  const completed = rows.filter((row) => row.status === "completed").length;
  const restores = rows.filter((row) => row.status === "restore").length;
  const failures = rows.filter((row) => row.status === "failed").length;
  const lastBackup = rows.find((row) => row.status === "completed");

  if (activeTab === "restore") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <h2 className="font-black text-amber-950">Restore is a controlled production operation</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-amber-900/80">A restore must first pass backup validation, impact review, approval, and a maintenance-window check. No restore action is available until the dedicated job runner is connected.</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Restore workflow</p><h2 className="mt-1 text-lg font-black text-slate-950">Safety gates</h2></div>
              <LockKeyhole className="h-5 w-5 text-slate-400" />
            </div>
            <div className="mt-5 space-y-3">
              {["Select a verified restore point", "Review data scope and impact", "Confirm maintenance window", "Approve and monitor the restore job"].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">{index + 1}</span>
                  <span className="text-sm font-bold text-slate-700">{step}</span>
                  <span className="ml-auto text-xs font-black uppercase text-slate-400">Locked</span>
                </div>
              ))}
            </div>
            <button type="button" disabled={!canEdit} className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-500">Start restore review <ArrowRight className="h-4 w-4" /></button>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Restore history</p>
            <p className="mt-2 text-4xl font-black">{restores}</p>
            <p className="mt-1 text-sm font-medium text-slate-400">recorded restore events</p>
            <div className="mt-6 border-t border-white/10 pt-4 text-sm text-slate-300">Every restore must be attributable to an operator, backup ID, approval reference, and result.</div>
          </section>
        </div>
      </div>
    );
  }

  if (activeTab === "overview") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <OperationMetric label="Verified backups" value={String(completed)} icon={Database} />
          <OperationMetric label="Restore events" value={String(restores)} icon={RefreshCw} />
          <OperationMetric label="Exceptions" value={String(failures)} icon={ShieldAlert} />
          <OperationMetric label="Storage status" value="Not connected" icon={HardDrive} />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Recovery readiness</p><h2 className="mt-1 text-xl font-black text-slate-950">Recovery controls need configuration</h2></div><ShieldCheck className="h-6 w-6 text-amber-600" /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {["Database backup", "Uploaded files", "Backup encryption", "Off-site retention"].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="h-2 w-2 rounded-full bg-amber-500" /><span className="text-sm font-bold text-slate-700">{item}</span><span className="ml-auto text-xs font-black text-amber-600">Not configured</span></div>)}
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-500">{lastBackup ? `Last recorded backup: ${lastBackup.date ?? "date unavailable"}.` : "No completed backup has been recorded yet."} Configure the job runner and storage provider before treating the system as recoverable.</p>
          </section>
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><p className="text-xs font-black uppercase tracking-wide text-blue-700">Operator actions</p><h2 className="mt-1 text-lg font-black text-blue-950">Backup controls</h2><p className="mt-2 text-sm font-medium leading-6 text-blue-900/75">Actions require backup.edit permission and a connected backend job runner.</p><button type="button" disabled className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-blue-200 px-4 py-3 text-sm font-black text-blue-700">Create backup <ArchiveRestore className="h-4 w-4" /></button><p className="mt-3 text-xs font-bold text-blue-800/70">Execution is intentionally unavailable in this release.</p></section>
        </div>
        <BackupActivityTable rows={rows} />
      </div>
    );
  }

  return <BackupActivityTable rows={rows} />;
}

function BackupActivityTable({ rows }: { rows: OperationRow[] }) {
  if (!rows.length) return <EmptyState message="No backup or restore activity is recorded yet." description="Completed jobs, failures, and restore approvals will appear here once the recovery service is connected." />;
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Operation</th><th className="px-5 py-4">Operator</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Reference</th><th className="px-5 py-4">Date</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-200"><td className="px-5 py-4 font-black text-slate-950">{row.primary}</td><td className="px-5 py-4 font-semibold text-slate-600">{row.secondary}</td><td className="px-5 py-4"><span className={cn("rounded-full px-3 py-1 text-xs font-black", row.badgeTone === "green" && "bg-emerald-100 text-emerald-700", row.badgeTone === "red" && "bg-rose-100 text-rose-700")}>{statusLabel(row.status)}</span></td><td className="px-5 py-4 text-slate-600">{row.reference ?? "-"}</td><td className="px-5 py-4 text-slate-500">{row.date ?? "-"}</td></tr>)}</tbody></table></div></div>;
}
