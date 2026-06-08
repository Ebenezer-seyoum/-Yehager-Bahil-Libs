import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { ProductCreateClient } from "@/components/admin/product-create-client";

export default async function CreateProductPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/inventory/create");
  if (session.user.role !== "admin") redirect("/admin/inventory");

  return <ProductCreateClient />;
}
