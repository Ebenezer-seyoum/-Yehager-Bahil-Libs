"use client";

import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { ProductCard } from "@/components/product-card";

type Product = {
  id: string;
  name: string;
  region?: string | null;
  subcategory?: string | null;
  images?: string[] | null;
  priceUsd?: number | null;
  uniqueId?: string | null;
};

type HomepageCollection = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

type HomepageSection = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  collections?: HomepageCollection[];
  subsections?: HomepageCollection[];
};

function sampleSize(total: number) {
  return Math.max(1, Math.ceil(total * 0.25));
}

function randomSample<T>(items: T[], count: number) {
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}

export function HomeCatalogSections({
  products,
  etbRate,
}: {
  sections: HomepageSection[];
  products: Product[];
  etbRate?: number | null;
}) {
  const visibleCount = useMemo(() => sampleSize(products.length), [products.length]);
  const initialProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    if (!products.length) return;

    const startId = window.setTimeout(() => {
      setDisplayedProducts(randomSample(products, visibleCount));
    }, 0);
    const intervalId = window.setInterval(() => {
      setDisplayedProducts(randomSample(products, visibleCount));
    }, 30000);
    return () => {
      window.clearTimeout(startId);
      window.clearInterval(intervalId);
    };
  }, [products, visibleCount]);

  if (!products.length) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 text-2xl font-semibold">Products are being prepared</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please check back soon for new catalog items.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 sm:py-14">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {displayedProducts.map((product) => (
          <ProductCard key={product.id} product={product} etbRate={etbRate} />
        ))}
      </div>
    </section>
  );
}
