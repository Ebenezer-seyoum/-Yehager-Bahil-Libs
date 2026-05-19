import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminWorkflowPipeline } from "@/components/admin-workflow-pipeline";
import { AdminRevenueCharts } from "@/components/admin-revenue-charts";
import { AdminOverviewCards } from "@/components/admin-overview-cards";

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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Overview</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Business Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Top-level performance, risk, and operating health.</p>
      </div>

      <AdminOverviewCards orders={orders} alerts={alerts} products={products} users={users} />

      <AdminRevenueCharts orders={orders} />
      <AdminWorkflowPipeline orders={orders} />
    </div>
  );
}
