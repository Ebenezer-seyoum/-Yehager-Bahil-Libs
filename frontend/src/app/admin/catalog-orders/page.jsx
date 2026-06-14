import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminOrdersWorkspace } from "@/components/admin/pages/admin-orders-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

function hasUploadedDesign(order) {
  return Array.isArray(order?.items)
    ? order.items.some((item) => item?.uploaded_design_id || item?.uploadedDesignId || item?.item_type === "custom_design" || item?.itemType === "custom_design")
    : false;
}

function isCatalogOrder(order) {
  const type = order?.orderType ?? "catalog_order";
  if (type === "custom_order" || type === "custom_design_order") return false;
  if (type === "group_order") return !hasUploadedDesign(order);
  return true;
}

export default async function AdminCatalogOrdersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/catalog-orders");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "orders.view")) {
    return <AccessRestricted requiredPermission="orders.view" sectionName="Catalog Orders" />;
  }

  const selectedOrderId = typeof searchParams?.order === "string" ? searchParams.order : null;

  let orders = [];
  try {
    const response = await apiRequest("/api/v1/orders?limit=200");
    const allOrders = Array.isArray(response?.data) ? response.data : [];
    orders = allOrders.filter(isCatalogOrder);
  } catch {
    orders = [];
  }

  return (
    <AdminOrdersWorkspace
      data={{ orders }}
      initialSelectedOrderId={selectedOrderId}
      lockedOrderType="catalog_order"
      title="Catalog Orders"
      subtitle="Manage real orders created from catalog products."
    />
  );
}
