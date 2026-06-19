import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { AdminCouponsDiscountsDetailClient, type CouponDiscountRow } from "@/components/admin/pages/admin-coupons-discounts-detail-client";

export default async function AdminCouponDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/finance/coupons-discounts");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "coupons.view")) {
    return <AccessRestricted requiredPermission="coupons.view" sectionName="Coupon Details" />;
  }

  const { id } = await params;
  let row: CouponDiscountRow | null = null;
  try {
    const response = await apiRequest<{ data?: { coupons?: CouponDiscountRow[] } }>("/api/v1/admin/discounts");
    row = (response.data?.coupons ?? []).find((coupon) => coupon.id === id) ?? null;
  } catch {
    row = null;
  }

  if (!row) redirect("/admin/finance/coupons-discounts?tab=coupons");

  return <AdminCouponsDiscountsDetailClient row={row} kind="coupons" />;
}
