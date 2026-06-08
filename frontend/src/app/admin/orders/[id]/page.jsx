import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { OrderDetailPage } from "@/components/admin/order-detail-page";

export default async function AdminOrderDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  const { id } = await params;

  let order = null;
  try {
    const response = await apiRequest(`/api/v1/orders/${id}`);
    order = response?.data ?? response ?? null;
  } catch {
    order = null;
  }

  if (!order) redirect("/admin/orders");

  return <OrderDetailPage initialOrder={order} backUrl="/admin/orders" />;
}
