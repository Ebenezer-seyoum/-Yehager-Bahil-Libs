import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminDashboardWorkspace } from "@/components/admin/pages/admin-dashboard-workspace";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (session.user.role === "employee" && !can(session.user.permissions, "dashboard.view")) {
    return (
      <AccessRestricted
        requiredPermission="dashboard.view"
        sectionName="Dashboard"
        description="Your employee account is active, but dashboard access has not been assigned yet. Please contact your administrator, then refresh this page."
      />
    );
  }

  const isAdmin = session.user.role === "admin";
  const has = (permission) => isAdmin || can(session.user.permissions, permission);
  const loadList = async (enabled, path) => {
    if (!enabled) return [];
    try {
      const response = await apiRequest(path);
      return Array.isArray(response?.data) ? response.data : [];
    } catch {
      return [];
    }
  };

  const [orders, alerts, products, users, support] = await Promise.all([
    loadList(has("orders.view") || has("payments.view"), "/api/v1/orders?limit=200"),
    loadList(has("alerts.view"), "/api/v1/admin/alerts?limit=200"),
    loadList(has("products.view"), "/api/v1/admin/products?limit=200"),
    loadList(has("customers.view"), "/api/v1/admin/customers?limit=200"),
    loadList(has("support.view"), "/api/v1/admin/support/tickets?limit=100"),
  ]);

  return (
    <AdminDashboardWorkspace
      data={{
        orders,
        alerts,
        products,
        users,
        support,
      }}
    />
  );
}
