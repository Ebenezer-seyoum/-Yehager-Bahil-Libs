import Link from "next/link";
import { backendPublicRequest } from "@/lib/backend-public";
import { ProductCard } from "@/components/product-card";
import { CatalogLabels } from "@/components/catalog-labels";
import { collectionNamesForRegion, normalizePublicRegions, type PublicRegion } from "@/lib/public-collections";

type SearchParams = Record<string, string | string[] | undefined>;

type Product = {
  id: string;
  name: string;
  region?: string | null;
  subcategory?: string | null;
  gender?: string | null;
  images?: string[] | null;
  priceUsd?: number | null;
};

function asString(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

function makeHref(region: string | null, sub: string | null, gender: string | null, eventId: string | null, groupId: string | null, selectionMode: string | null) {
  const q = new URLSearchParams();
  if (region) q.set("region", region);
  if (sub) q.set("sub", sub);
  if (gender && gender !== "all") q.set("gender", gender);
  if (eventId) q.set("event", eventId);
  if (groupId) q.set("groupId", groupId);
  if (selectionMode) q.set("selectionMode", selectionMode);
  if (selectionMode === "event" && eventId) q.set("eventId", eventId);
  const qs = q.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const activeRegion = asString(params.region);
  const activeSub = asString(params.sub);
  const activeGender = asString(params.gender) ?? "all";
  const eventId = asString(params.event);
  const selectionEventId = asString(params.eventId);
  const groupId = asString(params.groupId);
  const selectionMode = asString(params.selectionMode);
  const activeEventId = selectionEventId ?? eventId;

  const query = new URLSearchParams();
  if (activeRegion) query.set("region", activeRegion);
  if (activeSub) query.set("sub", activeSub);
  if (activeGender !== "all") query.set("gender", activeGender);
  query.set("limit", "120");

  const [productsRes, rateRes, sectionsRes] = await Promise.all([
    backendPublicRequest(`/api/v1/products?${query.toString()}`).catch(() => ({ data: [] })),
    backendPublicRequest("/api/v1/exchange-rate").catch(() => ({ data: null })),
    backendPublicRequest("/api/v1/products/sections").catch(() => ({ data: [] })),
  ]);

  const products: Product[] = Array.isArray(productsRes?.data) ? productsRes.data : [];
  const etbRate = Number(rateRes?.data?.rate ?? 0) || null;
  const regions = normalizePublicRegions(Array.isArray(sectionsRes?.data) ? (sectionsRes.data as PublicRegion[]) : []);
  const subs = collectionNamesForRegion(regions, activeRegion);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 sm:py-12">
      <CatalogLabels
        activeRegion={activeRegion}
        activeSub={activeSub}
        productCount={products.length}
      />

      <div className="flex gap-8">
        <aside className="hidden w-52 flex-shrink-0 lg:block">
          <div className="sticky top-24 space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Region</p>
              <div className="space-y-1">
                <Link
                  href={makeHref(null, null, activeGender, activeEventId, groupId, selectionMode)}
                  className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${!activeRegion ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                >
                  All Regions
                </Link>
                {regions.map((region) => (
                  <Link
                    key={region.id}
                    href={makeHref(region.name, null, activeGender, activeEventId, groupId, selectionMode)}
                    className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${activeRegion === region.name ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    {region.name}
                  </Link>
                ))}
              </div>
            </div>

            {subs.length > 0 ? (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collections</p>
                <div className="space-y-1">
                  {subs.map((sub) => (
                    <Link
                      key={sub}
                      href={makeHref(activeRegion, sub, activeGender, activeEventId, groupId, selectionMode)}
                      className={`block rounded-lg px-3 py-1.5 text-sm transition-colors ${activeSub === sub ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                    >
                      {sub}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gender</p>
              <div className="space-y-1">
                {["all", "female", "male", "unisex"].map((gender) => (
                  <Link
                    key={gender}
                    href={makeHref(activeRegion, activeSub, gender, activeEventId, groupId, selectionMode)}
                    className={`block rounded-lg px-3 py-1.5 text-sm capitalize transition-colors ${activeGender === gender ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}
                  >
                    {gender === "all" ? "All" : gender}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-6 flex flex-wrap gap-2 lg:hidden">
            {regions.map((region) => (
              <Link
                key={region.id}
                href={makeHref(region.name, null, activeGender, activeEventId, groupId, selectionMode)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${activeRegion === region.name ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
              >
                {region.name}
              </Link>
            ))}
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center py-24">
              <p className="text-muted-foreground">No products found.</p>
              <Link href="/catalog" className="mt-4 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} etbRate={etbRate} eventId={activeEventId} groupId={groupId} selectionMode={selectionMode} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
