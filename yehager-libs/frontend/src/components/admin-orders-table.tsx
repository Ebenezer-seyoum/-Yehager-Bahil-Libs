"use client";

import { useEffect, useMemo, useState } from "react";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { ADMIN_TABLE_WRAPPER } from "@/lib/admin/admin-design-system";
import {
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Eye,
  ExternalLink,
  FileCheck,
  MapPin,
  Package,
  Ruler,
  Search,
  Truck,
  UserRound,
  X,
} from "lucide-react";

type OrderItem = {
  id?: string | null;
  productId?: string | null;
  productName?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  quantity?: number | string | null;
  price?: number | string | null;
  priceUsd?: number | string | null;
  measurements?: Record<string, string | number | null> | null;
  measurementDetails?: Record<string, string | number | null> | null;
  measurement_details?: Record<string, string | number | null> | null;
};

type ShippingAddress = {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
};

type Order = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  totalUsd?: number | string | null;
  totalEtb?: number | string | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
  paymentProofUrl?: string | null;
  paymentProofUploadedAt?: string | null;
  fulfillmentType?: string | null;
  carrier?: string | null;
  pickupLocation?: string | null;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
  pickupIdUrl?: string | null;
  pickupSignedDocUrl?: string | null;
  pickupProofUrl?: string | null;
  shippingDocuments?: Array<{ url: string; label?: string | null; uploadedAt?: string | null }> | null;
  shippingAddress?: ShippingAddress | null;
  items?: OrderItem[] | null;
  createdAt?: string | null;
};

const ORDER_STATUSES = ["pending", "tailoring", "quality_check", "shipped", "delivered", "ready_for_pickup", "picked_up"];
const PAYMENT_STATUSES = ["pending", "awaiting_verification", "paid", "failed", "refunded", "unpaid"];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-900 border-yellow-200",
  tailoring: "bg-blue-100 text-blue-800 border-blue-200",
  quality_check: "bg-purple-100 text-purple-800 border-purple-200",
  shipped: "bg-cyan-100 text-cyan-800 border-cyan-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  ready_for_pickup: "bg-orange-100 text-orange-800 border-orange-200",
  picked_up: "bg-green-100 text-green-900 border-green-200",
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-900 border-yellow-200",
  awaiting_verification: "bg-orange-100 text-orange-800 border-orange-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-slate-100 text-slate-800 border-slate-200",
  unpaid: "bg-orange-100 text-orange-800 border-orange-200",
};

const MEASUREMENT_LABELS: Record<string, string> = {
  chest: "Chest",
  hips: "Hips",
  armLength: "Arm Length",
  arm_length: "Arm Length",
  waist: "Waist",
  shoulderWidth: "Shoulder Width",
  shoulder_width: "Shoulder Width",
  torsoLength: "Torso Length",
  torso_length: "Torso Length",
};

function formatCurrency(value: Order["totalUsd"]) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function prettyLabel(value?: string | null) {
  return (value ?? "pending").replaceAll("_", " ");
}

