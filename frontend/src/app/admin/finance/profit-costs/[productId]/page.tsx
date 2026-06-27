import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { ProductProfitDetailWorkspace, type ProductProfitRow } from "@/components/admin/pages/admin-profit-detail-workspace";

type ProfitCostsPayload = {
  catalogProducts?: unknown[];
};

function records(value: unknown) {
  return Array.isArray(value) ? (value.filter((row) => row && typeof row === "object") as Record<string, unknown>[]) : [];
}

export default async function AdminProductProfitDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const session = await getServerSession(authOptions);
  const { productId } = await params;
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/admin/finance/profit-costs/${productId}`);
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "payments.view")) {
    return <AccessRestricted requiredPermission="payments.view" sectionName="Product Profit Details" />;
  }

  let payload: ProfitCostsPayload = { catalogProducts: [] };
  try {
    const response = await apiRequest<{ data?: ProfitCostsPayload }>("/api/v1/admin/profit-costs");
    payload = response?.data ?? payload;
  } catch {
    payload = { catalogProducts: [] };
  }

  const row = records(payload.catalogProducts).find((item) => item.entityId === productId);
  if (!row) redirect("/admin/finance/profit-costs");

  return <ProductProfitDetailWorkspace row={row as ProductProfitRow} />;
}
