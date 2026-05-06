import Link from "next/link";
import { RoutePlaceholder } from "@/components/route-placeholder";
import { backendPublicRequest } from "@/lib/backend-public";

export default async function CatalogPage({ searchParams }) {
  let products = [];
  const query = new URLSearchParams();
  if (searchParams?.region) query.set("region", searchParams.region);
  if (searchParams?.category) query.set("category", searchParams.category);
  if (searchParams?.sub) query.set("sub", searchParams.sub);
  if (searchParams?.gender && searchParams.gender !== "all") query.set("gender", searchParams.gender);
  if (searchParams?.featured) query.set("featured", searchParams.featured);
  query.set("limit", "120");

  try {
    const response = await backendPublicRequest(`/api/v1/products?${query.toString()}`);
    products = Array.isArray(response?.data) ? response.data : [];
  } catch {
    return (
      <RoutePlaceholder
        title="Product Catalog (API unavailable)"
        path="/catalog"
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-primary">Catalog</p>
        <h1 className="font-heading text-4xl font-semibold">Collections</h1>
        <p className="mt-2 text-sm text-muted-foreground">{products.length} piece(s) available</p>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-muted-foreground">No products found.</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/60"
            >
              <div className="aspect-3/4 bg-secondary">
                {product.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="space-y-1 p-3">
                <p className="line-clamp-1 text-sm font-medium text-card-foreground group-hover:text-primary">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.region}</p>
                <p className="text-sm font-semibold text-primary">${Number(product.priceUsd ?? 0).toFixed(2)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
