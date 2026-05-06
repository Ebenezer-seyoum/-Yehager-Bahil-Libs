import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

export default async function AdminPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/admin");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }
  const query = (await searchParams) ?? {};

  async function refreshExchangeRate() {
    "use server";
    try {
      await apiRequest("/api/v1/exchange-rate/refresh", { method: "POST" });
      revalidatePath("/admin");
      redirect("/admin?rate=saved");
    } catch {
      redirect("/admin?rate=error");
    }
  }

  let orders = [];
  let exchangeRate = null;
  try {
    const [ordersResponse, rateResponse] = await Promise.all([
      apiRequest("/api/v1/orders?limit=200"),
      apiRequest("/api/v1/exchange-rate"),
    ]);
    orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
    exchangeRate = rateResponse?.data ?? null;
  } catch {
    orders = [];
    exchangeRate = null;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Orders Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track orders, payment status, and fulfillment progress.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          Orders
        </Link>
        <Link href="/admin/alerts" className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
          Alerts
        </Link>
        <Link href="/admin/audit" className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
          Audit Logs
        </Link>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Exchange Rate</p>
            <p className="mt-1 text-sm text-muted-foreground">
              USD to ETB: {exchangeRate?.rate ? Number(exchangeRate.rate).toFixed(4) : "Not configured"}
            </p>
          </div>
          <form action={refreshExchangeRate}>
            <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary">
              Refresh Rate
            </button>
          </form>
        </div>
      </div>
      {query.rate === "saved" ? (
        <div className="rounded-md border border-border bg-card p-3 text-sm text-primary">Exchange rate refreshed.</div>
      ) : null}
      {query.rate === "error" ? (
        <div className="rounded-md border border-destructive/40 bg-card p-3 text-sm text-destructive">Failed to refresh exchange rate.</div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Payment</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td className="px-4 py-5 text-muted-foreground" colSpan={6}>
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-medium text-primary hover:underline">
                      {order.orderNumber ?? order.id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{order.customerName ?? order.userEmail ?? "—"}</td>
                  <td className="px-4 py-3">{formatCurrency(order.totalUsd)}</td>
                  <td className="px-4 py-3">{order.status ?? "pending"}</td>
                  <td className="px-4 py-3">{order.paymentStatus ?? "pending"}</td>
                  <td className="px-4 py-3">{order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
