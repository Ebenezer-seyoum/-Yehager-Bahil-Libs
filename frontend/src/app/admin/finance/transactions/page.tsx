import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminOperationsWorkspace } from "@/components/admin/pages/admin-operations-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminTransactionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/finance/transactions");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "transactions.view")) {
    return <AccessRestricted requiredPermission="transactions.view" sectionName="Transactions" />;
  }

  let orders: Record<string, unknown>[] = [];
  try {
    const response = await apiRequest<{ data?: Record<string, unknown>[] }>("/api/v1/orders?limit=200");
    orders = Array.isArray(response?.data) ? response.data : [];
  } catch {
    orders = [];
  }

  return <AdminOperationsWorkspace mode="transactions" data={{ orders }} />;
}
