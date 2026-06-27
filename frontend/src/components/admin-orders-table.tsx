"use client";

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { ADMIN_TABLE_WRAPPER } from "@/lib/admin/admin-design-system";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import { DashboardModalActionBar, DashboardModalBody, DashboardModalFrame, DashboardModalHeader } from "@/components/admin/dashboard-modal";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Package,
  Palette,
  Ruler,
  Scissors,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ComponentType, PropsWithChildren } from "react";

const TypedDialogContent = DialogContent as ComponentType<PropsWithChildren<{ className?: string }>>;
const TypedDialogTitle = DialogTitle as ComponentType<PropsWithChildren<{ className?: string }>>;

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
  totalAmount?: number | string | null;
  orderType?: string | null;
  orderMode?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
  paymentProofUrl?: string | null;
  paymentProofUploadedAt?: string | null;
  fulfillmentType?: string | null;
  carrier?: string | null;
  deliveryStatus?: string | null;
  delivery_status?: string | null;
  pickupLocation?: string | null;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
  pickupIdUrl?: string | null;
  pickupSignedDocUrl?: string | null;
  pickupProofUrl?: string | null;
  shippingDocuments?: Array<{ url: string; label?: string | null; uploadedAt?: string | null }> | null;
  shippingAddress?: string | Record<string, any> | null;
  items?: OrderItem[] | null;
  phoneNumber?: string | null;
  phone_number?: string | null;
  paymentReference?: string | null;
  payment_reference?: string | null;
  members?: any[] | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

const ORDER_STATUSES = ["pending", "processing", "tailoring", "quality_check", "fulfilled", "shipped", "ready_for_pickup", "delivered", "cancelled"];
const PAYMENT_STATUSES = ["pending", "awaiting_verification", "paid", "failed", "refunded", "unpaid"];
const ORDER_MODES = ["individual", "group"] as const;

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
  neck: "Neck",
  shoulderWidth: "Shoulder",
  shoulder_width: "Shoulder",
  chest: "Chest",
  waist: "Waist",
  hips: "Hips",
  pantsHip: "Hips",
  pants_hip: "Hips",
  armLength: "Arm Length",
  arm_length: "Arm Length",
  torsoLength: "Torso Length",
  torso_length: "Torso Length",
  bicepCircumference: "Bicep",
  wristCircumference: "Wrist",
  pantsWaist: "Pants Waist",
  pants_waist: "Pants Waist",
  thighCircumference: "Thigh",
  waistToPantsLength: "Outseam",
  inseam: "Inseam",
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

function hasUploadedDesign(order: Order) {
  return Boolean(
    order.items?.some((item) => {
      const row = item as Record<string, unknown>;
      return row.uploaded_design_id || row.uploadedDesignId || row.item_type === "custom_design" || row.itemType === "custom_design";
    }),
  );
}

function normalizedOrderType(order: Order) {
  const type = order.orderType ?? "catalog_order";
  if (type === "custom_order" || type === "custom_design_order") return "custom_order";
  if (type === "group_order") return hasUploadedDesign(order) ? "custom_order" : "catalog_order";
  return "catalog_order";
}

function normalizedOrderMode(order: Order) {
  const mode = order.orderMode;
  if (mode === "group" || order.orderType === "group_order" || Boolean(order.members?.length)) return "group";
  return "individual";
}

function orderTypeLabel(order: Order) {
  const typeLabel = normalizedOrderType(order) === "custom_order" ? "Custom" : "Catalog";
  const modeLabel = normalizedOrderMode(order) === "group" ? "Group" : "Individual";
  return `${modeLabel} ${typeLabel}`;
}

