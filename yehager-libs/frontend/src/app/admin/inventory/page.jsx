import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminProductManager } from "@/components/admin-product-manager";

export default async function AdminInventoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/inventory");
  if (session.user.role !== "admin") redirect("/");

  let products = [];
  try {
    const response = await apiRequest("/api/v1/admin/products?limit=200");
    products = Array.isArray(response?.data) ? response.data : [];
  } catch {
    products = [];
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Catalog</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Product Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create products, assign sections and subsections, preview multiple product images, and manage storefront visibility.
        </p>
      </div>
      <AdminProductManager initialProducts={products} />
    </div>
  );
}
