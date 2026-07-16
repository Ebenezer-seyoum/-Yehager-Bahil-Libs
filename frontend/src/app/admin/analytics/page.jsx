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
  const [orders, products, users] = await Promise.all([
    loadList(has("orders.view") || has("payments.view"), "/api/v1/orders?limit=200"),
    loadList(has("products.view"), "/api/v1/admin/products?limit=200"),
    loadList(has("customers.view"), "/api/v1/admin/customers?limit=200"),
  ]);

  return <AdminAnalyticsWorkspace orders={orders} products={products} users={users} />;
}
