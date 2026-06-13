import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminCustomersWorkspace } from "@/components/admin/pages/admin-customers-workspace";
import { DashboardNotice } from "@/components/admin/dashboard-notice";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminCustomersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/customers");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "customers.view")) {
    return <AccessRestricted requiredPermission="customers.view" sectionName="Customer" />;
  }

  const query = (await searchParams) ?? {};
  const canCreate = can(session.user.permissions, "customers.create");

  let users = [];
  let orders = [];
  let alerts = [];

  // Fetch users
  try {
    const usersResponse = await apiRequest("/api/v1/admin/customers?limit=200");
    users = Array.isArray(usersResponse?.data) ? usersResponse.data : [];
  } catch (err) {
    console.error("Failed to fetch users for admin customers page:", err);
  }

  // Fetch orders
  try {
    const ordersResponse = await apiRequest("/api/v1/orders?limit=200");
    orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
  } catch (err) {
    console.error("Failed to fetch orders for admin customers page:", err);
  }

  // Fetch alerts
  try {
    const alertsResponse = await apiRequest("/api/v1/admin/alerts?limit=200");
    alerts = Array.isArray(alertsResponse?.data) ? alertsResponse.data : [];
  } catch (err) {
    console.error("Failed to fetch alerts for admin customers page:", err);
  }

  const customers = users
    .filter((user) => user.role === "customer")
    .map((customer) => {
      const customerOrders = orders.filter((order) => order.userEmail === customer.email);
      const lastOrder = [...customerOrders].sort((a, b) => new Date(String(b.createdAt ?? b.orderDate ?? 0)).getTime() - new Date(String(a.createdAt ?? a.orderDate ?? 0)).getTime())[0] ?? null;
      return {
        ...customer,
        totalOrders: customerOrders.length,
        totalSpent: customerOrders.reduce((sum, order) => sum + Number(order.totalUsd ?? 0), 0),
        orderCount: customerOrders.length,
        lastOrderAt: lastOrder?.createdAt ?? lastOrder?.orderDate ?? null,
      };
    });

  return (
    <div className="space-y-4">
      {query.created === "1" ? (
        <DashboardNotice tone="success">Success! Customer account created.</DashboardNotice>
      ) : null}
      {query.updated ? (
        <DashboardNotice tone="success">Success! Customer information updated.</DashboardNotice>
      ) : null}
      {query.deleted === "1" ? (
        <DashboardNotice tone="success">Success! Customer was deleted.</DashboardNotice>
      ) : null}
      {query.error && query.tab !== "create" ? (
        <DashboardNotice tone="error">Error! Please review the customer details and try again.</DashboardNotice>
      ) : null}

      <AdminCustomersWorkspace data={{ users: customers, orders, alerts }} canCreate={canCreate} />
    </div>
  );
}
