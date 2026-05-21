import { backendPublicRequest } from "@/lib/backend-public";
import { ProductCard } from "@/components/product-card";
import { HomeWhyUs } from "@/components/home-why-us";

type Product = {
  id: string;
  name: string;
  region?: string | null;
  subcategory?: string | null;
  images?: string[] | null;
  priceUsd?: number | null;
  uniqueId?: string | null;
};

export default async function HomePage() {
  const [rateRes, productsRes] = await Promise.all([
    backendPublicRequest("/api/v1/exchange-rate").catch(() => ({ data: null })),
    backendPublicRequest("/api/v1/products?limit=200").catch(() => ({ data: [] })),
  ]);

  const etbRate = Number(rateRes?.data?.rate ?? 0) || null;
  const products = (Array.isArray(productsRes?.data) ? productsRes.data : []) as Product[];
  const visibleProducts = products;

  return (
    <div className="overflow-x-hidden">
      <section className="w-full px-6 py-16 sm:px-8 lg:px-12 sm:py-24">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} etbRate={etbRate} />
          ))}
        </div>
      </section>

      <HomeWhyUs />
    </div>
  );
}
