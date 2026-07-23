import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminOperationsWorkspace } from "@/components/admin/pages/admin-operations-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminReturnsRefundsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders/returns-refunds");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "returns.view")) {
    return <AccessRestricted requiredPermission="returns.view" sectionName="Returns and Refunds" />;
  }

  let orders: Record<string, unknown>[] = [];
  let support: Record<string, unknown>[] = [];
  try {
    const [ordersResponse, supportResponse] = await Promise.all([
      apiRequest<{ data?: Record<string, unknown>[] }>("/api/v1/orders?limit=200"),
      apiRequest<{ data?: Record<string, unknown>[] }>("/api/v1/admin/support/tickets?category=return_refund&limit=200").catch(() => ({ data: [] })),
    ]);
    orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
    support = Array.isArray(supportResponse?.data) ? supportResponse.data : [];
  } catch {
    orders = [];
    support = [];
  }

  return <AdminOperationsWorkspace mode="returns" data={{ orders, support }} />;
}