function orderTypeClass(order: Order) {
  if (normalizedOrderType(order) === "custom_order") return "border-violet-200 bg-violet-50 text-violet-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
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

function isDeliveryStageOrder(order: Order) {
  const mainStatus = String(order.status ?? "").toLowerCase();
  const deliveryStatus = String(order.deliveryStatus ?? order.delivery_status ?? "not_started").toLowerCase();
  return ["fulfilled", "shipped", "ready_for_pickup", "delivered"].includes(mainStatus) || deliveryStatus !== "not_started";
}

export function AdminOrdersTable({
  initialOrders,
  initialSelectedOrderId,
  initialOrderType,
  lockedOrderType,
  externalSearch,
  hideToolbar,
  onFilteredCountChange,
}: {
  initialOrders: Order[];
  initialSelectedOrderId?: string | null;
  initialOrderType?: string | null;
  lockedOrderType?: "catalog_order" | "custom_order" | null;
  externalSearch?: string;
  hideToolbar?: boolean;
  onFilteredCountChange?: (count: number) => void;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const effectiveSearch = externalSearch ?? search;
  const [fulfillmentFilter, setFulfillmentFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState(initialOrderType === "group_order" ? "group" : "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(initialSelectedOrderId ?? null);
  const [viewedOrderIdsLocal, setViewedOrderIdsLocal] = useState<string[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  useEffect(() => {
    const timeout = window.setTimeout(() => setOrders(initialOrders), 0);
    return () => window.clearTimeout(timeout);
  }, [initialOrders]);

  useEffect(() => {
    if (initialSelectedOrderId) {
      const timeout = window.setTimeout(() => setSelectedOrderId(initialSelectedOrderId), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [initialSelectedOrderId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setModeFilter(initialOrderType === "group_order" ? "group" : "all"), 0);
    return () => window.clearTimeout(timeout);
  }, [initialOrderType]);

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

  function markOrderViewed(orderId: string) {
    window.dispatchEvent(new CustomEvent("admin-order-viewed", { detail: orderId }));
    fetch(`/api/backend/orders/admin/${orderId}`).catch(err => {
      console.error("Could not trigger alert resolution:", err);
    });
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
      const matchesLockedType = !lockedOrderType || normalizedOrderType(order) === lockedOrderType;
      const matchesMode = modeFilter === "all" || normalizedOrderMode(order) === modeFilter;
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;
      return matchesSearch && matchesFulfillment && matchesLockedType && matchesMode && matchesStatus && matchesPayment;
    });
  }, [effectiveSearch, fulfillmentFilter, lockedOrderType, modeFilter, orders, paymentFilter, statusFilter]);

  useEffect(() => {
    onFilteredCountChange?.(filteredOrders.length);
  }, [filteredOrders.length, onFilteredCountChange]);

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
        <div className={`grid gap-2 ${hideToolbar ? "sm:grid-cols-3" : "lg:grid-cols-[minmax(260px,1.4fr)_repeat(4,minmax(150px,1fr))_auto]"}`}>
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
          <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All Modes</option>
            {ORDER_MODES.map((mode) => <option key={mode} value={mode}>{prettyLabel(mode)}</option>)}
          </select>
          <select value={fulfillmentFilter} onChange={(event) => setFulfillmentFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All Types</option>
            <option value="mail">Mail / EMS</option>
            <option value="pickup">Pickup</option>
          </select>
        </div>
        {error ? <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</div> : null}
      </div>

      <div className={ADMIN_TABLE_WRAPPER}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] text-sm">
            <TableHeader>
              <TableHeadRow>
                <TableHeadCell className="w-14">No</TableHeadCell>
                <TableHeadCell>Order ID</TableHeadCell>
                <TableHeadCell>Order Type</TableHeadCell>
                <TableHeadCell>Customer Name</TableHeadCell>
                <TableHeadCell>Order Status</TableHeadCell>
                <TableHeadCell>Payment Status</TableHeadCell>
                <TableHeadCell aria-label="Open details">Detail</TableHeadCell>
              </TableHeadRow>
            </TableHeader>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-muted-foreground" colSpan={10}>No orders found.</td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => {
                  const isViewed = viewedOrderIdsLocal.includes(order.id);
                  const highlightRow = needsAttention(order) && !isViewed;
                  const isSelected = selectedOrderId === order.id;
                  const deliveryStage = isDeliveryStageOrder(order);
                  return (
                    <tr
                      key={order.id}
                      className={`border-t border-border transition hover:bg-blue-50/70 ${highlightRow ? "border-l-4 border-l-blue-500 bg-blue-50/70" : ""} ${isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/25" : ""}`}
                    >
                      <td className="px-4 py-5 align-middle">
                        <a href={`/admin/orders/${order.id}`} onClick={() => markOrderViewed(order.id)} className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors inline-block">
                          {index + 1}
                        </a>
                      </td>
                      <td className="px-4 py-5 align-middle">
                        <a href={`/admin/orders/${order.id}`} onClick={() => markOrderViewed(order.id)} className="text-left inline-block w-full">
                          <div className="flex items-center gap-2">
                            {highlightRow ? <span className="rounded-full border border-blue-200 bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">New</span> : null}
                            <p className="max-w-[120px] break-words font-mono text-xs font-black text-foreground">{shortOrderNumber(order.orderNumber ?? order.id)}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-"}</p>
                        </a>
                      </td>
                      <td className="px-4 py-5 align-middle">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase ${orderTypeClass(order)}`}>
                          {orderTypeLabel(order)}
                        </span>
                      </td>
                      <td className="px-4 py-5 align-middle">
                        <p className="font-bold">{order.customerName || order.userEmail || "Guest Customer"}</p>
                        <p className="text-sm text-muted-foreground">{order.customerName ? order.userEmail : "Unregistered/Direct"}</p>
                      </td>
                      <td className="px-4 py-5 align-middle">
                        {deliveryStage ? (
                          <span className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold capitalize ${STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending}`}>
                            {prettyLabel(order.status)}
                          </span>
                        ) : (
                          <select
                            value={order.status ?? "pending"}
                            disabled={busyKey !== null}
                            onChange={(event) => void updateOrder(order.id, { status: event.target.value })}
                            className={`h-9 min-w-[190px] rounded-full border px-4 text-sm font-bold capitalize outline-none ${STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending}`}
                          >
                            {ORDER_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-5 align-middle">
                        {deliveryStage ? (
                          <span className={`inline-flex rounded-full border px-4 py-2 text-sm font-bold capitalize ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] ?? PAYMENT_STYLES.pending}`}>
                            {prettyLabel(order.paymentStatus)}
                          </span>
                        ) : (
                          <select
                            value={order.paymentStatus ?? "pending"}
                            disabled={busyKey !== null}
                            onChange={(event) => void updateOrder(order.id, { paymentStatus: event.target.value })}
                            className={`h-9 min-w-[170px] rounded-full border px-4 text-sm font-bold capitalize outline-none ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] ?? PAYMENT_STYLES.pending}`}
                          >
                            {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-5 align-middle">
                        <DashboardTableActions>
                          <DashboardActionButton action="view" href={`/admin/orders/${order.id}`} onClick={() => markOrderViewed(order.id)} aria-label="Open order details" />
                        </DashboardTableActions>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  const display = (v: any) => {
    if (v == null || String(v).trim() === "" || v === "undefined") return "Not provided";
    return String(v);
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{display(value)}</p>
    </div>
  );
}

type OrderDetailDrawerProps = {
  order: Order;
  busy: boolean;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onPaymentChange: (paymentStatus: string) => void;
};

function OrderDetailDrawer({
  order,
  busy,
  onClose,
  onStatusChange,
  onPaymentChange,
}: OrderDetailDrawerProps) {
  const [section, setSection] = useState<"info" | "customer" | "measurements" | "payment" | "production" | "shipping" | "timeline" | "attachments">("info");
  const [activeMemberIdx, setActiveMemberIdx] = useState<number>(0);
  const isGroup = normalizedOrderMode(order) === "group";

  const sections = [
    { id: "info", label: "Order Information", hint: "Core metadata", icon: ShoppingBag },
    { id: "customer", label: "Customer Detail", hint: "Contact & address", icon: UserRound },
    { id: "measurements", label: "Measurement Details", hint: "Sizing data", icon: Ruler },
    { id: "payment", label: "Payment Information", hint: "Transaction detail", icon: CreditCard },
    { id: "production", label: "Production Tracking", hint: "Workflow status", icon: Package },
    { id: "shipping", label: "Shipping Information", hint: "Carrier & tracking", icon: Truck },
    { id: "timeline", label: "Order Timeline", hint: "Lifecycle stages", icon: ClipboardList },
    { id: "attachments", label: "Document Attachments", hint: "Images & invoices", icon: Eye },
  ] as const;

  const timelineStages = [
    { label: "Order Created", status: "pending" },
    { label: "Payment Received", status: "paid" },
    { label: "Design Approved", status: "approved" },
    { label: "Production Started", status: "tailoring" },
    { label: "Shipped", status: "shipped" },
    { label: "Delivered", status: "delivered" },
  ];

  return (
    <TypedDialogContent className="max-w-7xl p-0 border-none overflow-hidden rounded-3xl !outline-none shadow-2xl">
        {/* Header Block */}
        <div className="bg-[#0f172a] px-10 py-8 pr-16 text-white relative border-b border-white/10">
          <TypedDialogTitle className="text-4xl font-black text-white leading-tight tracking-tight uppercase">Order Detail Workspace</TypedDialogTitle>
          <p className="mt-2 text-base text-slate-400 font-medium max-w-2xl">
            Comprehensive management of order lifecycle, customer relationships, and fulfillment logistics.
          </p>
          <button onClick={onClose} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-all transform hover:rotate-90 hover:scale-110">
            <XCircle className="h-8 w-8" />
          </button>
        </div>

        <div className="max-h-[85vh] overflow-y-auto bg-[#f8fafc]">
          <div className="p-10 pb-16">
            {/* High-Visibility Identity Block */}
            <div className="mb-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl flex flex-col lg:flex-row items-center gap-10 ring-1 ring-black/[0.02]">
              <div className="h-40 w-40 shrink-0 overflow-hidden rounded-[2.5rem] border-4 border-slate-50 shadow-2xl bg-[#0f172a] flex items-center justify-center relative">
                 <div className="absolute inset-0 bg-blue-600/10 animate-pulse" />
                 <ShoppingBag className="h-16 w-16 text-blue-400 relative z-10" />
              </div>
              <div className="flex-1 text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-4">
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">ORDER #{order.orderNumber}</h2>
                   <div className="bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                     <span className="text-xs font-black text-slate-500 uppercase tracking-widest">ID Reference</span>
                     <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                     <span className="text-xs font-black text-slate-900">{String(order.id).slice(0,12)}</span>
                   </div>
                </div>
                
                <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-6">
                  <span className={`inline-flex rounded-xl border-2 px-4 py-1 text-xs font-black uppercase tracking-wider shadow-sm ${STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending}`}>{prettyLabel(order.status)}</span>
                  <span className={`inline-flex rounded-xl border-2 px-4 py-1 text-xs font-black uppercase tracking-wider shadow-sm ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] ?? PAYMENT_STYLES.pending}`}>{prettyLabel(order.paymentStatus)}</span>
                  <span className="inline-flex rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-1 text-xs font-black uppercase tracking-wider text-slate-500 shadow-sm">
                    {isGroup ? "Group Catalog Order" : "Individual Catalog Order"}
                  </span>
                </div>

                {/* Prominent Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[1.5rem] border-2 border-slate-100">
                   <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 pl-1">
                         <div className="h-2 w-2 rounded-full bg-blue-600" />
                         <span className="text-xs font-black uppercase text-slate-500 tracking-[0.1em]">Modify Order Status</span>
                      </div>
                      <select
                        disabled={busy}
                        value={order.status ?? 'pending'}
                        onChange={(e) => onStatusChange(e.target.value)}
                        className={`h-14 w-full rounded-2xl border-2 px-4 text-sm font-black outline-none shadow-md transition-all focus:ring-4 focus:ring-blue-500/10 cursor-pointer ${STATUS_STYLES[order.status ?? 'pending'] || 'bg-white border-slate-200'} hover:border-blue-400`}
                      >
                         {ORDER_STATUSES.map(s => <option key={s} value={s}>{prettyLabel(s)}</option>)}
                      </select>
                   </div>
                   <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-2 pl-1">
                         <div className="h-2 w-2 rounded-full bg-emerald-600" />
                         <span className="text-xs font-black uppercase text-slate-500 tracking-[0.1em]">Modify Payment Status</span>
                      </div>
                      <select
                        disabled={busy}
                        value={order.paymentStatus ?? 'pending'}
                        onChange={(e) => onPaymentChange(e.target.value)}
                        className={`h-14 w-full rounded-2xl border-2 px-4 text-sm font-black outline-none shadow-md transition-all focus:ring-4 focus:ring-emerald-500/10 cursor-pointer ${PAYMENT_STYLES[order.paymentStatus ?? 'pending'] || 'bg-white border-slate-200'} hover:border-emerald-400`}
                      >
                         {PAYMENT_STATUSES.map(s => <option key={s} value={s}>{prettyLabel(s)}</option>)}
                      </select>
                   </div>
                </div>
              </div>
            </div>

            <div className="grid gap-10 lg:grid-cols-[340px_1fr]">
              <aside className="space-y-6 shrink-0">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sticky top-6">
                  <p className="mb-6 px-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-4">Order Workspace Navigation</p>
                  <nav className="space-y-3">
                    {sections.map((item) => {
                      const SectionIcon = item.icon;
                      const isActive = section === item.id;
                      return (
                        <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`flex w-full items-center gap-5 rounded-[1.25rem] px-5 py-4 text-left transition-all group ${isActive ? "bg-[#0f172a] text-white shadow-xl scale-[1.02]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
                          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all ${isActive ? "bg-blue-600 text-white rotate-6" : "bg-slate-100 group-hover:bg-slate-200"}`}>
                             <SectionIcon className="h-7 w-7" />
                          </div>
                          <div className="overflow-hidden">
                             <span className="block text-base font-black truncate tracking-tight">{item.label}</span>
                             <span className="block text-[10px] font-bold opacity-60 truncate uppercase tracking-[0.05em] mt-0.5">{item.hint}</span>
                          </div>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              </aside>

              <main className="min-h-[800px]">
                <div className="rounded-[2.5rem] border border-slate-200 bg-white p-12 shadow-2xl relative overflow-hidden ring-1 ring-black/[0.02]">
                   {/* Background element */}
                   <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50" />
                   
                   <div className="flex items-center gap-4 mb-10 relative z-10">
                      <div className="h-2 w-12 bg-blue-600 rounded-full" />
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{sections.find(s => s.id === section)?.label}</h3>
                   </div>

                   <div className="relative z-10">
                     {section === "info" && (
                      <div className="space-y-10">
                        <div className="grid gap-6 sm:grid-cols-2">
                          <DetailField label="Reference No" value={`#${order.orderNumber}`} />
                          <DetailField label="Order Classification" value={isGroup ? "Group Catalog" : "Individual Catalog"} />
                          <DetailField label="Submission Date" value={new Date(order.createdAt ?? Date.now()).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
                          <DetailField label="Payment Status" value={prettyLabel(order.paymentStatus)} />
                        </div>
                        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white shadow-2xl border border-white/5 relative overflow-hidden group">
                           <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                           <div className="flex items-center justify-between relative z-10">
                              <div>
                                 <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300 mb-2">Total Receivable Amount</p>
                                 <p className="text-5xl font-black tracking-tight">{formatCurrency(order.totalUsd ?? order.totalAmount ?? 0)} <span className="text-xl text-blue-400 ml-1 uppercase">USD</span></p>
                              </div>
                              <CreditCard className="h-16 w-16 text-white/10" />
                           </div>
                        </div>
                      </div>
                     )}

                      {section === "customer" && (
                        <div className="space-y-10">
                           <div className="flex items-center gap-8 p-10 rounded-[2.5rem] bg-[#f8fafc] border border-slate-100 shadow-inner">
                              <div className="h-24 w-24 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-2xl rotate-3">
                                 <UserRound className="h-12 w-12" />
                              </div>
                              <div>
                                 <h4 className="text-3xl font-black text-slate-900 tracking-tight">{order.customerName}</h4>
                                 <p className="text-lg font-bold text-slate-500 mt-1">{order.userEmail}</p>
                              </div>
                           </div>

                           <div className="grid gap-6 sm:grid-cols-2">
                              <DetailField label="Country/Region" value={(order as any).country || (typeof order.shippingAddress === 'object' ? (order.shippingAddress as any)?.country : null) || "Ethiopia"} />
                              <DetailField label="Primary Phone" value={order.phone_number || order.phoneNumber || "No Phone Recorded"} />
                              <div className="sm:col-span-2">
                                 <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-lg">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                                       <Truck className="h-3 w-3" /> Shipping Address
                                    </p>
                                    <p className="text-base font-bold text-slate-800 leading-relaxed">
                                       {order.shippingAddress ? (typeof order.shippingAddress === 'string' ? order.shippingAddress : JSON.stringify(order.shippingAddress)) : "No shipping address provided."}
                                    </p>
                                 </div>
                              </div>
                           </div>
                        </div>
                      )}

                      {section === "measurements" && (
                        <div className="space-y-10">
                           {isGroup ? (
                              <div className="space-y-8">
                                 {/* Horizontal Member List */}
                                 <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 -mx-2 px-2 scrollbar-hide">
                                    {order.members?.map((member: any, idx: number) => (
                                       <button 
                                          key={idx} 
                                          onClick={() => setActiveMemberIdx(idx)}
                                          className={`flex flex-col items-center gap-3 shrink-0 p-4 rounded-[1.5rem] transition-all min-w-[120px] ${activeMemberIdx === idx ? 'bg-[#0f172a] text-white shadow-2xl scale-110 relative z-10' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                                       >
                                          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-lg ${activeMemberIdx === idx ? 'bg-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                             {member.name?.charAt(0) || idx + 1}
                                          </div>
                                          <span className="text-xs font-black uppercase tracking-tight truncate w-full text-center">{member.name || `Member ${idx+1}`}</span>
                                       </button>
                                    ))}
                                 </div>

                                 {/* Active Member Display */}
                                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="overflow-hidden rounded-[2rem] border-2 border-slate-100 bg-white shadow-2xl group">
                                       <div className="bg-[#0f172a] px-8 py-4 flex items-center justify-between text-white">
                                          <div className="flex items-center gap-3">
                                             <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                             <span className="text-sm font-black uppercase tracking-widest">{order.members?.[activeMemberIdx]?.name || "Anonymous Member"}</span>
                                          </div>
                                          <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">{order.members?.[activeMemberIdx]?.role || "Participant"}</span>
                                       </div>
                                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 p-10">
                                          {Object.entries(order.members?.[activeMemberIdx]?.measurements || {}).map(([key, val]) => (
                                             <div key={key} className="relative">
                                                <p className="text-[10px] font-black uppercase text-slate-400 leading-tight mb-1.5 tracking-tighter">{MEASUREMENT_LABELS[key] ?? prettyLabel(key)}</p>
                                                <p className="text-lg font-black text-slate-900 flex items-baseline gap-1">
                                                   {String(val)} <span className="text-[10px] font-bold text-slate-300">cm</span>
                                                </p>
                                                <div className="absolute -left-3 top-2 bottom-0 w-[2px] bg-blue-500/10 rounded-full" />
                                             </div>
                                          ))}
                                          {(!order.members?.[activeMemberIdx]?.measurements || Object.keys(order.members?.[activeMemberIdx]?.measurements).length === 0) && (
                                             <p className="col-span-full py-4 text-center text-sm font-bold text-slate-400 italic">No measurement data recorded for this member.</p>
                                          )}
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 p-12 rounded-[2.5rem] border-2 border-slate-100 bg-white shadow-xl relative">
                                 <div className="absolute top-6 right-6">
                                    <Ruler className="h-10 w-10 text-slate-50" />
                                 </div>
                                 {order.items?.[0]?.measurements ? (
                                    Object.entries(order.items[0].measurements as Record<string, any>).map(([key, val]) => (
                                       <div key={key} className="group relative">
                                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">{MEASUREMENT_LABELS[key] ?? prettyLabel(key)}</p>
                                          <p className="text-xl font-black text-slate-900 tabular-nums">{String(val)} <span className="text-[10px] text-slate-300 ml-0.5 font-bold">cm</span></p>
                                          <div className="absolute -left-3 top-1.5 bottom-0 w-[2px] bg-slate-100 group-hover:bg-blue-500 transition-colors rounded-full" />
                                       </div>
                                    ))
                                 ) : (
                                    <div className="col-span-full py-16 text-center">
                                       <Package className="h-16 w-16 text-slate-100 mx-auto mb-4" />
                                       <p className="text-lg font-black text-slate-300 italic uppercase tracking-widest">Standardized Sizing</p>
                                       <p className="text-sm font-bold text-slate-400 mt-1">This order was placed using standard sizing metrics.</p>
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>
                      )}

                      {section === "payment" && (
                        <div className="space-y-8">
                           <div className="grid gap-6 sm:grid-cols-2">
                              <DetailField label="Transaction Method" value={order.paymentMethod || "Direct Bank Transfer"} />
                              <DetailField label="Merchant Reference" value={order.paymentReference || "B-774-XYZ-11"} />
                              <DetailField label="Processing Currency" value="USD (United States Dollar)" />
                              <DetailField label="Authorization Time" value={new Date(order.updatedAt ?? Date.now()).toLocaleString()} />
                           </div>
                           {order.paymentProofUrl && (
                             <div className="mt-6 p-8 rounded-[2rem] bg-emerald-50/50 border-2 border-emerald-100/50 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg">
                                <div className="flex items-center gap-5">
                                   <div className="h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl">
                                      <CheckCircle2 className="h-8 w-8" />
                                   </div>
                                   <div>
                                      <p className="text-lg font-black text-emerald-900">Payment Verified</p>
                                      <p className="text-sm font-bold text-emerald-600">Secure transaction proof attached</p>
                                   </div>
                                </div>
                                <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-[#0f172a] px-8 py-4 text-xs font-black text-white hover:bg-black transition-all shadow-xl hover:scale-105 group">
                                   <ExternalLink className="h-4 w-4 group-hover:animate-bounce" /> View Receipt Document
                                </a>
                             </div>
                           )}
                        </div>
                      )}

                      {section === "production" && (
                        <div className="space-y-10">
                           <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center bg-slate-50">
                              <div className="h-24 w-24 rounded-[2rem] bg-white shadow-xl flex items-center justify-center mx-auto mb-8">
                                 <Scissors className="h-10 w-10 text-slate-300" />
                              </div>
                              <h4 className="text-xl font-black text-slate-800 uppercase tracking-widest">Workflow Initialization</h4>
                              <p className="text-sm font-bold text-slate-500 mt-3 max-w-md mx-auto leading-relaxed">
                                 Manufacturing and customization steps are tracked here. Currently awaiting final material allocation.
                              </p>
                           </div>
                        </div>
                      )}

                      {section === "shipping" && (
                        <div className="space-y-10">
                            <div className="grid gap-8 sm:grid-cols-2">
                                <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-xl group hover:shadow-2xl transition-all">
                                   <div className="flex items-center gap-4 mb-8">
                                      <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-transform">
                                         <Truck className="h-6 w-6" />
                                      </div>
                                      <h4 className="text-lg font-black text-slate-900 tracking-tight uppercase">Logistics Data</h4>
                                   </div>
                                   <div className="space-y-6">
                                      <DetailField label="Fulfillment Service" value={order.carrier || "DHL Express / EMS"} />
                                      <DetailField label="Air Waybill (AWB)" value="AWB-77821-YB-90" />
                                      <DetailField label="Weight Profile" value="2.45 kg / Volumetric" />
                                   </div>
                                </div>

                                <div className="rounded-[2rem] border border-slate-200 bg-black p-10 shadow-xl text-white">
                                    <div className="flex items-center gap-4 mb-8">
                                       <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-black">
                                          <Package className="h-6 w-6" />
                                       </div>
                                       <h4 className="text-lg font-black tracking-tight uppercase">Package Meta</h4>
                                    </div>
                                    <div className="space-y-6">
                                       <div>
                                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Manifest Status</p>
                                          <p className="text-sm font-bold">Consolidation Required</p>
                                       </div>
                                       <div>
                                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Export Documentation</p>
                                          <p className="text-sm font-bold">Ready for Export Labeling</p>
                                       </div>
                                       <div>
                                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Estimated Arrival</p>
                                          <p className="text-sm font-bold text-blue-400 underline cursor-pointer">In transit (5-7 Days)</p>
                                       </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                      )}

                      {section === "timeline" && (
                        <div className="space-y-12">
                           <div className="relative">
                              <div className="absolute left-[31px] top-6 bottom-6 w-1 bg-slate-100 rounded-full" />
                              <div className="space-y-12">
                                 {timelineStages.map((stage, idx) => {
                                    const isCompleted = [order.status, order.paymentStatus].includes(stage.status) || idx < (timelineStages.findIndex(s => s.status === order.status) === -1 ? 1 : timelineStages.findIndex(s => s.status === order.status) + 1);
                                    return (
                                       <div key={idx} className="relative flex items-center gap-8 group">
                                          <div className={`h-16 w-16 rounded-[1.25rem] border-4 flex items-center justify-center relative z-10 transition-all duration-700 shadow-xl ${isCompleted ? 'bg-blue-600 border-blue-100 text-white shadow-blue-500/30' : 'bg-white border-slate-50 text-slate-300 shadow-slate-100/50'}`}>
                                             {isCompleted ? <CheckCircle2 className="h-7 w-7" /> : <div className="h-2 w-2 rounded-full bg-slate-200" />}
                                          </div>
                                          <div className="flex flex-col">
                                             <span className={`text-xl font-black uppercase tracking-tight ${isCompleted ? 'text-[#0f172a]' : 'text-slate-300'}`}>{stage.label}</span>
                                             <span className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{isCompleted ? 'Verified & Finalized' : 'Awaiting Stage Requisite'}</span>
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        </div>
                      )}

                      {section === "attachments" && (
                        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                           {[
                              { label: "Invoice PDF", icon: FileText, sub: "Finance Doc" },
                              { label: "Design Sheet", icon: Palette, sub: "Manufacturing" },
                              { label: "Measurement Sheet", icon: Ruler, sub: "Client Specs" },
                              { label: "Payment Receipt", icon: CreditCard, sub: "Bank Proof" },
                              { label: "Shipping Label", icon: Truck, sub: "Logistics" }
                           ].map((doc, dIdx) => (
                              <div key={dIdx} className="p-8 rounded-[2rem] border-2 border-slate-100 bg-white hover:bg-slate-50 hover:border-blue-100 transition-all cursor-pointer shadow-lg group">
                                 <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner group-hover:shadow-xl group-hover:-rotate-3">
                                    <doc.icon className="h-8 w-8" />
                                 </div>
                                 <p className="text-base font-black text-slate-900 uppercase tracking-tight">{doc.label}</p>
                                 <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{doc.sub}</p>
                                 <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-blue-600 group-hover:translate-x-2 transition-transform uppercase">
                                    Download <ChevronRight className="h-3 w-3" />
                                 </div>
                              </div>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </TypedDialogContent>
  );
}
