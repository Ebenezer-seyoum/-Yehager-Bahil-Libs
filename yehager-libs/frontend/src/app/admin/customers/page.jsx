import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default async function AdminCustomersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/customers");
  if (session.user.role !== "admin") redirect("/");

  let users = [];
  let orders = [];
  try {
    const [usersResponse, ordersResponse] = await Promise.all([
      apiRequest("/api/v1/admin/users?limit=200"),
      apiRequest("/api/v1/orders?limit=200"),
    ]);
    users = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
    orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
  } catch {
    users = [];
    orders = [];
  }

  const customers = users
    .filter((user) => user.role === "customer")
    .map((customer) => {
      const customerOrders = orders.filter((order) => order.userEmail === customer.email);
      return {
        ...customer,
        totalOrders: customerOrders.length,
        totalSpent: customerOrders.reduce((sum, order) => sum + Number(order.totalUsd ?? 0), 0),
      };
    });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">People</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Customer Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">View customers and their order history at a glance.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Orders</th>
              <th className="px-4 py-3 font-medium">Total spent</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-5 text-muted-foreground">
                  No customers found.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium">{customer.name ?? "Unnamed customer"}</p>
                    <p className="text-xs text-muted-foreground">{customer.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{customer.status}</td>
                  <td className="px-4 py-3">{customer.totalOrders}</td>
                  <td className="px-4 py-3 text-primary">{formatCurrency(customer.totalSpent)}</td>
                  <td className="px-4 py-3">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
