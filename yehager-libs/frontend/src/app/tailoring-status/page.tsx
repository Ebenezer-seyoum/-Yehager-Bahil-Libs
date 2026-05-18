import Link from "next/link";
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
  items?: OrderItem[];
};

const STAGES = [
  { key: "pending", label: "Order Received", offset: 0 },
  { key: "tailoring", label: "In Tailoring", offset: 2 },
  { key: "quality_check", label: "Quality Inspected", offset: 22 },
  { key: "shipped", label: "Shipped", offset: 27 },
  { key: "delivered", label: "Delivered", offset: 41 },
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
        <p className="text-xs uppercase tracking-[0.4em] text-primary">Live Tracking</p>
        <h1 className="mt-2 font-heading text-4xl font-bold">My Tailoring Status</h1>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <h2 className="font-heading text-xl font-semibold">No orders yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Place an order to begin tracking.</p>
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

                <div className="space-y-3">
                  {STAGES.map((stage, index) => {
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
                          {index + 1}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
