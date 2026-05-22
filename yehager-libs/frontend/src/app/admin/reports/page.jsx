import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import AdminReportsDashboard from "@/components/admin-reports-dashboard";

async function safeApiRequest(path, fallback) {
  try {
    const response = await apiRequest(path);
    return response?.data ?? fallback;
  } catch {
    return fallback;
  }
}

export default async function AdminReportsPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/reports");
  if (session.user.role !== "admin") redirect("/");

  const query = (await searchParams) ?? {};
  const initialReportKey = ["orders", "sales", "delivery", "product", "customer", "financial", "employee", "support", "marketing", "activity"].includes(query.report)
    ? query.report
    : "orders";

  const [ordersReport, products, users, alerts, auditLogs] = await Promise.all([
    safeApiRequest("/api/v1/admin/reports/orders", { rows: [], summary: { totalOrders: 0, paidOrders: 0, pendingOrders: 0, totalRevenue: 0 } }),
    safeApiRequest("/api/v1/admin/products?limit=200", []),
    safeApiRequest("/api/v1/admin/users?limit=200", []),
    safeApiRequest("/api/v1/admin/alerts?limit=200", []),
    safeApiRequest("/api/v1/admin/audit?limit=200", []),
  ]);

  const reports = {
    orders: ordersReport,
    sales: ordersReport,
    delivery: ordersReport,
    financial: ordersReport,
    product: { rows: products, summary: {} },
    customer: { rows: users, summary: {} },
    employee: { rows: users, summary: {} },
    support: { rows: alerts, summary: {} },
    marketing: { rows: auditLogs, summary: {} },
    activity: { rows: auditLogs, summary: {} },
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <AdminReportsDashboard reports={reports} initialReportKey={initialReportKey} />
    </div>
  );
}
