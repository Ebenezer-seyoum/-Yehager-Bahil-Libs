import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { OrderDetailPage } from "@/components/admin/order-detail-page";

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

export default async function AdminOrderDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/orders");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  const { id } = await params;

  let order = null;
  try {
    const response = await apiRequest(`/api/v1/orders/${id}`);
    order = response?.data ?? response ?? null;
  } catch {
    order = null;
  }

  if (!order) redirect("/admin/orders");

  const backUrl = isCustomOrder(order) ? "/admin/custom-orders?tab=orders" : "/admin/catalog-orders";

  return <OrderDetailPage initialOrder={order} backUrl={backUrl} />;
}
