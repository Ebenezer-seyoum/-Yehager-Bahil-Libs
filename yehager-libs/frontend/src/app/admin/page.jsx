import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminWorkflowPipeline } from "@/components/admin-workflow-pipeline";
import { AdminRevenueCharts } from "@/components/admin-revenue-charts";

function formatCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin");
  if (session.user.role !== "admin") redirect("/");

  let orders = [];
  let alerts = [];
  let products = [];
  let users = [];
  try {
    const [ordersResponse, alertsResponse, productsResponse, usersResponse] = await Promise.all([
      apiRequest("/api/v1/orders?limit=200"),
      apiRequest("/api/v1/admin/alerts?limit=200"),
      apiRequest("/api/v1/admin/products?limit=200"),
      apiRequest("/api/v1/admin/users?limit=200"),
    ]);
    orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
    alerts = Array.isArray(alertsResponse?.data) ? alertsResponse.data : [];
    products = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
    users = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
  } catch {
    orders = [];
    alerts = [];
    products = [];
    users = [];
  }

  const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
  const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.totalUsd ?? 0), 0);
  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const activeAlerts = alerts.filter((alert) => !alert.isResolved).length;
  const activeProducts = products.filter((product) => product.isActive).length;
  const customers = users.filter((user) => user.role === "customer").length;
  const employees = users.filter((user) => user.role === "employee").length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Overview</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Business Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Top-level performance, risk, and operating health.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total revenue", formatCurrency(totalRevenue)],
          ["Total orders", orders.length],
          ["Customers", customers],
          ["Employees", employees],
          ["Active products", activeProducts],
          ["Pending orders", pendingOrders],
          ["Paid orders", paidOrders.length],
          ["Active alerts", activeAlerts],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <AdminRevenueCharts orders={orders} />
      <AdminWorkflowPipeline orders={orders} />
    </div>
  );
}
