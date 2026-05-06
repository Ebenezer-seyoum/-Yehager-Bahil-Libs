import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

const statusTone = {
  pending: "bg-gray-100 text-gray-700",
  tailoring: "bg-amber-100 text-amber-800",
  quality_check: "bg-purple-100 text-purple-800",
  shipped: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-800",
  ready_for_pickup: "bg-orange-100 text-orange-800",
  picked_up: "bg-green-200 text-green-900",
};

function money(value) {
  return Number(value ?? 0).toFixed(2);
}

export default async function MyOrdersPage() {
  let orders = [];
  let authRequired = false;

  try {
    await ensureBackendUserSynced();
    const response = await apiRequest("/api/v1/orders/me");
    orders = Array.isArray(response?.data) ? response.data : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    authRequired = message.includes("No authenticated user found") || message.includes("401") || message.includes("Unauthorized");
  }

  if (authRequired) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl font-semibold">My Orders</h1>
        <p className="mt-3 text-muted-foreground">Sign in is required to view your orders.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-heading text-3xl font-semibold">My Orders</h1>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-muted-foreground">You do not have any orders yet.</p>
          <Link href="/catalog" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Browse collection
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusClass = statusTone[order.status] ?? "bg-gray-100 text-gray-700";
            const itemCount = Array.isArray(order.items) ? order.items.length : 0;
            return (
              <div key={order.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold">{order.orderNumber}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>{order.status}</span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {order.paymentStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {itemCount} item(s) · ${money(order.totalUsd)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="mt-3 space-y-1">
                  {(order.items ?? []).slice(0, 3).map((item, index) => (
                    <p key={`${order.id}-${index}`} className="text-xs text-muted-foreground">
                      • {String(item.product_name ?? "Item")} × {Number(item.quantity ?? 1)}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
