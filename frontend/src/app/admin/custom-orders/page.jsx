import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminCustomOrdersWorkspace } from "@/components/admin/pages/admin-custom-orders-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

function hasUploadedDesign(order) {
  return Array.isArray(order?.items)
    ? order.items.some((item) => item?.uploaded_design_id || item?.uploadedDesignId || item?.item_type === "custom_design" || item?.itemType === "custom_design")
    : false;
}

function isCustomOrder(order) {
  const type = order?.orderType ?? "catalog_order";
  if (type === "custom_order" || type === "custom_design_order") return true;
  if (type === "group_order") return hasUploadedDesign(order);
  return false;
}

export default async function AdminCustomOrdersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/custom-orders");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "uploaded_designs.view") && !can(session.user.permissions, "orders.view")) {
    return <AccessRestricted requiredPermission="uploaded_designs.view" sectionName="Custom Orders" />;
  }

  let uploadedDesigns = [];
  let orders = [];
  try {
    const [designsResponse, ordersResponse] = await Promise.all([
      can(session.user.permissions, "uploaded_designs.view")
        ? apiRequest("/api/v1/uploaded-designs/admin?limit=200")
        : Promise.resolve({ data: [] }),
      can(session.user.permissions, "orders.view")
        ? apiRequest("/api/v1/orders?limit=200")
        : Promise.resolve({ data: [] }),
    ]);
    uploadedDesigns = Array.isArray(designsResponse?.data) ? designsResponse.data : [];
    const allOrders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
    orders = allOrders.filter(isCustomOrder);
  } catch {
    uploadedDesigns = [];
    orders = [];
  }

  const initialTab = typeof searchParams?.tab === "string" ? searchParams.tab : null;

  return <AdminCustomOrdersWorkspace data={{ uploadedDesigns, orders }} initialTab={initialTab} />;
}
