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
    <AdminDashboardWorkspace
      data={{
        orders,
        alerts,
        products,
        users,
      }}
    />
  );
}
