import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminProductsWorkspace } from "@/components/admin/pages/admin-products-workspace";
import { AccessRestricted } from "@/components/admin/access-restricted";

export default async function AdminInventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/inventory");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "products.view")) {
    return <AccessRestricted requiredPermission="products.view" sectionName="Inventory" />;
  }
  const canCreate = can(session.user.permissions, "products.create");

  let products = [];
  try {
    const response = await apiRequest("/api/v1/admin/products?limit=200");
    products = Array.isArray(response?.data) ? response.data : [];
  } catch {
    products = [];
  }

  return <AdminProductsWorkspace data={{ products }} canCreate={canCreate} />;
}
