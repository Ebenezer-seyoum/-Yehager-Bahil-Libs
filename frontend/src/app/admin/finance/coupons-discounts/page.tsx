import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminCouponsDiscountsWorkspace } from "@/components/admin/pages/admin-coupons-discounts-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminCouponsDiscountsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/finance/coupons-discounts");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "coupons.view")) {
    return <AccessRestricted requiredPermission="coupons.view" sectionName="Coupons and Discounts" />;
  }

  let payload: Record<string, unknown> = { productDiscounts: [], coupons: [], products: [] };
  try {
    const response = await apiRequest<{ data?: Record<string, unknown> }>("/api/v1/admin/discounts");
    payload = response?.data ?? payload;
  } catch {
    payload = { productDiscounts: [], coupons: [], products: [] };
  }

  return <AdminCouponsDiscountsWorkspace data={payload} canEdit={can(session.user.permissions, "coupons.edit")} />;
}
