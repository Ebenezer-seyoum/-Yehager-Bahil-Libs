"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ban, CheckCircle2, FileCheck, MapPin, Search, Truck } from "lucide-react";

type Order = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  totalUsd?: number | string | null;
  totalEtb?: number | string | null;
  etbExchangeRate?: number | string | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
  paymentProofUrl?: string | null;
  fulfillmentType?: string | null;
  pickupLocation?: string | null;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
  pickupIdUrl?: string | null;
  pickupSignedDocUrl?: string | null;
  pickupProofUrl?: string | null;
  shippingDocuments?: Array<{ url: string; label: string; uploadedAt?: string | null }> | null;
  createdAt?: string | null;
};

const ORDER_STATUSES = [
  "pending",
  "processing",
  "fulfilled",
  "tailoring",
  "quality_check",
  "shipped",
  "delivered",
  "ready_for_pickup",
  "picked_up",
  "cancelled",
];
const PAYMENT_STATUSES = ["pending", "awaiting_verification", "paid", "failed", "refunded", "unpaid"];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-slate-100 text-slate-700",
  fulfilled: "bg-green-100 text-green-800",
  tailoring: "bg-blue-100 text-blue-700",
  quality_check: "bg-purple-100 text-purple-800",
  shipped: "bg-emerald-100 text-emerald-800",
  delivered: "bg-green-200 text-green-900",
  ready_for_pickup: "bg-orange-100 text-orange-800",
  picked_up: "bg-green-200 text-green-900",
  cancelled: "bg-red-100 text-red-700",
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  awaiting_verification: "bg-yellow-100 text-yellow-900",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-100 text-slate-700",
  unpaid: "bg-orange-100 text-orange-800",
};

