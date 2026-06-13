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
  try {
    const response = await apiRequest<{ data?: Record<string, unknown>[] }>("/api/v1/orders?limit=200");
    orders = Array.isArray(response?.data) ? response.data : [];
  } catch {
    orders = [];
  }

  return <AdminOperationsWorkspace mode="returns" data={{ orders }} />;
}
