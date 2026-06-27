import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { AdminProfitCostsWorkspace } from "@/components/admin/pages/admin-profit-costs-workspace";

type ProfitCostsPayload = {
  defaults?: Record<string, unknown> | null;
  catalogProducts?: unknown[];
  allProfitSummary?: Record<string, unknown> | null;
  customOrders?: unknown[];
  designerPayments?: unknown[];
};

function records(value: unknown) {
  return Array.isArray(value) ? (value.filter((row) => row && typeof row === "object") as Record<string, unknown>[]) : [];
}

export default async function AdminProfitCostsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/finance/profit-costs");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "payments.view")) {
    return <AccessRestricted requiredPermission="payments.view" sectionName="Profit & Costs" />;
  }

  let payload: ProfitCostsPayload = {
    defaults: null,
    catalogProducts: [],
    allProfitSummary: null,
    customOrders: [],
    designerPayments: [],
  };

  try {
    const response = await apiRequest<{ data?: ProfitCostsPayload }>("/api/v1/admin/profit-costs");
    payload = response?.data ?? payload;
  } catch {
    payload = {
      defaults: null,
      catalogProducts: [],
      allProfitSummary: null,
      customOrders: [],
      designerPayments: [],
    };
  }

  return (
    <AdminProfitCostsWorkspace
      data={{
        profitDefaults: payload.defaults ?? null,
        allProfitSummary: payload.allProfitSummary ?? null,
        catalogProfitRows: records(payload.catalogProducts),
        customProfitRows: records(payload.customOrders),
        designerPayments: records(payload.designerPayments),
      }}
      canManage={can(session.user.permissions, "payments.verify")}
    />
  );
}
