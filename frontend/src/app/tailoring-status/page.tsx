import Link from "next/link";
import { CheckCircle2, ChevronRight, ClipboardCheck, Package, Ruler, Scissors, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

type OrderItem = {
  product_name?: string;
  productName?: string;
  quantity?: number;
  item_type?: string;
  itemType?: string;
  uploaded_design_id?: string;
  uploadedDesignId?: string;
};

type OrderWorkstream = {
  id: string;
  type: "catalog" | "custom";
  trackingReference?: string | null;
  status: string;
  dueAt?: string | null;
  items?: OrderItem[];
};

type Order = {
  id: string;
  orderNumber?: string;
  orderType?: string;
  status?: string;
  totalUsd?: number;
  createdAt?: string;
  eventName?: string | null;
  fulfillmentType?: "mail" | "pickup";
  deliveryStatus?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  items?: OrderItem[];
  workstreams?: OrderWorkstream[];
};

type Stage = { key: string; label: string; icon: LucideIcon };

const CUSTOM_STAGES: Stage[] = [
  { key: "design_review", label: "Design Review", icon: ClipboardCheck },
  { key: "measurements_confirmed", label: "Measurements", icon: Ruler },
  { key: "tailoring", label: "Tailoring", icon: Scissors },
  { key: "quality_check", label: "Quality Check", icon: CheckCircle2 },
  { key: "ready", label: "Ready", icon: Package },
];

const CATALOG_STAGES: Stage[] = [
  { key: "pending", label: "Received", icon: Package },
  { key: "picking", label: "Picking", icon: ClipboardCheck },
  { key: "quality_check", label: "Quality Check", icon: CheckCircle2 },
  { key: "ready", label: "Ready", icon: Package },
];

function isCustomItem(item: OrderItem) {
  return Boolean(item.uploaded_design_id || item.uploadedDesignId || item.item_type === "custom_design" || item.itemType === "custom_design");
}

function workstreamsForOrder(order: Order): OrderWorkstream[] {
  if (order.workstreams?.length) return order.workstreams;
  const items = order.items ?? [];
  const customItems = items.filter(isCustomItem);
  const catalogItems = items.filter((item) => !isCustomItem(item));
  return [
    ...(catalogItems.length ? [{ id: `${order.id}-catalog`, type: "catalog" as const, trackingReference: `${order.orderNumber ?? order.id}-CAT`, status: order.status ?? "pending", items: catalogItems }] : []),
    ...(customItems.length ? [{ id: `${order.id}-custom`, type: "custom" as const, trackingReference: `${order.orderNumber ?? order.id}-CUS`, status: order.status ?? "design_review", items: customItems }] : []),
  ];
}

function titleCase(value?: string | null) {
  return String(value ?? "pending").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function WorkstreamProgress({ workstream }: { workstream: OrderWorkstream }) {
  const stages = workstream.type === "custom" ? CUSTOM_STAGES : CATALOG_STAGES;
  const currentIndex = workstream.status === "cancelled"
    ? -1
    : Math.max(0, stages.findIndex((stage) => stage.key === workstream.status));
  const custom = workstream.type === "custom";

  return (
    <section className={`rounded-2xl border p-5 ${custom ? "border-violet-200 bg-violet-50/50" : "border-sky-200 bg-sky-50/50"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{workstream.type} order</p>
          <h3 className="mt-1 font-mono text-sm font-black">{workstream.trackingReference}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{(workstream.items ?? []).length} item(s) · Due {formatDate(workstream.dueAt)}</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${workstream.status === "cancelled" ? "border-red-200 bg-red-100 text-red-800" : workstream.status === "ready" ? "border-emerald-200 bg-emerald-100 text-emerald-800" : custom ? "border-violet-200 bg-white text-violet-800" : "border-sky-200 bg-white text-sky-800"}`}>
          {titleCase(workstream.status)}
        </span>
      </div>

      <div className="mt-4 space-y-1 rounded-xl border border-white/80 bg-white/70 p-3">
        {(workstream.items ?? []).map((item, index) => (
          <div key={`${workstream.id}-${index}`} className="flex justify-between gap-3 text-xs text-muted-foreground">
            <span>{item.product_name ?? item.productName ?? `Item ${index + 1}`}</span>
            <span>× {item.quantity ?? 1}</span>
          </div>
        ))}
      </div>

      {workstream.status === "cancelled" ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-800">This part of the order was cancelled. The other part may still continue.</p>
      ) : (
        <div className="mt-5">
          <div className="relative flex justify-between">
            <div className="absolute left-5 right-5 top-5 h-0.5 bg-border" />
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const complete = index < currentIndex;
              const active = index === currentIndex;
              return (
                <div key={stage.key} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
                  <span className={`z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${complete ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-background text-primary" : "border-border bg-background text-muted-foreground"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={`max-w-20 text-[9px] font-bold leading-tight sm:text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>{stage.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default async function TailoringStatusPage() {
  let orders: Order[] = [];
  let authRequired = false;
  try {
    await ensureBackendUserSynced();
    const response = await apiRequest<{ data: Order[] }>("/api/v1/orders/me?limit=50");
    orders = Array.isArray(response.data) ? response.data : [];
  } catch {
    authRequired = true;
  }

  if (authRequired) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Scissors className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="font-heading text-3xl font-bold">Sign in to track your orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">View catalog, custom, and shared delivery progress.</p>
        <Link href="/signin" className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Sign In</Link>
      </div>
    );
  }

  const allWorkstreams = orders.flatMap(workstreamsForOrder);
  const metrics = [
    { label: "Active Parts", value: allWorkstreams.filter((row) => !["ready", "cancelled"].includes(row.status)).length, icon: Package },
    { label: "In Tailoring", value: allWorkstreams.filter((row) => row.status === "tailoring").length, icon: Scissors },
    { label: "Quality Check", value: allWorkstreams.filter((row) => row.status === "quality_check").length, icon: CheckCircle2 },
    { label: "Ready", value: allWorkstreams.filter((row) => row.status === "ready").length, icon: Truck },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/my-orders" className="hover:text-foreground">My Orders</Link>
          <ChevronRight className="h-3 w-3" />
          <span>Order Tracking</span>
        </div>
        <p className="text-xs uppercase tracking-[0.4em] text-primary">Live Tracking</p>
        <h1 className="mt-2 font-heading text-4xl font-bold">Order Progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">A mixed purchase stays one order, with clear catalog and custom progress shown separately.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return <div key={metric.label} className="rounded-xl border border-border bg-card p-4"><Icon className="mb-2 h-5 w-5 text-primary" /><p className="font-heading text-xl font-bold">{metric.value}</p><p className="text-[11px] text-muted-foreground">{metric.label}</p></div>;
        })}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="font-heading text-xl font-semibold">No orders yet</h2>
          <Link href="/catalog" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Browse Catalog</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const workstreams = workstreamsForOrder(order);
            return (
              <article key={order.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-mono text-base font-black">{order.orderNumber ?? order.id}</h2>
                      {workstreams.length > 1 ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-800">Mixed order</span> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Placed {formatDate(order.createdAt)} · Combined total ${Number(order.totalUsd ?? 0).toFixed(2)}</p>
                  </div>
                  <span className="rounded-full border border-border bg-secondary px-3 py-1 text-[10px] font-black uppercase">Overall: {titleCase(order.status)}</span>
                </div>

                <div className={`grid gap-4 ${workstreams.length > 1 ? "lg:grid-cols-2" : ""}`}>
                  {workstreams.map((workstream) => <WorkstreamProgress key={workstream.id} workstream={workstream} />)}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /><strong className="text-foreground">Shared delivery:</strong> {titleCase(order.deliveryStatus ?? (order.status === "fulfilled" ? "preparing" : "not_started"))}</span>
                  <span>{order.trackingNumber ? `Tracking ${order.trackingNumber}` : `${order.carrier ?? (order.fulfillmentType === "pickup" ? "Pickup" : "Carrier")} details will appear when every active part is ready.`}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
