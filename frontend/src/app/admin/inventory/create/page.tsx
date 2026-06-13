import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { ProductCreateClient } from "@/components/admin/product-create-client";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { can } from "@/lib/permissions";

export default async function CreateProductPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/inventory/create");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "products.create")) {
    return <AccessRestricted requiredPermission="products.create" sectionName="Product Create" />;
  }

  return <ProductCreateClient />;
}
