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
  paymentStatus?: string;
  totalUsd?: number;
  createdAt?: string;
  eventName?: string | null;
  fulfillmentType?: "mail" | "pickup";
  carrier?: string | null;
  shippingAddress?: { city?: string; country?: string } | null;
  pickupLocation?: string | null;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
  shippingDocuments?: Array<{ url: string; label: string; uploadedAt?: string }> | null;
  items?: OrderItem[];
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
  tailoring: "bg-amber-100 text-amber-800",
  quality_check: "bg-purple-100 text-purple-800",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-800",
  ready_for_pickup: "bg-orange-100 text-orange-800",
  picked_up: "bg-green-200 text-green-900",
};

function getOrderSteps(fulfillmentType?: "mail" | "pickup") {
  return fulfillmentType === "pickup"
    ? ["pending", "tailoring", "quality_check", "ready_for_pickup", "picked_up"]
    : ["pending", "tailoring", "quality_check", "shipped", "delivered"];
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
        <h2 className="font-heading mb-2 text-2xl font-bold">Sign in to view your orders</h2>
        <Link href="/signin" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="mb-8 font-heading text-3xl font-bold">My Orders</h1>

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
            <h3 className="font-heading mb-1 text-lg font-semibold">No orders yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">Browse collections and place your first order.</p>
            <Link href="/catalog" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Browse Collection
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusStyle = STATUS_STYLES[order.status ?? ""] ?? "bg-gray-100 text-gray-700";
              const steps = getOrderSteps(order.fulfillmentType);
              const currentStepIndex = Math.max(0, steps.indexOf(order.status ?? "pending"));
              return (
                <div key={order.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold">{order.orderNumber ?? order.id}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle}`}>{order.status ?? "pending"}</span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{order.paymentStatus ?? "unpaid"}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(order.items ?? []).length} item(s) - <span className="font-semibold text-foreground">${Number(order.totalUsd ?? 0).toFixed(2)}</span>
                      </p>
                      {order.eventName ? <p className="mt-1 text-xs text-primary">Group: {order.eventName}</p> : null}
                    </div>
                    <p className="whitespace-nowrap text-xs text-muted-foreground">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}</p>
                  </div>

                  <div className="mt-3 space-y-1">
                    {(order.items ?? []).map((item, idx) => (
                      <p key={`${order.id}-${idx}`} className="text-xs text-muted-foreground">
                        - {item.product_name ?? "Item"} x{Number(item.quantity ?? 1)}
                      </p>
                    ))}
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex gap-1">
                      {steps.map((step, index) => (
                        <div key={step} className={`h-1.5 flex-1 rounded-full ${index <= currentStepIndex ? "bg-primary" : "bg-border"}`} />
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      {steps.map((step) => (
                        <span key={`${order.id}-${step}`}>{step.replaceAll("_", " ")}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                    {order.fulfillmentType === "pickup" ? (
                      <div className="space-y-1">
                        <p>In-Store Pickup: {order.pickupLocation ?? "Location to be confirmed"}</p>
                        {order.pickupPersonName ? <p>Pickup Person: {order.pickupPersonName} · {order.pickupPersonPhone}</p> : null}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p>
                          {order.carrier ?? "Carrier TBD"}
                          {order.shippingAddress?.city ? ` -> ${order.shippingAddress.city}, ${order.shippingAddress.country}` : ""}
                        </p>
                        {(order.shippingDocuments ?? []).map((doc) => (
                          <p key={doc.url}>
                            <a className="text-primary hover:underline" href={doc.url} target="_blank" rel="noreferrer">
                              {doc.label}
                            </a>
                          </p>
                        ))}
                        {(order.shippingDocuments ?? []).length === 0 && order.status !== "delivered" ? (
                          <p>Awaiting shipping documents.</p>
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
