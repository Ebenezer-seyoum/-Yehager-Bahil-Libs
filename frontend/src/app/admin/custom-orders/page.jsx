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
  const isAdmin = session.user.role === "admin";
  const canViewRequests = isAdmin || can(session.user.permissions, "uploaded_designs.view");
  const canViewOrders = isAdmin || can(session.user.permissions, "orders.view");
  if (!canViewRequests && !canViewOrders) {
    return <AccessRestricted requiredPermission="uploaded_designs.view" sectionName="Custom Orders" />;
  }

  let uploadedDesigns = [];
  let orders = [];
  const [designsResponse, ordersResponse] = await Promise.all([
    canViewRequests
      ? apiRequest("/api/v1/uploaded-designs/admin?limit=200").catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] }),
    canViewOrders
      ? apiRequest("/api/v1/orders?limit=200").catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] }),
  ]);
  uploadedDesigns = Array.isArray(designsResponse?.data) ? designsResponse.data : [];
  const allOrders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
  orders = allOrders.filter(isCustomOrder);

  const requestedTab = typeof searchParams?.tab === "string" ? searchParams.tab : null;
  const initialTab = requestedTab === "orders" && canViewOrders
    ? "orders"
    : canViewRequests
      ? "requests"
      : "orders";

  return (
    <AdminCustomOrdersWorkspace
      data={{ uploadedDesigns, orders }}
      initialTab={initialTab}
      canViewRequests={canViewRequests}
      canViewOrders={canViewOrders}
      canReviewRequests={isAdmin || can(session.user.permissions, "uploaded_designs.review")}
    />
  );
}
