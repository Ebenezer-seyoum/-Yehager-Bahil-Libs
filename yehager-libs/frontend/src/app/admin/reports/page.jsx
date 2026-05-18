import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminRevenueCharts } from "@/components/admin-revenue-charts";

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/reports");
  if (session.user.role !== "admin") redirect("/");

  let orders = [];
  try {
    const response = await apiRequest("/api/v1/orders?limit=200");
    orders = Array.isArray(response?.data) ? response.data : [];
  } catch {
    orders = [];
  }

  const byStatus = Object.entries(
    orders.reduce((map, order) => {
      const key = order.status ?? "unknown";
      map[key] = (map[key] ?? 0) + 1;
      return map;
    }, {}),
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Insights</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">A first reporting workspace; export-grade filtering comes next.</p>
      </div>
      <AdminRevenueCharts orders={orders} />
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Orders by status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {byStatus.map(([status, count]) => (
            <div key={status} className="rounded-xl bg-secondary p-4">
              <p className="text-2xl font-semibold">{count}</p>
              <p className="mt-1 text-sm capitalize text-muted-foreground">{status.replaceAll("_", " ")}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
