import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminOrdersWorkspace } from "@/components/admin/pages/admin-orders-workspace";

export default async function AdminOrdersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  const selectedOrderId = typeof searchParams?.order === "string" ? searchParams.order : null;
  const initialOrderType = typeof searchParams?.type === "string" ? searchParams.type : null;

  let orders = [];
  try {
    const response = await apiRequest("/api/v1/orders?limit=200");
    orders = Array.isArray(response?.data) ? response.data : [];
  } catch {
    orders = [];
  }

  return <AdminOrdersWorkspace data={{ orders }} initialSelectedOrderId={selectedOrderId} initialOrderType={initialOrderType} />;
}
