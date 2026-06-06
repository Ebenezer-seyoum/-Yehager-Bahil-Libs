import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { AdminProductDetailPanel } from "@/components/admin-product-detail-panel";

function productId(product) {
  return String(product?.id ?? product?._id ?? "");
}

export default async function AdminProductDetailPage({ params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/inventory");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");

  const { id } = await params;
  let product = null;
  try {
    const response = await apiRequest(`/api/v1/admin/products/${id}`);
    const directProduct = response?.data ?? response;
    product = productId(directProduct) ? directProduct : null;
  } catch {
    try {
      const response = await apiRequest("/api/v1/admin/products?limit=1000");
      product = Array.isArray(response?.data) ? response.data.find((item) => productId(item) === id) ?? null : null;
    } catch {
      product = null;
    }
  }

  if (!product) redirect("/admin/inventory");

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <AdminProductDetailPanel product={product} />
    </div>
  );
}
