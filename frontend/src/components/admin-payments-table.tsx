"use client";

import { useMemo, useState, useEffect } from "react";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { ADMIN_TABLE_WRAPPER } from "@/lib/admin/admin-design-system";
import { AlertCircle, CheckCircle2, CreditCard, Eye, Landmark, Search, X } from "lucide-react";
import Link from "next/link";
import { dashboardConfirm, dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";

type Order = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  totalUsd?: number | string | null;
  totalEtb?: number | string | null;
  paymentProofUploadedAt?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
  paymentProofUrl?: string | null;
  payment_proof_url?: string | null;
  createdAt?: string | null;
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  awaiting_verification: "bg-red-50 text-red-700",
  paid: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  refunded: "bg-slate-200 text-slate-700",
  unpaid: "bg-orange-100 text-orange-700",
};

function pretty(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "pending";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatUsd(value?: number | string | null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

function getPaymentMethod(order: Order) {
  if (order.paymentMethod === "etb_bank_transfer" || order.paymentCurrency === "ETB") return "ETB Transfer";
  return "Stripe";
}

function getMethodValue(order: Order) {
  return getPaymentMethod(order).toLowerCase().includes("etb") ? "etb" : "stripe";
}

function getProofUrl(order: Order) {
  return order.paymentProofUrl ?? order.payment_proof_url ?? null;
}

function canReviewPayment(order: Order) {
  return order.paymentStatus === "awaiting_verification";
}

export function AdminPaymentsTable({
  initialOrders,
  externalSearch,
  hideToolbar,
}: {
  initialOrders: Order[];
  externalSearch?: string;
  hideToolbar?: boolean;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const effectiveSearch = externalSearch ?? search;
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [viewer, setViewer] = useState<Order | null>(null);
  const [orderViewer, setOrderViewer] = useState<Order | null>(null);
  const [viewedPaymentIds, setViewedPaymentIds] = useState<string[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const paymentOrders = useMemo(
    () => orders.filter((order) => order.paymentMethod || order.paymentCurrency || order.paymentStatus),
    [orders],
  );

  const statuses = useMemo(
    () => Array.from(new Set(paymentOrders.map((order) => order.paymentStatus ?? "pending"))).sort(),
    [paymentOrders],
  );

  const filteredOrders = useMemo(() => {
    const needle = effectiveSearch.trim().toLowerCase();
    return paymentOrders.filter((order) => {
      const matchesSearch =
        !needle ||
        [order.orderNumber, order.customerName, order.userEmail, getPaymentMethod(order), order.paymentStatus]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      const matchesStatus = statusFilter === "all" || (order.paymentStatus ?? "pending") === statusFilter;
      const matchesMethod = methodFilter === "all" || getMethodValue(order) === methodFilter;
      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [effectiveSearch, methodFilter, paymentOrders, statusFilter]);

  const needsAttention = (order: Order) => order.paymentStatus === "awaiting_verification" || order.paymentStatus === "pending";

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
        try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
        return next;
      });
    };
    read();
    window.addEventListener("admin-payment-viewed", onViewed);
    return () => window.removeEventListener("admin-payment-viewed", onViewed);
  }, []);

  useEffect(() => {
    if (!viewer) return;
    const key = "admin-viewed-payment-notifications";
    try {
      const raw = window.localStorage.getItem(key);
      const current = raw ? JSON.parse(raw) : [];
      const next = Array.from(new Set([...current, viewer.id]));
      window.localStorage.setItem(key, JSON.stringify(next));
      setViewedPaymentIds(next);
      window.dispatchEvent(new CustomEvent("admin-payment-viewed", { detail: viewer.id }));
    } catch {
      // ignore
    }
  }, [viewer]);

  async function confirmAndUpdatePayment(order: Order, paymentStatus: "paid" | "failed") {
    const confirmed = await dashboardConfirm({
      title: paymentStatus === "paid" ? "Approve payment?" : "Reject payment?",
      text:
        paymentStatus === "paid"
          ? "Do you want to approve this payment and mark the order as paid?"
          : "Do you want to reject this payment and keep the order flagged for review?",
      confirmButtonText: paymentStatus === "paid" ? "Approve Payment" : "Reject Payment",
      cancelButtonText: "No, cancel",
      tone: paymentStatus === "paid" ? "success" : "danger",
      variant: "payment",
    });

    if (!confirmed) return;

    try {
      const updated = await updatePayment(order, paymentStatus);
      if (!updated) {
        await dashboardError("Could not update payment", "Please try again.");
        return;
      }
      await dashboardSuccess(
        paymentStatus === "paid" ? "Payment approved" : "Payment rejected",
        paymentStatus === "paid" ? "The payment status was updated successfully." : "The payment was marked as rejected.",
      );
      setViewer(null);
    } catch (error) {
      await dashboardError("Could not update payment", error instanceof Error ? error.message : "Please try again.");
    }
  }

  async function updatePayment(order: Order, paymentStatus: "paid" | "failed") {
    if (!canReviewPayment(order)) {
      setNotice({ type: "error", message: "This payment was already reviewed." });
      return false;
    }

    const key = `${order.id}-${paymentStatus}`;
    setBusyKey(key);
    setNotice(null);
    try {
      const res = await fetch(`/api/backend/orders/${order.id}/admin-state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not update payment");
      }
      const payload = (await res.json()) as { data?: Order };
      const updated = payload.data ?? { ...order, paymentStatus };
      setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, ...updated } : item)));
      setViewer((current) => (current?.id === order.id ? { ...current, ...updated } : current));
      setNotice({ type: "success", message: paymentStatus === "paid" ? "Payment approved successfully." : "Payment rejected successfully." });
      return true;
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "Could not update payment." });
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className={ADMIN_TABLE_WRAPPER}>
      <div className="border-b border-border bg-card p-3">
        <div className={`grid gap-2 ${hideToolbar ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
          {!hideToolbar ? (
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search payments..."
              className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
          </label>
          ) : null}
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All Statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}
          </select>
          <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All Methods</option>
            <option value="stripe">Stripe</option>
            <option value="etb">ETB Transfer</option>
          </select>
        </div>
      </div>

      {notice ? (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm font-bold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {notice.message}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <TableHeader>
            <TableHeadRow>
              <TableHeadCell>Date</TableHeadCell>
              <TableHeadCell>Order #</TableHeadCell>
              <TableHeadCell>Customer</TableHeadCell>
              <TableHeadCell>Method</TableHeadCell>
              <TableHeadCell>Amount</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Action</TableHeadCell>
            </TableHeadRow>
          </TableHeader>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">No payment transactions found.</td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const method = getPaymentMethod(order);
                const isEtb = method === "ETB Transfer";
                const proofUrl = getProofUrl(order);
                const MethodIcon = isEtb ? Landmark : CreditCard;
                const highlightRow = needsAttention(order) && !viewedPaymentIds.includes(order.id);
                return (
                  <tr
                    key={order.id}
                    className={`border-b border-border text-foreground transition hover:bg-secondary/40 ${highlightRow ? "bg-red-950/25 ring-2 ring-inset ring-red-800/35 shadow-[inset_0_0_0_1px_rgba(127,29,29,0.35)]" : ""}`}
                  >
                    <td className="px-5 py-5 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {highlightRow ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-700 shadow-[0_0_0_0_rgba(127,29,29,0.9)] animate-pulse" /> : null}
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-5 font-black tracking-wide">#{order.orderNumber ?? order.id}</td>
                    <td className="px-5 py-5">
                      <p className="font-bold">{order.customerName ?? "Customer"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{order.userEmail ?? "-"}</p>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex items-start gap-2">
                        <MethodIcon className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="font-bold">{method}</p>
                          {isEtb && order.totalEtb ? <p className="mt-1 text-sm text-muted-foreground">{Number(order.totalEtb).toLocaleString()} ETB</p> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 font-black text-primary">{formatUsd(order.totalUsd)}</td>
                    <td className="px-5 py-5">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] ?? PAYMENT_STYLES.pending}`}>
                        {pretty(order.paymentStatus)}
                      </span>
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex flex-wrap items-center gap-2">
                        {isEtb && proofUrl ? (
                          <button
                            type="button"
                            onClick={() => setViewer(order)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 text-sm font-semibold text-primary transition hover:bg-primary/90 hover:text-white"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Proof
                          </button>
                        ) : isEtb ? (
                          <span className="inline-flex h-9 items-center rounded-md border border-red-200 bg-red-100 px-3 text-sm font-semibold text-red-900">
                            No payment proof
                          </span>
                        ) : (
                          <span className="inline-flex h-9 items-center rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-900">
                            Stripe
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setOrderViewer(order)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                        >
                          <Eye className="h-4 w-4" />
                          View Order
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs font-medium text-muted-foreground">Showing {filteredOrders.length} of {paymentOrders.length} payment transaction(s)</p>

      {viewer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Payment Proof</p>
                <h3 className="mt-1 text-xl font-bold">Order #{viewer.orderNumber ?? viewer.id}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Uploaded by <span className="font-semibold text-foreground">{viewer.customerName ?? viewer.userEmail ?? "Customer"}</span>
                  {viewer.paymentProofUploadedAt ? ` on ${new Date(viewer.paymentProofUploadedAt).toLocaleString()}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => setViewer(null)} className="rounded-full border border-border bg-secondary p-2 text-muted-foreground hover:text-foreground" aria-label="Close proof viewer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-xl border border-border bg-background p-3">
                <img src={getProofUrl(viewer) ?? ""} alt="Uploaded payment proof screenshot" className="max-h-[72vh] max-w-full rounded-lg object-contain" />
              </div>
              <aside className="space-y-4">
                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <p className="text-xs font-bold uppercase text-muted-foreground">Status</p>
                  <p className="mt-2 text-lg font-black capitalize">{pretty(viewer.paymentStatus)}</p>
                  <p className="mt-3 text-sm text-muted-foreground">{getPaymentMethod(viewer)} - {formatUsd(viewer.totalUsd)}</p>
                </div>
                    {canReviewPayment(viewer) ? (
                  <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3">
                    <p className="flex items-start gap-2 text-sm font-semibold text-red-800">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      Approve or reject only after confirming the bank transfer.
                    </p>
                    <button type="button" disabled={busyKey !== null} onClick={() => void confirmAndUpdatePayment(viewer, "paid")} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-60">
                      <CheckCircle2 className="mr-2 inline h-4 w-4" />
                      Approve Payment
                    </button>
                    <button type="button" disabled={busyKey !== null} onClick={() => void confirmAndUpdatePayment(viewer, "failed")} className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-60">
                      Reject Payment
                    </button>
                    <Link
                      href={`/admin/orders?order=${viewer.id}`}
                      className="flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary"
                    >
                      Open Order
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-secondary/50 p-4">
                    <p className="text-sm font-bold">Review closed</p>
                    <p className="mt-1 text-sm text-muted-foreground">Approve/reject is available only while awaiting verification.</p>
                    <Link
                      href={`/admin/orders?order=${viewer.id}`}
                      className="mt-3 flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary"
                    >
                      Open Order
                    </Link>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      ) : null}

      {orderViewer ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card text-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Order Details</p>
                <h3 className="mt-1 text-xl font-bold">Order #{orderViewer.orderNumber ?? orderViewer.id}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Placed by <span className="font-semibold text-foreground">{orderViewer.customerName ?? orderViewer.userEmail ?? "Customer"}</span>
                </p>
              </div>
              <button type="button" onClick={() => setOrderViewer(null)} className="rounded-full border border-border bg-secondary p-2 text-muted-foreground hover:text-foreground" aria-label="Close order viewer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 p-5">
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Order #</p>
                  <p className="font-black">{orderViewer.orderNumber ?? orderViewer.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(orderViewer.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-black text-primary">{formatUsd(orderViewer.totalUsd)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment</p>
                  <p className="font-medium">{getPaymentMethod(orderViewer)} • {pretty(orderViewer.paymentStatus)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {getProofUrl(orderViewer) ? (
                  <button onClick={() => { setViewer(orderViewer); }} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">View Proof</button>
                ) : (
                  <span className="rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-900">No payment proof</span>
                )}
                <Link href={`/admin/orders?order=${orderViewer.id}`} className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-secondary">Open in Orders</Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
