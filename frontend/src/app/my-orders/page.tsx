import Link from "next/link";
import { ExternalLink, FileCheck, FileText, MapPin, Package, Truck, Users } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

type OrderItem = {
  product_name?: string;
  productName?: string;
  quantity?: number;
  price?: number;
  priceUsd?: number;
  unit_price_usd?: number;
  item_type?: string;
  uploaded_design_id?: string;
  item_metadata?: Record<string, unknown>;
  itemType?: string;
  uploadedDesignId?: string;
};

type OrderWorkstream = {
  id: string;
  type: "catalog" | "custom";
  trackingReference?: string | null;
  status: string;
  deliveryStatus?: string | null;
  deliveryCarrier?: string | null;
  deliveryTrackingNumber?: string | null;
  deliveryDueAt?: string | null;
  dueAt?: string | null;
  items?: OrderItem[];
};

type Order = {
  id: string;
  orderNumber?: string;
  status?: string;
  paymentStatus?: string;
  totalUsd?: number;
  createdAt?: string;
  eventName?: string | null;
  fulfillmentType?: "mail" | "pickup";
  carrier?: string | null;
  trackingNumber?: string | null;
  deliveryStatus?: string | null;
  shippingAddress?: { city?: string; country?: string } | null;
  pickupLocation?: string | null;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
  shippingDocuments?: Array<{ url: string; label: string; uploadedAt?: string }> | null;
  items?: OrderItem[];
  orderType?: string | null;
  workstreams?: OrderWorkstream[];
};

type Event = {
  id: string;
  name: string;
  eventCode?: string | null;
  eventDate?: string | null;
  productName?: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  processing: "bg-sky-100 text-sky-800",
  picking: "bg-sky-100 text-sky-800",
  design_review: "bg-violet-100 text-violet-800",
  measurements_confirmed: "bg-indigo-100 text-indigo-800",
  tailoring: "bg-amber-100 text-amber-800",
  quality_check: "bg-purple-100 text-purple-800",
  ready: "bg-emerald-100 text-emerald-800",
  fulfilled: "bg-emerald-100 text-emerald-800",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-800",
  ready_for_pickup: "bg-orange-100 text-orange-800",
  picked_up: "bg-green-200 text-green-900",
  cancelled: "bg-red-100 text-red-800",
};

const CARRIER_TRACKING: Record<string, { name: string; url: string }> = {
  DHL: { name: "DHL", url: "https://www.dhl.com/en/express/tracking.html" },
  UPS: { name: "UPS", url: "https://www.ups.com/track" },
  "Ethiopian Mail Service": { name: "Ethiopian Postal Service", url: "https://www.ethiopianpostalservice.com" },
};

function titleCase(value?: string | null) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const WORKSTREAM_STEPS = {
  catalog: ["pending", "picking", "quality_check", "ready"],
  custom: ["design_review", "measurements_confirmed", "tailoring", "quality_check", "ready"],
} as const;

const WORKSTREAM_LABELS = {
  catalog: ["Received", "Picking", "QC", "Ready"],
  custom: ["Review", "Measurements", "Tailoring", "QC", "Ready"],
} as const;

function isCustomItem(item: OrderItem) {
  return Boolean(item.uploaded_design_id || item.uploadedDesignId || item.item_type === "custom_design" || item.itemType === "custom_design");
}

function orderWorkstreams(order: Order): OrderWorkstream[] {
  if (order.workstreams?.length) return order.workstreams;
  const items = order.items ?? [];
  const customItems = items.filter(isCustomItem);
  const catalogItems = items.filter((item) => !isCustomItem(item));
  return [
    ...(catalogItems.length ? [{ id: `${order.id}-catalog`, type: "catalog" as const, trackingReference: `${order.orderNumber ?? order.id}-CAT`, status: order.status ?? "pending", items: catalogItems }] : []),
    ...(customItems.length ? [{ id: `${order.id}-custom`, type: "custom" as const, trackingReference: `${order.orderNumber ?? order.id}-CUS`, status: order.status ?? "design_review", items: customItems }] : []),
  ];
}

