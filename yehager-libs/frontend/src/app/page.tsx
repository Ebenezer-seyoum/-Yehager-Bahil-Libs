import { Globe, Scissors, Star } from "lucide-react";
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
};

export default async function HomePage() {
  const [rateRes, wollegaRes, arsiRes, milaRes] = await Promise.all([
    backendPublicRequest("/api/v1/exchange-rate").catch(() => ({ data: null })),
    backendPublicRequest("/api/v1/products?region=Oromo&sub=Wollega&limit=20").catch(() => ({ data: [] })),
    backendPublicRequest("/api/v1/products?region=Oromo&sub=Arsi&limit=20").catch(() => ({ data: [] })),
    backendPublicRequest("/api/v1/products?region=Mila%27s%20Choice&limit=20").catch(() => ({ data: [] })),
  ]);

  const etbRate = Number(rateRes?.data?.rate ?? 0) || null;
  const products = [...(wollegaRes?.data ?? []), ...(arsiRes?.data ?? []), ...(milaRes?.data ?? [])] as Product[];

  return (
    <div className="overflow-x-hidden">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 sm:py-24">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} etbRate={etbRate} />
          ))}
        </div>
      </section>

      <HomeWhyUs />
    </div>
  );
}
