import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminPaymentsWorkspace } from "@/components/admin/pages/admin-payments-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/payments");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "payments.view")) {
    return <AccessRestricted requiredPermission="payments.view" sectionName="Payments" />;
  }

  let orders = [];
  let alerts = [];
  let products = [];
  let users = [];

  try {
    const ordersResponse = await apiRequest("/api/v1/orders?limit=200");
    orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
  } catch {
    orders = [];
  }

  try {
    const alertsResponse = can(session.user.permissions, "alerts.view") ? await apiRequest("/api/v1/admin/alerts?limit=200") : null;
    alerts = Array.isArray(alertsResponse?.data) ? alertsResponse.data : [];
  } catch {
    alerts = [];
  }

  try {
    const productsResponse = can(session.user.permissions, "products.view") ? await apiRequest("/api/v1/admin/products?limit=200") : null;
    products = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
  } catch {
    products = [];
  }

  try {
    const usersResponse = can(session.user.permissions, "employees.view") ? await apiRequest("/api/v1/admin/users?limit=200") : null;
    users = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
  } catch {
    users = [];
  }

  return (
    <AdminPaymentsWorkspace
      data={{
        orders,
        alerts,
        products,
        users,
      }}
    />
  );
}
