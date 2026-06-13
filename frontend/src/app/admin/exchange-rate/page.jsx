import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminExchangeWorkspace } from "@/components/admin/pages/admin-exchange-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminExchangeRatePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/exchange-rate");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "exchange.view")) {
    return <AccessRestricted requiredPermission="exchange.view" sectionName="Exchange Rate" />;
  }
  const canEdit = can(session.user.permissions, "exchange.edit");

  let exchangeRate = null;
  try {
    const response = await apiRequest("/api/v1/exchange-rate");
    exchangeRate = response?.data ?? null;
  } catch {
    exchangeRate = null;
  }

  return <AdminExchangeWorkspace exchangeRate={exchangeRate} canEdit={canEdit} />;
}
