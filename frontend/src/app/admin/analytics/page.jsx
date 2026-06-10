import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminAnalyticsWorkspace } from "@/components/admin/pages/admin-analytics-workspace";

export const metadata = {
  title: "Analytics — Admin Dashboard",
  description: "Deep-dive revenue, order, customer and product analytics for your business.",
};

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/analytics");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions ?? [], "dashboard.view")) redirect("/admin");

  let orders = [];
  let products = [];
  let users = [];

  try {
    const [ordersRes, productsRes, usersRes] = await Promise.all([
      apiRequest("/api/v1/orders?limit=500"),
      apiRequest("/api/v1/admin/products?limit=500"),
      apiRequest("/api/v1/admin/users?limit=500"),
    ]);
    orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
    products = Array.isArray(productsRes?.data) ? productsRes.data : [];
    users = Array.isArray(usersRes?.data) ? usersRes.data : [];
  } catch {
    orders = [];
    products = [];
    users = [];
  }

  return <AdminAnalyticsWorkspace orders={orders} products={products} users={users} />;
}
