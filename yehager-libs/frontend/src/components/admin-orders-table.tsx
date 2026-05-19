"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Ban, CheckCircle2, MapPin, Search, Truck } from "lucide-react";

type Order = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  totalUsd?: number | string | null;
  status?: string | null;
  paymentStatus?: string | null;
  fulfillmentType?: string | null;
  pickupLocation?: string | null;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
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
const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded", "unpaid"];

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
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return orders;
    return orders.filter((order) =>
      [order.orderNumber, order.customerName, order.userEmail]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [orders, search]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search orders..."
            className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {filteredOrders.length} of {orders.length} order(s)
        </p>
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
                    <td className="px-4 py-3 font-medium text-primary">{formatCurrency(order.totalUsd)}</td>
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
                  {expandedOrderId === order.id && order.fulfillmentType === "pickup" ? (
                    <tr key={`${order.id}-expanded`} className="border-t border-border bg-secondary/20">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="space-y-1 text-sm">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pickup Details</p>
                          <p>
                            <span className="font-medium">Location:</span> {order.pickupLocation ?? "Not set"}
                          </p>
                          <p>
                            <span className="font-medium">Pickup Person:</span> {order.pickupPersonName ?? "—"}
                            {order.pickupPersonPhone ? ` · ${order.pickupPersonPhone}` : ""}
                          </p>
                          <Link href={`/admin/orders/${order.id}`} className="inline-block pt-1 text-sm text-primary hover:underline">
                            Open full order details
                          </Link>
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
