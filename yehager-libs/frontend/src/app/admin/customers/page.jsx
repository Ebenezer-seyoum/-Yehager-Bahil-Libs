import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminCustomersWorkspace } from "@/components/admin/pages/admin-customers-workspace";

export default async function AdminCustomersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/customers");
  if (session.user.role !== "admin") redirect("/");

  const query = (await searchParams) ?? {};

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
        orderCount: customerOrders.length,
      };
    });

  return (
    <div className="space-y-4">
      {query.created === "1" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
          Success — customer account created.
        </div>
      ) : null}
      {query.updated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
          Success — customer information updated.
        </div>
      ) : null}
      {query.deleted === "1" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
          Success — customer was deleted.
        </div>
      ) : null}
      {query.error && query.tab !== "create" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">
          Action failed — please review the customer details and try again.
        </div>
      ) : null}

      <AdminCustomersWorkspace data={{ users: customers, orders, alerts: [] }} />
    </div>
  );
}
