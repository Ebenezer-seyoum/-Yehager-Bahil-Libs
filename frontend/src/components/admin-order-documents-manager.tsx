"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, CreditCard, FileCheck, FileSignature, FileText, MapPin, Package, Truck, User } from "lucide-react";
import { AdminOrderDocuments } from "@/components/admin-order-documents";

type ShippingDocument = { url: string; label: string; uploadedAt?: string };

type OrderItem = {
  productName?: string | null;
  product_name?: string | null;
  priceUsd?: number | string | null;
  price?: number | string | null;
  familyMemberName?: string | null;
  family_member_name?: string | null;
};

type Order = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  totalUsd?: number | string | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
  paymentProofUrl?: string | null;
  fulfillmentType?: string | null;
  carrier?: string | null;
  shippingAddress?: { street?: string | null; city?: string | null; country?: string | null } | null;
  pickupLocation?: string | null;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
  pickupIdUrl?: string | null;
  pickupSignedDocUrl?: string | null;
  pickupProofUrl?: string | null;
  shippingDocuments?: ShippingDocument[] | null;
  items?: OrderItem[] | null;
};

const FULFILLMENT_STYLES: Record<string, string> = {
  pickup: "bg-purple-100 text-purple-800",
  mail: "bg-blue-100 text-blue-700",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  tailoring: "bg-amber-100 text-amber-800",
  quality_check: "bg-purple-100 text-purple-800",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-800",
  ready_for_pickup: "bg-orange-100 text-orange-800",
  picked_up: "bg-green-200 text-green-900",
  cancelled: "bg-red-100 text-red-700",
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  awaiting_verification: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-700",
  unpaid: "bg-orange-100 text-orange-800",
};

function formatCurrency(value: Order["totalUsd"]) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function pretty(value?: string | null) {
  return String(value ?? "pending").replaceAll("_", " ");
}

function itemPrice(item: OrderItem) {
  const value = Number(item.priceUsd ?? item.price ?? 0);
  return Number.isFinite(value) && value > 0 ? formatCurrency(value) : "";
}

