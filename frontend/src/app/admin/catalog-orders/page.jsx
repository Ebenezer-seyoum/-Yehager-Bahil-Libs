import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminOrdersWorkspace } from "@/components/admin/pages/admin-orders-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

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
    const response = await apiRequest("/api/v1/orders?limit=200&scope=catalog");
    orders = Array.isArray(response?.data) ? response.data : [];
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
