import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { CouponsDiscountsCreateClient } from "@/components/admin/coupons-discounts-create-client";

export default async function AdminCreateCouponDiscountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/finance/coupons-discounts/create");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "coupons.edit")) {
    return <AccessRestricted requiredPermission="coupons.edit" sectionName="Create Coupons and Discounts" />;
  }

  let products: Record<string, unknown>[] = [];
  try {
    const response = await apiRequest<{ data?: { products?: Record<string, unknown>[] } }>("/api/v1/admin/discounts");
    products = Array.isArray(response?.data?.products) ? response.data.products : [];
  } catch {
    products = [];
  }

  return <CouponsDiscountsCreateClient products={products} />;
}
