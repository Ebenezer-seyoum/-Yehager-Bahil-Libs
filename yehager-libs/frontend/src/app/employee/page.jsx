import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default async function EmployeePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/signin?callbackUrl=/employee");
  }
  if (session.user.role !== "employee" && session.user.role !== "admin") {
    redirect("/");
  }
  if (session.user.role === "employee" && session.user.roleStatus === "unassigned") {
    redirect("/employee/access-pending");
  }

  let orders = [];
  try {
    const response = await apiRequest("/api/v1/orders?limit=100");
    orders = Array.isArray(response?.data) ? response.data : [];
  } catch {
    orders = [];
  }

  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const tailoringOrders = orders.filter((order) => order.status === "tailoring").length;
  const pickupOrders = orders.filter((order) => order.fulfillmentType === "pickup").length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Employee</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Operations Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">A focused queue for day-to-day order work.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Pending", pendingOrders],
          ["Tailoring", tailoringOrders],
          ["Pickup", pickupOrders],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Fulfillment</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-muted-foreground">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{order.orderNumber ?? order.id}</td>
                  <td className="px-4 py-3">
                    <p>{order.customerName ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{order.userEmail ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-primary">{formatCurrency(order.totalUsd)}</td>
                  <td className="px-4 py-3">{order.status ?? "pending"}</td>
                  <td className="px-4 py-3">{order.fulfillmentType ?? "mail"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
