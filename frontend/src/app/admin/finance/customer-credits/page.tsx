import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { AdminCustomerCreditsWorkspace } from "@/components/admin/pages/admin-customer-credits-workspace";

type CustomerCreditsPayload = {
  creditCustomers?: unknown[];
  rules?: unknown[];
  ledgerEntries?: unknown[];
  activeRule?: Record<string, unknown> | null;
};

export default async function AdminCustomerCreditsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/finance/customer-credits");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "payments.view")) {
    return <AccessRestricted requiredPermission="payments.view" sectionName="Customer Credits" />;
  }

  let payload: any = {
    creditCustomers: [],
    creditRules: [],
    ledgerEntries: [],
    activeCreditRule: null,
  };

  try {
    const response = await apiRequest<{ data?: CustomerCreditsPayload }>("/api/v1/admin/customer-credits");
    payload = response?.data ?? payload;
  } catch {
    payload = {
      creditCustomers: [],
      creditRules: [],
      ledgerEntries: [],
      activeCreditRule: null,
    };
  }

  return (
    <AdminCustomerCreditsWorkspace
      data={{
        creditCustomers: Array.isArray(payload.creditCustomers) ? payload.creditCustomers : [],
        creditRules: Array.isArray(payload.rules) ? payload.rules : [],
        ledgerEntries: Array.isArray(payload.ledgerEntries) ? payload.ledgerEntries : [],
        activeCreditRule: payload.activeRule ?? null,
      }}
      canManage={can(session.user.permissions, "payments.verify")}
    />
  );
}
