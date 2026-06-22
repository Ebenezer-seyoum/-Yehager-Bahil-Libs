import Link from "next/link";
import { CheckCircle2, ChevronRight, MapPin, Package, Scissors, Star, Truck } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

type OrderItem = {
  product_name?: string;
  quantity?: number;
};

type Order = {
  id: string;
  orderNumber?: string;
  status?: string;
  totalUsd?: number;
  createdAt?: string;
  eventName?: string | null;
  shippingAddress?: { street?: string; city?: string; country?: string } | null;
  items?: OrderItem[];
};

const STAGES = [
  { key: "pending", label: "Order Received", icon: Package, desc: "Your order is confirmed and queued for production in Addis Ababa.", offset: 0 },
  { key: "tailoring", label: "In Tailoring", icon: Scissors, desc: "Master artisans are cutting, embroidering and stitching your garment.", offset: 2 },
  { key: "quality_check", label: "Quality Inspected", icon: CheckCircle2, desc: "Every measurement, stitch, and embroidery detail is being verified.", offset: 22 },
  { key: "shipped", label: "Shipped", icon: Truck, desc: "Your garment has been dispatched. Tracking is sent by email.", offset: 27 },
  { key: "delivered", label: "Delivered", icon: Star, desc: "Your garment has arrived. Wear your culture with pride.", offset: 41 },
];

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
        <h1 className="font-heading text-3xl font-bold">Sign in to track your garments</h1>
        <p className="mt-2 text-sm text-muted-foreground">View production and shipping progress for your orders.</p>
        <Link href="/signin" className="mt-5 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/my-orders" className="hover:text-foreground">Account</Link>
          <ChevronRight className="h-3 w-3" />
          <span>Tailoring Status</span>
        </div>
        <p className="text-xs uppercase tracking-[0.4em] text-primary">Live Tracking</p>
        <h1 className="mt-2 font-heading text-4xl font-bold">My Tailoring Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">Real-time progress of your custom-made garments, from the artisan&apos;s needle to your door.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAGES.slice(0, 4).map((stage) => {
          const Icon = stage.icon;
          const count = orders.filter((order) => order.status === stage.key).length;
          return (
            <div key={stage.key} className="rounded-xl border border-border bg-card p-4">
              <Icon className="mb-2 h-5 w-5 text-primary" />
              <p className="font-heading text-xl font-bold">{count}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{stage.label}</p>
            </div>
          );
        })}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Scissors className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="font-heading text-xl font-semibold">No orders yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Place an order to begin tracking.</p>
          <Link href="/catalog" className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90">
            Browse Catalog
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const currentIndex = Math.max(
              0,
              STAGES.findIndex((stage) => stage.key === order.status),
            );
            const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
            const estimatedDelivery = addDays(createdAt, 41);

            return (
              <div key={order.id} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-bold">{order.orderNumber ?? order.id}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {(order.items ?? []).length} item(s) · ${Number(order.totalUsd ?? 0).toFixed(2)}
                    </p>
                    {order.eventName ? <p className="mt-1 text-xs text-primary">{order.eventName}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Est. delivery</p>
                    <p className="text-xs font-bold">{formatDate(estimatedDelivery)}</p>
                  </div>
                </div>

                <div className="relative hidden sm:block">
                  <div className="absolute left-5 right-5 top-5 h-0.5 bg-border" />
                  <div className="relative flex justify-between">
                    {STAGES.map((stage, index) => {
                      const Icon = stage.icon;
                      const done = index < currentIndex;
                      const active = index === currentIndex;
                      return (
                        <div key={stage.key} className="flex flex-1 flex-col items-center gap-1.5">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                            done ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary bg-primary/15 text-primary" : "border-border bg-background text-muted-foreground"
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className={`text-center text-[10px] font-bold leading-tight ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>{stage.label}</p>
                          <p className="text-center text-[9px] text-muted-foreground">
                            {done ? `✓ ${formatDate(addDays(createdAt, stage.offset))}` : active ? "In progress" : formatDate(addDays(createdAt, stage.offset))}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 sm:hidden">
                  {STAGES.map((stage, index) => {
                    const Icon = stage.icon;
                    const done = index < currentIndex;
                    const active = index === currentIndex;
                    return (
                      <div key={stage.key} className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${
                            done
                              ? "border-primary bg-primary text-primary-foreground"
                              : active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>{stage.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {done ? `Completed ${formatDate(addDays(createdAt, stage.offset))}` : active ? "In progress" : `Estimated ${formatDate(addDays(createdAt, stage.offset))}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-primary">
                    {(() => {
                      const Icon = STAGES[currentIndex]?.icon;
                      return Icon ? <Icon className="h-3.5 w-3.5" /> : null;
                    })()}
                    Current Stage: {STAGES[currentIndex]?.label}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{STAGES[currentIndex]?.desc}</p>
                </div>

                {order.shippingAddress?.street ? (
                  <div className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>Shipping to: {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.country}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
