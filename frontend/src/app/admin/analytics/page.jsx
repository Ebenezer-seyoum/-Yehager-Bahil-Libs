import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminAnalyticsWorkspace } from "@/components/admin/pages/admin-analytics-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export const metadata = {
  title: "Analytics — Admin Dashboard",
  description: "Deep-dive revenue, order, customer and product analytics for your business.",
};

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/analytics");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions ?? [], "dashboard.view")) {
    return <AccessRestricted requiredPermission="dashboard.view" sectionName="Analytics" />;
  }

  let orders = [];
  let products = [];
  let users = [];

  try {
    const [ordersResult, productsResult, usersResult] = await Promise.allSettled([
      apiRequest("/api/v1/orders?limit=200"),
      apiRequest("/api/v1/admin/products?limit=200"),
      apiRequest("/api/v1/admin/users?limit=200"),
    ]);
    
    orders = ordersResult.status === "fulfilled" 
      ? (Array.isArray(ordersResult.value?.data) ? ordersResult.value.data : (Array.isArray(ordersResult.value) ? ordersResult.value : []))
      : [];
    products = productsResult.status === "fulfilled" 
      ? (Array.isArray(productsResult.value?.data) ? productsResult.value.data : (Array.isArray(productsResult.value) ? productsResult.value : []))
      : [];
    users = usersResult.status === "fulfilled" 
      ? (Array.isArray(usersResult.value?.data) ? usersResult.value.data : (Array.isArray(usersResult.value) ? usersResult.value : []))
      : [];
  } catch {
    orders = [];
    products = [];
    users = [];
  }

  return <AdminAnalyticsWorkspace orders={orders} products={products} users={users} />;
}
