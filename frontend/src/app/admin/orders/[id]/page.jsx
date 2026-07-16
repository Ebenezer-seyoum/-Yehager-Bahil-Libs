import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { OrderDetailPage } from "@/components/admin/order-detail-page";
import { can, canAny } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";

function isCustomOrder(order) {
  if (order?.orderType === "custom_order" || order?.order_type === "custom_order" || order?.orderType === "custom_design_order") {
    return true;
  }
  return Array.isArray(order?.items) && order.items.some((item) =>
    item?.uploaded_design_id ||
    item?.uploadedDesignId ||
    item?.item_type === "custom_design" ||
    item?.itemType === "custom_design"
  );
}

export default async function AdminOrderDetailPage({ params, searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!canAny(session.user.permissions, ["orders.view", "returns.view"])) {
    return <AccessRestricted requiredPermission="orders.view or returns.view" sectionName="Order Details" />;
  }

  const { id } = await params;
  const query = await searchParams;

  let order = null;
  try {
    const response = await apiRequest(`/api/v1/orders/${id}`);
    order = response?.data ?? response ?? null;
  } catch {
    order = null;
  }

  if (!order) redirect("/admin/orders");

  const openedFromReturns = query?.from === "returns";
  const returnsOnlyAccess = !can(session.user.permissions, "orders.view") && can(session.user.permissions, "returns.view");
  const backUrl = openedFromReturns || returnsOnlyAccess
    ? "/admin/orders/returns-refunds"
    : isCustomOrder(order)
      ? "/admin/custom-orders?tab=orders"
      : "/admin/catalog-orders";

  return <OrderDetailPage initialOrder={order} backUrl={backUrl} />;
}
