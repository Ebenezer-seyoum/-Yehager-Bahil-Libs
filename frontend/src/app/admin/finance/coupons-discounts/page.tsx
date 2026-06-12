import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminOperationsWorkspace } from "@/components/admin/pages/admin-operations-workspace";

export default async function AdminCouponsDiscountsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/finance/coupons-discounts");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  let orders: Record<string, unknown>[] = [];
  let products: Record<string, unknown>[] = [];
  try {
    const [ordersResponse, productsResponse] = await Promise.all([
      apiRequest<{ data?: Record<string, unknown>[] }>("/api/v1/orders?limit=200"),
      apiRequest<{ data?: Record<string, unknown>[] }>("/api/v1/admin/products?limit=200"),
    ]);
    orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
    products = Array.isArray(productsResponse?.data) ? productsResponse.data : [];
  } catch {
    orders = [];
    products = [];
  }

  return <AdminOperationsWorkspace mode="coupons" data={{ orders, products }} />;
}
