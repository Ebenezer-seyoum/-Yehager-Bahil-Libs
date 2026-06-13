import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminOperationsWorkspace } from "@/components/admin/pages/admin-operations-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminCouponsDiscountsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/finance/coupons-discounts");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "coupons.view")) {
    return <AccessRestricted requiredPermission="coupons.view" sectionName="Coupons and Discounts" />;
  }

  let orders: Record<string, unknown>[] = [];
  let products: Record<string, unknown>[] = [];
  try {
    const ordersResponse = can(session.user.permissions, "orders.view")
      ? await apiRequest<{ data?: Record<string, unknown>[] }>("/api/v1/orders?limit=200")
      : null;
    orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
  } catch {
    orders = [];
  }

  try {
    const productsResponse = can(session.user.permissions, "products.view")
      ? await apiRequest<{ data?: Record<string, unknown>[] }>("/api/v1/admin/products?limit=200")
      : null;
    products = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
  } catch {
    products = [];
  }

  return <AdminOperationsWorkspace mode="coupons" data={{ orders, products }} />;
}
