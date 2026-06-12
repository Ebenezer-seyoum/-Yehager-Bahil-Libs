import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminOperationsWorkspace } from "@/components/admin/pages/admin-operations-workspace";

export default async function AdminReturnsRefundsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders/returns-refunds");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  let orders: Record<string, unknown>[] = [];
  try {
    const response = await apiRequest<{ data?: Record<string, unknown>[] }>("/api/v1/orders?limit=200");
    orders = Array.isArray(response?.data) ? response.data : [];
  } catch {
    orders = [];
  }

  return <AdminOperationsWorkspace mode="returns" data={{ orders }} />;
}
