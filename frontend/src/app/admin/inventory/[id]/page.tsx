import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { ProductDetailClient } from "@/components/admin/product-detail-client";

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/admin/inventory/${params.id}`);
  if (session.user.role !== "admin") redirect("/admin/inventory");

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const cookie = `next-auth.session-token=${(session.user as any).accessToken || ""}`;

  const res = await fetch(`${baseUrl}/api/backend/admin/products/${params.id}`, { 
    headers: { Cookie: cookie },
    next: { tags: [`product-${params.id}`] }
  }).catch(() => null);

  const productData = res && res.ok ? await res.json() : null;

  if (!productData?.data) {
    redirect("/admin/inventory");
  }

  return (
    <ProductDetailClient
      initialProduct={productData.data}
    />
  );
}