function formatCurrency(value: Order["totalUsd"]) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function prettyLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function AdminOrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !needle ||
        [order.orderNumber, order.customerName, order.userEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
      const isPickup = order.fulfillmentType === "pickup";
      const missingPickupDocs = isPickup && (!order.pickupIdUrl || !order.pickupSignedDocUrl);
      const hasShippingDocs = !isPickup && (order.shippingDocuments ?? []).length > 0;
      const matchesFulfillment = fulfillmentFilter === "all" || (fulfillmentFilter === "pickup" ? isPickup : !isPickup);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;
      const matchesReview =
        reviewFilter === "all" ||
        (reviewFilter === "needs_review" && (missingPickupDocs || order.paymentStatus === "awaiting_verification")) ||
        (reviewFilter === "etb_proof" && Boolean(order.paymentProofUrl)) ||
        (reviewFilter === "missing_pickup_docs" && missingPickupDocs) ||
        (reviewFilter === "shipping_docs" && hasShippingDocs);
      return matchesSearch && matchesFulfillment && matchesStatus && matchesPayment && matchesReview;
    });
  }, [fulfillmentFilter, orders, paymentFilter, reviewFilter, search, statusFilter]);

  const statusOptions = useMemo(() => Array.from(new Set(orders.map((order) => order.status).filter(Boolean))).sort(), [orders]);
  const paymentOptions = useMemo(() => Array.from(new Set(orders.map((order) => order.paymentStatus).filter(Boolean))).sort(), [orders]);

  async function updateOrder(orderId: string, patch: Partial<Pick<Order, "status" | "paymentStatus">>) {
    const key = `${orderId}-${Object.keys(patch).join("-")}`;
    setBusyKey(key);
    setError(null);
    try {
      const res = await fetch(`/api/backend/orders/${orderId}/admin-state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not update order");
      }
      const payload = (await res.json()) as { data?: Order };
      const updated = payload.data;
      if (updated) {
        setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, ...updated } : order)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(150px,1fr))]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search orders..."
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
          <select value={fulfillmentFilter} onChange={(event) => setFulfillmentFilter(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All fulfillment</option>
            <option value="pickup">In-store pickup</option>
            <option value="mail">Mailed orders</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status ?? ""}>{prettyLabel(status ?? "")}</option>
            ))}
          </select>
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All payment</option>
            {paymentOptions.map((status) => (
              <option key={status} value={status ?? ""}>{prettyLabel(status ?? "")}</option>
            ))}
          </select>
          <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)} className="h-10 rounded-xl border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All review states</option>
            <option value="needs_review">Needs review</option>
            <option value="etb_proof">ETB proof</option>
            <option value="missing_pickup_docs">Missing pickup docs</option>
            <option value="shipping_docs">Has shipping docs</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <p>Showing {filteredOrders.length} of {orders.length} order(s)</p>
          {(search || fulfillmentFilter !== "all" || statusFilter !== "all" || paymentFilter !== "all" || reviewFilter !== "all") ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFulfillmentFilter("all");
                setStatusFilter("all");
                setPaymentFilter("all");
                setReviewFilter("all");
              }}
              className="rounded-full bg-secondary px-3 py-1 font-medium text-foreground hover:bg-secondary/80"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="rounded-md border border-destructive/40 bg-card p-3 text-sm text-destructive">{error}</div> : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr>
                <td className="px-4 py-5 text-muted-foreground" colSpan={6}>
                  No orders found.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <>
                  <tr
                    key={order.id}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-secondary/30"
                    onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="font-medium text-primary hover:underline"
                      >
                        {order.orderNumber ?? order.id}
                      </Link>
                      {order.createdAt ? <p className="mt-1 text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <p>{order.customerName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{order.userEmail ?? "—"}</p>
                      {order.fulfillmentType === "pickup" ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-primary">
                          <MapPin className="h-3 w-3" />
                          Pickup
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary">{formatCurrency(order.totalUsd)}</p>
                      {order.paymentCurrency === "ETB" && order.totalEtb ? (
                        <p className="mt-1 text-xs text-muted-foreground">{Number(order.totalEtb).toLocaleString()} ETB</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.status ?? "pending"}
                        disabled={busyKey !== null}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => void updateOrder(order.id, { status: event.target.value })}
                        className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${STATUS_STYLES[order.status ?? "pending"] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {prettyLabel(status)}
                          </option>
                        ))}
                      </select>
                      {order.paymentMethod || order.paymentCurrency ? (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {order.paymentMethod ?? "payment"} · {order.paymentCurrency ?? "USD"}
                        </p>
                      ) : null}
                      {order.paymentProofUrl ? (
                        <a
                          href={order.paymentProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                        >
                          <FileCheck className="h-3 w-3" />
                          ETB proof
                        </a>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={order.paymentStatus ?? "pending"}
                        disabled={busyKey !== null}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => void updateOrder(order.id, { paymentStatus: event.target.value })}
                        className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {PAYMENT_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {prettyLabel(status)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          title="Mark delivered"
                          disabled={busyKey !== null}
                          onClick={(event) => {
                            event.stopPropagation();
                            void updateOrder(order.id, { status: "delivered" });
                          }}
                          className="rounded-lg border border-border bg-background p-2 transition hover:bg-secondary disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Refund payment"
                          disabled={busyKey !== null}
                          onClick={(event) => {
                            event.stopPropagation();
                            void updateOrder(order.id, { paymentStatus: "refunded" });
                          }}
                          className="rounded-lg border border-border bg-background p-2 transition hover:bg-secondary disabled:opacity-60"
                        >
                          <Ban className="h-4 w-4 text-destructive" />
                        </button>
                        <button
                          type="button"
                          title="Mark shipped"
                          disabled={busyKey !== null}
                          onClick={(event) => {
                            event.stopPropagation();
                            void updateOrder(order.id, { status: "shipped" });
                          }}
                          className="rounded-lg border border-border bg-background p-2 transition hover:bg-secondary disabled:opacity-60"
                        >
                          <Truck className="h-4 w-4 text-blue-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedOrderId === order.id ? (
                    <tr key={`${order.id}-expanded`} className="border-t border-border bg-secondary/20">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-3 text-sm">
                          {order.fulfillmentType === "pickup" ? (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pickup Details</p>
                              <p>
                                <span className="font-medium">Location:</span> {order.pickupLocation ?? "Not set"}
                              </p>
                              <p>
                                <span className="font-medium">Pickup Person:</span> {order.pickupPersonName ?? "—"}
                                {order.pickupPersonPhone ? ` · ${order.pickupPersonPhone}` : ""}
                              </p>
                              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                                <span className={order.pickupIdUrl ? "text-green-600" : "text-amber-600"}>ID: {order.pickupIdUrl ? "uploaded" : "missing"}</span>
                                <span className={order.pickupSignedDocUrl ? "text-green-600" : "text-amber-600"}>Signed form: {order.pickupSignedDocUrl ? "uploaded" : "missing"}</span>
                                <span className={order.pickupProofUrl ? "text-green-600" : "text-muted-foreground"}>Pickup proof: {order.pickupProofUrl ? "uploaded" : "not uploaded"}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipping Documents</p>
                              {(order.shippingDocuments ?? []).length > 0 ? (
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {(order.shippingDocuments ?? []).map((doc, index) => (
                                    <a key={`${doc.url}-${index}`} href={doc.url} target="_blank" rel="noreferrer" className="rounded-full bg-background px-2 py-1 text-primary hover:underline">
                                      {doc.label}
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No shipping documents uploaded yet.</p>
                              )}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-3 pt-1">
                            <Link href={`/admin/orders/${order.id}`} className="text-sm text-primary hover:underline">
                              Open full order details
                            </Link>
                            <Link href="/admin/orders/documents" className="text-sm text-primary hover:underline">
                              Manage documents
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