export function AdminOrderDocumentsManager({
  initialOrders,
  externalSearch,
}: {
  initialOrders: Order[];
  externalSearch?: string;
}) {
  const [search, setSearch] = useState("");
  const effectiveSearch = externalSearch ?? search;
  const [filter, setFilter] = useState<"all" | "pickup" | "mail">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [documentFilter, setDocumentFilter] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const needle = effectiveSearch.trim().toLowerCase();
    return initialOrders.filter((order) => {
      const matchesSearch =
        !needle ||
        [order.orderNumber, order.customerName, order.userEmail]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      const isPickup = order.fulfillmentType === "pickup";
      const matchesFilter = filter === "all" || (filter === "pickup" ? isPickup : !isPickup);
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;
      const hasEtbProof = Boolean(order.paymentProofUrl);
      const pickupDocsComplete = !isPickup || Boolean(order.pickupIdUrl && order.pickupSignedDocUrl);
      const hasShippingDocs = isPickup || (order.shippingDocuments ?? []).length > 0;
      const matchesDocuments =
        documentFilter === "all" ||
        (documentFilter === "needs_review" && ((isPickup && !pickupDocsComplete) || order.paymentStatus === "awaiting_verification")) ||
        (documentFilter === "complete" && pickupDocsComplete && hasShippingDocs) ||
        (documentFilter === "etb_proof" && hasEtbProof) ||
        (documentFilter === "missing_pickup" && isPickup && !pickupDocsComplete) ||
        (documentFilter === "shipping_docs" && !isPickup && hasShippingDocs);
      return matchesSearch && matchesFilter && matchesStatus && matchesPayment && matchesDocuments;
    });
  }, [documentFilter, effectiveSearch, filter, initialOrders, paymentFilter, statusFilter]);

  const pickupOrders = filteredOrders.filter((order) => order.fulfillmentType === "pickup");
  const mailOrders = filteredOrders.filter((order) => order.fulfillmentType !== "pickup");
  const missingPickupDocs = initialOrders.filter((order) => order.fulfillmentType === "pickup" && (!order.pickupIdUrl || !order.pickupSignedDocUrl)).length;
  const awaitingVerification = initialOrders.filter((order) => order.paymentStatus === "awaiting_verification").length;
  const statusOptions = Array.from(new Set(initialOrders.map((order) => order.status).filter((status): status is string => Boolean(status)))).sort();
  const paymentOptions = Array.from(new Set(initialOrders.map((order) => order.paymentStatus).filter((status): status is string => Boolean(status)))).sort();

  function renderOrder(order: Order) {
    const isPickup = order.fulfillmentType === "pickup";
    const isOpen = expandedOrderId === order.id;
    const shippingDocuments = (order.shippingDocuments ?? []).map((doc) => ({
      ...doc,
      uploadedAt: doc.uploadedAt ?? undefined,
    }));

    return (
      <div key={order.id} className="overflow-hidden rounded-xl border border-border bg-card">
        <button
          type="button"
          onClick={() => setExpandedOrderId(isOpen ? null : order.id)}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-secondary/20"
        >
          {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold">{order.orderNumber ?? order.id}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${FULFILLMENT_STYLES[isPickup ? "pickup" : "mail"]}`}>
                {isPickup ? "In-Store Pickup" : "Mailed"}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[order.status ?? "pending"] ?? "bg-gray-100 text-gray-700"}`}>
                {pretty(order.status)}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] ?? "bg-gray-100 text-gray-700"}`}>
                {pretty(order.paymentStatus)}
              </span>
              {isPickup && order.pickupIdUrl ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  <CreditCard className="h-2.5 w-2.5" /> ID on file
                </span>
              ) : null}
              {isPickup && order.pickupSignedDocUrl ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                  <FileSignature className="h-2.5 w-2.5" /> Signed doc
                </span>
              ) : null}
              {!isPickup && shippingDocuments.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
                  <FileText className="h-2.5 w-2.5" /> {shippingDocuments.length} shipping doc{shippingDocuments.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {order.customerName ?? "Unknown customer"}
              </span>
              <span>{order.userEmail ?? "No email"}</span>
              {order.paymentMethod ? <span>{order.paymentMethod} · {order.paymentCurrency ?? "USD"}</span> : null}
            </div>
          </div>
          <span className="text-sm font-bold text-primary">{formatCurrency(order.totalUsd)}</span>
        </button>

        {isOpen ? (
          <div className="space-y-5 border-t border-border bg-secondary/10 px-5 py-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
              <div className="space-y-1">
                {(order.items ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No item details found.</p>
                ) : (
                  (order.items ?? []).map((item, index) => (
                    <p key={`${order.id}-${index}`} className="flex items-center gap-2 text-sm">
                      <Package className="h-3.5 w-3.5 shrink-0 text-primary" />
                      {item.productName ?? item.product_name ?? "Item"}
                      {itemPrice(item) ? <strong>{itemPrice(item)}</strong> : null}
                      {item.familyMemberName || item.family_member_name ? <span className="text-xs text-muted-foreground">(for {item.familyMemberName ?? item.family_member_name})</span> : null}
                    </p>
                  ))
                )}
              </div>
            </div>

            {order.paymentProofUrl ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">ETB payment proof awaiting/admin verified review</p>
                <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <FileCheck className="h-3.5 w-3.5" />
                  View payment proof
                </a>
              </div>
            ) : null}

            {isPickup ? (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">Pickup Location</p>
                  <p className="flex items-center gap-1 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {order.pickupLocation ?? "Not set"}
                  </p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">Pickup Person</p>
                  <p className="font-medium">{order.pickupPersonName ?? "Not set"}{order.pickupPersonPhone ? ` · ${order.pickupPersonPhone}` : ""}</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">Carrier</p>
                  <p className="flex items-center gap-1 font-medium">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                    {order.carrier ?? "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="mb-0.5 text-xs text-muted-foreground">Destination</p>
                  <p className="font-medium">{order.shippingAddress?.city ?? "City not set"}{order.shippingAddress?.country ? `, ${order.shippingAddress.country}` : ""}</p>
                  {order.shippingAddress?.street ? <p className="text-xs text-muted-foreground">{order.shippingAddress.street}</p> : null}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4">
              <AdminOrderDocuments
                orderId={order.id}
                pickupIdUrl={order.pickupIdUrl}
                pickupSignedDocUrl={order.pickupSignedDocUrl}
                pickupProofUrl={order.pickupProofUrl}
                shippingDocuments={shippingDocuments}
              />
            </div>

            <Link href={`/admin/orders/${order.id}`} className="inline-flex text-sm font-medium text-primary hover:underline">
              Open full order details
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Orders", value: initialOrders.length, Icon: Package, classes: "border-slate-200 bg-slate-50 text-slate-900", icon: "bg-slate-900 text-white" },
          { label: "Pickup Orders", value: initialOrders.filter((order) => order.fulfillmentType === "pickup").length, Icon: MapPin, classes: "border-purple-200 bg-purple-50 text-purple-900", icon: "bg-purple-700 text-white" },
          { label: "Mailed Orders", value: initialOrders.filter((order) => order.fulfillmentType !== "pickup").length, Icon: Truck, classes: "border-blue-200 bg-blue-50 text-blue-900", icon: "bg-blue-700 text-white" },
          { label: "Needs Review", value: missingPickupDocs + awaitingVerification, Icon: AlertTriangle, classes: "border-amber-200 bg-amber-50 text-amber-900", icon: "bg-amber-500 text-white" },
        ].map(({ label, value, Icon, classes, icon }) => (
          <div key={label} className={`rounded-xl border p-4 shadow-sm ${classes}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-3xl font-extrabold">{value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
              </div>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${icon}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className={`grid gap-3 ${externalSearch === undefined ? "lg:grid-cols-[minmax(220px,1.4fr)_repeat(4,minmax(150px,1fr))]" : "lg:grid-cols-4"}`}>
        {externalSearch === undefined ? (
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background px-4 text-sm"
            placeholder="Search by order, customer, email..."
          />
        ) : null}
          <select value={filter} onChange={(event) => setFilter(event.target.value as "all" | "pickup" | "mail")} className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All fulfillment</option>
            <option value="pickup">In-store pickup</option>
            <option value="mail">Mailed orders</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All status</option>
            {statusOptions.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}
          </select>
          <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All payment</option>
            {paymentOptions.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}
          </select>
          <select value={documentFilter} onChange={(event) => setDocumentFilter(event.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All documents</option>
            <option value="needs_review">Needs review</option>
            <option value="complete">Complete docs</option>
            <option value="etb_proof">ETB proof</option>
            <option value="missing_pickup">Missing pickup docs</option>
            <option value="shipping_docs">Has shipping docs</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{filteredOrders.length} showing</span>
          {((externalSearch === undefined && search) || filter !== "all" || statusFilter !== "all" || paymentFilter !== "all" || documentFilter !== "all") ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilter("all");
                setStatusFilter("all");
                setPaymentFilter("all");
                setDocumentFilter("all");
              }}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 font-medium text-foreground hover:bg-secondary/80"
            >
              <CheckCircle2 className="h-3 w-3" />
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      <div className={filter === "all" ? "grid gap-6 xl:grid-cols-2 xl:items-start" : "space-y-6"}>
      {(filter === "all" || filter === "pickup") ? (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-purple-900">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-700 text-white">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold">In-Store Pickup Orders</h2>
                <p className="text-xs text-purple-700">Pickup IDs, signed forms, and proof</p>
              </div>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm">{pickupOrders.length}</span>
          </div>
          {pickupOrders.length === 0 ? <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">No pickup orders found.</p> : <div className="space-y-2">{pickupOrders.map(renderOrder)}</div>}
        </section>
      ) : null}

      {(filter === "all" || filter === "mail") ? (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-700 text-white">
                <Truck className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold">Mailed / Shipped Orders</h2>
                <p className="text-xs text-blue-700">Shipping documents and destinations</p>
              </div>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm">{mailOrders.length}</span>
          </div>
          {mailOrders.length === 0 ? <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">No mailed orders found.</p> : <div className="space-y-2">{mailOrders.map(renderOrder)}</div>}
        </section>
      ) : null}
      </div>
    </div>
  );
}
