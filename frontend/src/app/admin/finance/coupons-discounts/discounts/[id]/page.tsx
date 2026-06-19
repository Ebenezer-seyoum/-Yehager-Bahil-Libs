import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { AdminCouponsDiscountsDetailClient, type CouponDiscountRow } from "@/components/admin/pages/admin-coupons-discounts-detail-client";

export default async function AdminDiscountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/finance/coupons-discounts");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "coupons.view")) {
    return <AccessRestricted requiredPermission="coupons.view" sectionName="Discount Details" />;
  }

  const { id } = await params;
  let row: CouponDiscountRow | null = null;
  try {
    const response = await apiRequest<{ data?: { productDiscounts?: CouponDiscountRow[] } }>("/api/v1/admin/discounts");
    row = (response.data?.productDiscounts ?? []).find((discount) => discount.id === id) ?? null;
  } catch {
    row = null;
  }

  if (!row) redirect("/admin/finance/coupons-discounts?tab=discounts");

  return <AdminCouponsDiscountsDetailClient row={row} kind="discounts" />;
}