function shortOrderNumber(value?: string | null) {
  if (!value) return "-";
  return value.replace(/^#?/, "");
}

function itemTitle(item: OrderItem, index: number) {
  return item.productName ?? item.name ?? `Item ${index + 1}`;
}

function itemImage(item: OrderItem) {
  return item.imageUrl ?? item.image_url ?? null;
}

function measurementRows(item: OrderItem) {
  const measurements = item.measurements ?? item.measurementDetails ?? item.measurement_details ?? {};
  return Object.entries(measurements).filter(([, value]) => value !== null && value !== undefined && value !== "");
}

function needsAttention(order: Order) {
  return order.status === "pending" || order.paymentStatus === "awaiting_verification";
}

export function AdminOrdersTable({
  initialOrders,
  initialSelectedOrderId,
  externalSearch,
  hideToolbar,
}: {
  initialOrders: Order[];
  initialSelectedOrderId?: string | null;
  externalSearch?: string;
  hideToolbar?: boolean;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const effectiveSearch = externalSearch ?? search;
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialSelectedOrderId ?? null);
  const [viewedOrderIdsLocal, setViewedOrderIdsLocal] = useState<string[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  useEffect(() => {
    if (initialSelectedOrderId) {
      setSelectedOrderId(initialSelectedOrderId);
    }
  }, [initialSelectedOrderId]);

  useEffect(() => {
    const key = "admin-viewed-order-notifications";
    const read = () => {
      try {
        const raw = window.localStorage.getItem(key);
        setViewedOrderIdsLocal(raw ? JSON.parse(raw) : []);
      } catch {
        setViewedOrderIdsLocal([]);
      }
    };
    const onViewed = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!id) return;
      setViewedOrderIdsLocal((current) => {
        const next = Array.from(new Set([...current, id]));
        try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
        return next;
      });
    };
    read();
    window.addEventListener("admin-order-viewed", onViewed);
    return () => window.removeEventListener("admin-order-viewed", onViewed);
  }, []);

  function openOrder(orderId: string) {
    setSelectedOrderId(orderId);
    window.dispatchEvent(new CustomEvent("admin-order-viewed", { detail: orderId }));
  }

  const filteredOrders = useMemo(() => {
    const needle = effectiveSearch.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !needle ||
        [order.orderNumber, order.customerName, order.userEmail]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      const isPickup = order.fulfillmentType === "pickup";
      const matchesFulfillment = fulfillmentFilter === "all" || (fulfillmentFilter === "pickup" ? isPickup : !isPickup);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;
      return matchesSearch && matchesFulfillment && matchesStatus && matchesPayment;
    });
  }, [effectiveSearch, fulfillmentFilter, orders, paymentFilter, statusFilter]);

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
      const updated = payload.data ?? { id: orderId, ...patch };
      setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, ...updated } : order)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update order");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className={`grid gap-2 ${hideToolbar ? "sm:grid-cols-3" : "lg:grid-cols-[minmax(260px,1.4fr)_repeat(3,minmax(150px,1fr))_auto]"}`}>
          {!hideToolbar ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by order #, name, or email..."
              className="h-9 w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
          </div>
          ) : null}
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All Statuses</option>
            {ORDER_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
          </select>
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All Payments</option>
            {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
          </select>
          <select value={fulfillmentFilter} onChange={(event) => setFulfillmentFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All Types</option>
            <option value="mail">Mail / EMS</option>
            <option value="pickup">Pickup</option>
          </select>
          <p className="flex h-9 items-center whitespace-nowrap text-sm text-muted-foreground">{filteredOrders.length} orders</p>
        </div>
        {error ? <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</div> : null}
      </div>

      <div className={ADMIN_TABLE_WRAPPER}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm">
            <TableHeader>
              <TableHeadRow>
                <TableHeadCell>Order #</TableHeadCell>
                <TableHeadCell>Customer</TableHeadCell>
                <TableHeadCell>Clothing Items</TableHeadCell>
                <TableHeadCell>Total</TableHeadCell>
                <TableHeadCell>Fulfillment</TableHeadCell>
                <TableHeadCell>Order Status</TableHeadCell>
                <TableHeadCell>Payment</TableHeadCell>
                <TableHeadCell aria-label="Open details" />
              </TableHeadRow>
            </TableHeader>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-muted-foreground" colSpan={8}>No orders found.</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const items = order.items ?? [];
                  const firstItem = items[0];
                  const isPickup = order.fulfillmentType === "pickup";
                  const isViewed = viewedOrderIdsLocal.includes(order.id);
                  const highlightRow = needsAttention(order) && !isViewed;
                  const isSelected = selectedOrderId === order.id;
                  return (
                    <tr
                      key={order.id}
                      className={`border-t border-border transition hover:bg-secondary/30 ${highlightRow ? "bg-red-950/25 ring-2 ring-inset ring-red-800/35 shadow-[inset_0_0_0_1px_rgba(127,29,29,0.35)]" : ""} ${isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/25" : ""}`}
                    >
                      <td className="px-4 py-5 align-middle">
                        <button type="button" onClick={() => openOrder(order.id)} className="text-left">
                          <div className="flex items-center gap-2">
                            {highlightRow ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-700 shadow-[0_0_0_0_rgba(127,29,29,0.9)] animate-pulse" /> : null}
                            <p className="max-w-[120px] break-words font-mono text-xs font-black text-foreground">{shortOrderNumber(order.orderNumber ?? order.id)}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"}</p>
                        </button>
                      </td>
                      <td className="px-4 py-5 align-middle">
                        <p className="font-bold">{order.customerName ?? "-"}</p>
                        <p className="text-sm text-muted-foreground">{order.userEmail ?? "-"}</p>
                      </td>
                      <td className="px-4 py-5 align-middle">
                        <p className="font-bold">{items.length || 0} item(s)</p>
                        <p className="mt-1 max-w-[190px] truncate text-sm text-muted-foreground">{firstItem ? itemTitle(firstItem, 0) : "No items"}</p>
                      </td>
                      <td className="px-4 py-5 align-middle">
                        <p className="font-black text-primary">{formatCurrency(order.totalUsd)}</p>
                        {order.paymentCurrency === "ETB" && order.totalEtb ? <p className="mt-1 text-xs text-muted-foreground">{Number(order.totalEtb).toLocaleString()} ETB</p> : null}
                      </td>
                      <td className="px-4 py-5 align-middle">
                        <p className="flex items-center gap-1.5 font-bold">
                          {isPickup ? <MapPin className="h-4 w-4 text-cyan-500" /> : <Package className="h-4 w-4 text-primary" />}
                          {isPickup ? "Pickup" : "Ethiopian Mail Service"}
                        </p>
                        <p className="mt-1 max-w-[160px] truncate text-sm text-muted-foreground">
                          {isPickup ? order.pickupLocation ?? order.pickupPersonPhone ?? "-" : order.shippingAddress?.country ?? order.shippingAddress?.city ?? "-"}
                        </p>
                      </td>
                      <td className="px-4 py-5 align-middle">
                        <select
                          value={order.status ?? "pending"}
                          disabled={busyKey !== null}
                          onChange={(event) => void updateOrder(order.id, { status: event.target.value })}
                          className={`h-9 min-w-[190px] rounded-full border px-4 text-sm font-bold capitalize outline-none ${STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending}`}
                        >
                          {ORDER_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-5 align-middle">
                        <select
                          value={order.paymentStatus ?? "pending"}
                          disabled={busyKey !== null}
                          onChange={(event) => void updateOrder(order.id, { paymentStatus: event.target.value })}
                          className={`h-9 min-w-[170px] rounded-full border px-4 text-sm font-bold capitalize outline-none ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] ?? PAYMENT_STYLES.pending}`}
                        >
                          {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-5 align-middle">
                        <button type="button" onClick={() => openOrder(order.id)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground transition hover:bg-primary/90" aria-label="Open order details">
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder ? (
        <OrderDetailDrawer
          order={selectedOrder}
          busy={busyKey !== null}
          onClose={() => setSelectedOrderId(null)}
          onStatusChange={(status) => void updateOrder(selectedOrder.id, { status })}
          onPaymentChange={(paymentStatus) => void updateOrder(selectedOrder.id, { paymentStatus })}
        />
      ) : null}
    </div>
  );
}

function OrderDetailDrawer({
  order,
  busy,
  onClose,
  onStatusChange,
  onPaymentChange,
}: {
  order: Order;
  busy: boolean;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onPaymentChange: (paymentStatus: string) => void;
}) {
  const items = order.items ?? [];
  const shipping = order.shippingAddress ?? {};
  const isPickup = order.fulfillmentType === "pickup";

  return (
    <div className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close order details" />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-4xl flex-col bg-background text-foreground shadow-2xl md:w-[55vw]">
        <header className="flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-6">
          <div>
            <p className="text-sm tracking-[0.18em] text-muted-foreground">Order</p>
            <h2 className="mt-2 text-3xl font-black text-primary">#{shortOrderNumber(order.orderNumber ?? order.id)}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-4 py-2 text-sm font-black capitalize ${STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending}`}>{prettyLabel(order.status)}</span>
            <span className={`rounded-full px-4 py-2 text-sm font-black capitalize ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] ?? PAYMENT_STYLES.pending}`}>{prettyLabel(order.paymentStatus)}</span>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground" aria-label="Close">
              <X className="h-6 w-6" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Order Status</span>
              <select disabled={busy} value={order.status ?? "pending"} onChange={(event) => onStatusChange(event.target.value)} className={`h-12 w-full rounded-xl border px-4 text-base font-bold capitalize outline-none ${STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending}`}>
                {ORDER_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Payment Status</span>
              <select disabled={busy} value={order.paymentStatus ?? "pending"} onChange={(event) => onPaymentChange(event.target.value)} className={`h-12 w-full rounded-xl border px-4 text-base font-bold capitalize outline-none ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] ?? PAYMENT_STYLES.pending}`}>
                {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
              </select>
            </label>
          </div>

          <DarkSection icon={UserRound} title="Customer Information">
            <DetailRow label="Full Name" value={order.customerName ?? "-"} />
            <DetailRow label="Email" value={order.userEmail ?? "-"} />
            <DetailRow label="Order Date" value={formatDate(order.createdAt)} />
            <DetailRow label="Order Number" value={`#${shortOrderNumber(order.orderNumber ?? order.id)}`} highlight />
          </DarkSection>

          <DarkSection icon={CreditCard} title="Payment Details">
            <DetailRow label="Payment Method" value={order.paymentMethod === "etb_bank_transfer" ? "ETB Bank Transfer" : order.paymentMethod ?? "Stripe"} />
            <DetailRow label="Total (USD)" value={formatCurrency(order.totalUsd)} highlight />
            {order.totalEtb ? <DetailRow label="Total (ETB)" value={`${Number(order.totalEtb).toLocaleString()} ETB`} /> : null}
            <DetailRow label="Payment Status" value={prettyLabel(order.paymentStatus)} />
            {order.paymentProofUrl ? (
              <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                <ExternalLink className="h-4 w-4" />
                View ETB Payment Proof Screenshot
              </a>
            ) : null}
          </DarkSection>

          <DarkSection icon={Truck} title={isPickup ? "Pickup Details" : "Shipping Details"}>
            <DetailRow label="Fulfillment Type" value={isPickup ? "Pickup" : "Mail / EMS Shipping"} />
            {isPickup ? (
              <>
                <DetailRow label="Location" value={order.pickupLocation ?? "-"} />
                <DetailRow label="Pickup Person" value={order.pickupPersonName ?? "-"} />
                <DetailRow label="Phone" value={order.pickupPersonPhone ?? "-"} />
              </>
            ) : (
              <>
                <DetailRow label="Carrier" value={order.carrier ?? "Ethiopian Mail Service"} />
                <DetailRow label="Street" value={shipping.street ?? "-"} />
                <DetailRow label="City / State" value={[shipping.city, shipping.state].filter(Boolean).join(", ") || "-"} />
                <DetailRow label="ZIP / Country" value={[shipping.postalCode ?? shipping.zip, shipping.country].filter(Boolean).join(" ") || "-"} />
                <DetailRow label="Phone" value={shipping.phone ?? "-"} />
              </>
            )}
          </DarkSection>

          <DarkSection icon={FileCheck} title="Documents & Proof">
            <p className="mb-2 text-sm font-bold text-muted-foreground">Shipping Documents</p>
            {(order.shippingDocuments ?? []).length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {(order.shippingDocuments ?? []).map((doc, index) => (
                  <a key={`${doc.url}-${index}`} href={doc.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary hover:underline">
                    {doc.label ?? `Document ${index + 1}`}
                  </a>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-muted-foreground">No shipping documents uploaded yet</p>
            )}
            {order.paymentProofUrl ? (
              <>
                <p className="text-sm font-bold text-muted-foreground">ETB Payment Proof</p>
                <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                  <ExternalLink className="h-4 w-4" />
                  View Payment Screenshot
                  {order.paymentProofUploadedAt ? <span className="text-muted-foreground">· {new Date(order.paymentProofUploadedAt).toLocaleDateString()}</span> : null}
                </a>
              </>
            ) : null}
          </DarkSection>

          <DarkSection icon={Ruler} title="Items & Measurements">
            {items.length === 0 ? (
              <p className="text-muted-foreground">No items found.</p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={`${item.productId ?? item.id ?? index}`} className="overflow-hidden rounded-xl border border-border bg-background">
                    <div className="flex items-center gap-4 border-b border-border p-4">
                      {itemImage(item) ? <img src={itemImage(item) ?? ""} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-secondary"><Package className="h-6 w-6" /></div>}
                      <div>
                        <p className="text-lg font-black">{itemTitle(item, index)}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity ?? 1} · {formatCurrency(item.priceUsd ?? item.price ?? 0)}</p>
                      </div>
                    </div>
                    {measurementRows(item).length > 0 ? (
                      <div className="grid gap-x-8 gap-y-2 p-4 sm:grid-cols-2">
                        {measurementRows(item).map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-4 text-sm">
                            <span className="text-muted-foreground">{MEASUREMENT_LABELS[key] ?? prettyLabel(key)}</span>
                            <span className="font-black">{value}&quot;</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-4 text-sm text-muted-foreground">No measurements recorded for this item.</p>
                    )}
                  </div>
                ))}
                <div className="flex justify-between border-t border-border pt-4 text-lg font-black">
                  <span>Order Total</span>
                  <span className="text-primary">{formatCurrency(order.totalUsd)}</span>
                </div>
              </div>
            )}
          </DarkSection>

          <div className="grid gap-3 pb-8 sm:grid-cols-2">
            <WorkflowButton label="Tailoring" icon={Package} onClick={() => onStatusChange("tailoring")} />
            <WorkflowButton label="Quality Check" icon={ClipboardCheck} onClick={() => onStatusChange("quality_check")} />
            <WorkflowButton label="Shipped" icon={Truck} onClick={() => onStatusChange("shipped")} />
            <WorkflowButton label="Delivered" icon={CheckCircle2} active={order.status === "delivered"} onClick={() => onStatusChange("delivered")} />
          </div>
        </div>
      </aside>
    </div>
  );
}

function DarkSection({ icon: Icon, title, children }: { icon: typeof UserRound; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="flex items-center gap-3 text-xl font-black">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </h3>
      <div className="mt-4 border-t border-border pt-4">{children}</div>
    </section>
  );
}

function DetailRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-6 py-2 text-base">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function WorkflowButton({ icon: Icon, label, active = false, onClick }: { icon: typeof Package; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "rounded-xl border border-green-600 bg-green-600/10 px-4 py-3 font-black text-green-700" : "rounded-xl border border-border bg-card px-4 py-3 font-black text-foreground transition hover:bg-secondary"}
    >
      <Icon className="mr-2 inline h-5 w-5" />
      → {label}{active ? " ✓" : ""}
    </button>
  );
}
