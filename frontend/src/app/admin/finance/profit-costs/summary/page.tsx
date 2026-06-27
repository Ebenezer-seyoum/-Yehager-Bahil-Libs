import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { AllProfitSummaryDetailWorkspace } from "@/components/admin/pages/admin-profit-detail-workspace";

type ProfitCostsPayload = {
  catalogProducts?: unknown[];
  allProfitSummary?: Record<string, unknown> | null;
};

function records(value: unknown) {
  return Array.isArray(value) ? (value.filter((row) => row && typeof row === "object") as Record<string, unknown>[]) : [];
}

export default async function AdminAllProfitSummaryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/finance/profit-costs/summary");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "payments.view")) {
    return <AccessRestricted requiredPermission="payments.view" sectionName="All Profit Summary" />;
  }

  let payload: ProfitCostsPayload = { catalogProducts: [], allProfitSummary: null };
  try {
    const response = await apiRequest<{ data?: ProfitCostsPayload }>("/api/v1/admin/profit-costs");
    payload = response?.data ?? payload;
  } catch {
    payload = { catalogProducts: [], allProfitSummary: null };
  }

  return <AllProfitSummaryDetailWorkspace rows={records(payload.catalogProducts)} summary={payload.allProfitSummary ?? null} />;
}
