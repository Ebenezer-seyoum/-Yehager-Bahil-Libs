import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { AdminShippingDeliveryDetailWorkspace } from "@/components/admin/pages/admin-shipping-delivery-detail-workspace";

export default async function AdminShippingDeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders/shipping-delivery");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "shipping.view")) {
    return <AccessRestricted requiredPermission="shipping.view" sectionName="Shipping and Delivery" />;
  }

  const { id } = await params;
  let order: Record<string, unknown> | null = null;
  try {
    const response = await apiRequest<{ data?: Record<string, unknown> }>(`/api/v1/orders/${id}`);
    order = response?.data ?? null;
  } catch {
    order = null;
  }

  if (!order) redirect("/admin/orders/shipping-delivery");

  return <AdminShippingDeliveryDetailWorkspace initialOrder={order} />;
}