export default async function MyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const tab = query?.tab === "events" ? "events" : "orders";

  let orders: Order[] = [];
  let myEvents: Event[] = [];
  let authRequired = false;

  try {
    await ensureBackendUserSynced();
    const [ordersRes, eventsRes] = await Promise.all([
      apiRequest<{ data: Order[] }>("/api/v1/orders/me?limit=80"),
      apiRequest<{ data: Event[] }>("/api/v1/events/mine?limit=80"),
    ]);
    orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
    myEvents = Array.isArray(eventsRes?.data) ? eventsRes.data : [];
  } catch {
    authRequired = true;
  }

  if (authRequired) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 font-heading text-2xl font-bold">Sign in first to view your orders</h2>
        <p className="mb-5 text-sm text-muted-foreground">Your order history, event orders, shipping documents, and tracking details are connected to your account.</p>
        <Link href="/signin?callbackUrl=/my-orders" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <Link href="/my-account" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
          &larr; Back to Account
        </Link>
      </div>
      <h1 className="mb-2 font-heading text-3xl font-bold">My Orders</h1>
      <p className="mb-8 text-sm text-muted-foreground">Track your orders and event groups in one place.</p>

      <div className="mb-8 inline-flex gap-1 rounded-xl bg-secondary p-1">
        <Link
          href="/my-orders?tab=orders"
          className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${tab === "orders" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Orders
        </Link>
        <Link
          href="/my-orders?tab=events"
          className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${tab === "events" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Events
        </Link>
      </div>

      {tab === "orders" ? (
        orders.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-heading mb-1 text-lg font-semibold">No orders yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">Browse the catalog and place your first order.</p>
            <Link href="/catalog" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusStyle = STATUS_STYLES[order.status ?? ""] ?? "bg-gray-100 text-gray-700";
              const workstreams = orderWorkstreams(order);
              const isMixed = workstreams.length > 1;
              return (
                <div key={order.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold">{order.orderNumber ?? order.id}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>{(order.status ?? "pending").replaceAll("_", " ")}</span>
                        {isMixed ? <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">Mixed order</span> : null}
                        {order.paymentStatus === "paid" ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Paid</span>
                        ) : (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{order.paymentStatus ?? "unpaid"}</span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(order.items ?? []).length} item(s) · <span className="font-semibold text-foreground">${Number(order.totalUsd ?? 0).toFixed(2)}</span>
                      </p>
                      {order.eventName ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                          <Users className="h-3 w-3" />
                          Group: {order.eventName}
                        </p>
                      ) : null}
                    </div>
                    <p className="whitespace-nowrap text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}</p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {workstreams.map((workstream) => {
                      const steps = WORKSTREAM_STEPS[workstream.type];
                      const labels = WORKSTREAM_LABELS[workstream.type];
                      const currentStepIndex = workstream.status === "cancelled"
                        ? -1
                        : Math.max(0, (steps as readonly string[]).indexOf(workstream.status));
                      const workstreamStyle = STATUS_STYLES[workstream.status] ?? STATUS_STYLES.pending;
                      return (
                        <div key={workstream.id} className={`rounded-xl border p-4 ${workstream.type === "custom" ? "border-violet-200 bg-violet-50/40" : "border-sky-200 bg-sky-50/40"}`}>
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{workstream.type} order</p>
                              <p className="mt-1 font-mono text-xs font-bold">{workstream.trackingReference}</p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${workstreamStyle}`}>{titleCase(workstream.status)}</span>
                              {workstream.deliveryStatus && workstream.deliveryStatus !== "not_started" ? <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase text-blue-800">{titleCase(workstream.deliveryStatus)}</span> : null}
                            </div>
                          </div>
                          <div className="mt-3 space-y-1">
                            {(workstream.items ?? []).map((item, idx) => (
                              <div key={`${workstream.id}-${idx}`} className="flex justify-between gap-3 text-xs text-muted-foreground">
                                <span>{item.product_name ?? item.productName ?? "Item"} × {Number(item.quantity ?? 1)}</span>
                                <span>{Number(item.unit_price_usd ?? item.price ?? item.priceUsd ?? 0) > 0 ? `$${Number(item.unit_price_usd ?? item.price ?? item.priceUsd ?? 0).toFixed(2)}` : "Quoted"}</span>
                              </div>
                            ))}
                          </div>
                          {workstream.status !== "cancelled" ? (
                            <div className="mt-3">
                              <div className="mb-1 flex gap-1">
                                {steps.map((step, index) => <div key={step} className={`h-1.5 flex-1 rounded-full ${index <= currentStepIndex ? "bg-primary" : "bg-border"}`} />)}
                              </div>
                              <div className="flex justify-between text-[9px] text-muted-foreground">
                                {labels.map((label) => <span key={`${workstream.id}-${label}`}>{label}</span>)}
                              </div>
                            </div>
                          ) : null}
                          {workstream.deliveryStatus && workstream.deliveryStatus !== "not_started" ? (
                            <p className="mt-3 text-xs font-semibold text-muted-foreground">
                              Delivery: {titleCase(workstream.deliveryStatus)}
                              {workstream.deliveryTrackingNumber ? ` · Tracking ${workstream.deliveryTrackingNumber}` : ""}
                              {workstream.deliveryDueAt ? ` · Expected ${new Date(workstream.deliveryDueAt).toLocaleDateString()}` : ""}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    <p className="font-bold text-foreground">Delivery information</p>
                    {order.fulfillmentType === "pickup" ? (
                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-primary" />
                          <span className="font-medium text-foreground">In-Store Pickup:</span> {order.pickupLocation ?? "Location to be confirmed"}
                        </p>
                        {order.pickupPersonName ? <p>Pickup Person: <strong>{order.pickupPersonName}</strong> · {order.pickupPersonPhone}</p> : null}
                        <p className="flex items-center gap-1.5 text-amber-600">
                          <FileCheck className="h-3 w-3" />
                          Pickup documents appear here once completed.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Truck className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium text-foreground">{order.carrier ?? "Carrier TBD"}</span>
                          {order.shippingAddress?.city ? <span>→ {order.shippingAddress.city}, {order.shippingAddress.country}</span> : null}
                          {order.deliveryStatus ? (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                              {titleCase(order.deliveryStatus)}
                            </span>
                          ) : null}
                          {order.trackingNumber ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              Tracking: {order.trackingNumber}
                            </span>
                          ) : null}
                          {order.carrier && CARRIER_TRACKING[order.carrier] ? (
                            <a
                              href={CARRIER_TRACKING[order.carrier].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground transition-opacity hover:opacity-80"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Track on {CARRIER_TRACKING[order.carrier].name}
                            </a>
                          ) : null}
                        </div>
                        {(order.shippingDocuments ?? []).map((doc) => (
                          <a key={doc.url} className="flex items-center gap-1.5 text-blue-400 hover:underline" href={doc.url} target="_blank" rel="noreferrer">
                            <FileText className="h-3 w-3" />
                            {doc.label}
                            {doc.uploadedAt ? <span className="text-muted-foreground">({new Date(doc.uploadedAt).toLocaleDateString()})</span> : null}
                          </a>
                        ))}
                        {(order.shippingDocuments ?? []).length === 0 && order.status !== "delivered" ? (
                          <p>⏳ Shipping documents will appear here once dispatched</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : myEvents.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="font-heading mb-1 text-lg font-semibold">No events yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">Create your first event group to get started.</p>
          <Link href="/events" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Create Event
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {myEvents.map((event) => (
            <Link key={event.id} href={`/event/${event.id}`} className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30">
              <div>
                <h3 className="font-heading font-semibold">{event.name}</h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  {event.eventCode ? <span className="font-mono">{event.eventCode}</span> : null}
                  {event.eventDate ? <span>{new Date(event.eventDate).toLocaleDateString()}</span> : null}
                  {event.productName ? <span>- {event.productName}</span> : null}
                </div>
              </div>
              <span className="text-xs text-primary group-hover:underline">View Dashboard -&gt;</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
