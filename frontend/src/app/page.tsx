import { backendPublicRequest } from "@/lib/backend-public";
import { HomeCatalogSections } from "@/components/home-catalog-sections";
import { HomeWhyUs } from "@/components/home-why-us";
import { REGIONS, TAXONOMY } from "@/lib/taxonomy";

type Product = {
  id: string;
  name: string;
  region?: string | null;
  subcategory?: string | null;
  images?: string[] | null;
  priceUsd?: number | null;
  uniqueId?: string | null;
};

type HomepageSection = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  collections?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    sortOrder: number;
  }>;
  subsections?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    sortOrder: number;
  }>;
};

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildSectionsFromProducts(products: Product[]): HomepageSection[] {
  const grouped = new Map<string, Set<string>>();

  products.forEach((product) => {
    const region = product.region?.trim();
    if (!region) return;
    const collections = grouped.get(region) ?? new Set<string>();
    const subcategory = product.subcategory?.trim();
    if (subcategory) collections.add(subcategory);
    grouped.set(region, collections);
  });

  if (grouped.size > 0) {
    const regionOrder = new Map(REGIONS.map((region, index) => [region, index]));
    return Array.from(grouped.entries())
      .sort(([a], [b]) => (regionOrder.get(a) ?? 999) - (regionOrder.get(b) ?? 999) || a.localeCompare(b))
      .map(([name, collections], index) => ({
        id: `product-${toSlug(name)}`,
        name,
        slug: toSlug(name),
        isActive: true,
        sortOrder: index,
        collections: Array.from(collections)
          .sort()
          .map((collection, collectionIndex) => ({
            id: `product-${toSlug(name)}-${toSlug(collection)}`,
            name: collection,
            isActive: true,
            sortOrder: collectionIndex,
          })),
      }));
  }

  return REGIONS.map((name, index) => ({
    id: `fallback-${toSlug(name)}`,
    name,
    slug: toSlug(name),
    isActive: true,
    sortOrder: index,
    collections: (TAXONOMY[name] ?? []).map((collection, collectionIndex) => ({
      id: `fallback-${toSlug(name)}-${toSlug(collection)}`,
      name: collection,
      isActive: true,
      sortOrder: collectionIndex,
    })),
  }));
}

export default async function HomePage() {
  const [rateRes, productsRes, sectionsRes] = await Promise.all([
    backendPublicRequest("/api/v1/exchange-rate").catch(() => ({ data: null })),
    backendPublicRequest("/api/v1/products?limit=200").catch(() => ({ data: [] })),
    backendPublicRequest("/api/v1/products/sections").catch(() => ({ data: [] })),
  ]);

  const etbRate = Number(rateRes?.data?.rate ?? 0) || null;
  const products = (Array.isArray(productsRes?.data) ? productsRes.data : []) as Product[];
  const apiSections = (Array.isArray(sectionsRes?.data) ? sectionsRes.data : []) as HomepageSection[];
  const sections = apiSections.some((section) => section.isActive) ? apiSections : buildSectionsFromProducts(products);

  return (
    <div className="home-modern overflow-x-hidden">
      <HomeCatalogSections sections={sections} products={products} etbRate={etbRate} />
      <HomeWhyUs />
    </div>
  );
}
