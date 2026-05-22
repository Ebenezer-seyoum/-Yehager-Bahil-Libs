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
    <div className="home-modern overflow-x-hidden">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} etbRate={etbRate} />
          ))}
        </div>
      </section>

      <HomeWhyUs />
    </div>
  );
}
