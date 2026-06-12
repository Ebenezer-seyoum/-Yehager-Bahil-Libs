import { REGIONS, TAXONOMY } from "@/lib/taxonomy";

export type PublicCollection = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export type PublicRegion = {
  id: string;
  name: string;
  slug?: string;
  isActive: boolean;
  sortOrder: number;
  collections?: PublicCollection[];
  subsections?: PublicCollection[];
};

export function defaultPublicRegions(): PublicRegion[] {
  return REGIONS.map((name, index) => ({
    id: `fallback-${name}`,
    name,
    isActive: true,
    sortOrder: index,
    collections: (TAXONOMY[name] ?? []).map((collection, collectionIndex) => ({
      id: `fallback-${name}-${collection}`,
      name: collection,
      isActive: true,
      sortOrder: collectionIndex,
    })),
  }));
}

export function normalizePublicRegions(regions: PublicRegion[] | undefined): PublicRegion[] {
  return normalizePublicRegionsWithOptions(regions);
}

export function normalizePublicRegionsForTopBar(regions: PublicRegion[] | undefined): PublicRegion[] {
  return normalizePublicRegionsWithOptions(regions, { keepDefaultRegionsVisible: true });
}

function normalizePublicRegionsWithOptions(
  regions: PublicRegion[] | undefined,
  options: { keepDefaultRegionsVisible?: boolean } = {},
): PublicRegion[] {
  const defaults = defaultPublicRegions();
  const source = regions?.length ? regions : [];
  const savedByName = new Map(source.map((region) => [region.name.trim().toLowerCase(), region]));
  const mergedSource = [
    ...defaults.map((region) => {
      const saved = savedByName.get(region.name.trim().toLowerCase());
      if (!saved) return region;
      return options.keepDefaultRegionsVisible ? { ...saved, isActive: true } : saved;
    }),
    ...source.filter((region) => !defaults.some((item) => item.name.trim().toLowerCase() === region.name.trim().toLowerCase())),
  ];

  const normalized = mergedSource
    .map((region, index) => ({
      ...region,
      isActive: region.isActive ?? true,
      sortOrder: region.sortOrder ?? index,
      collections: (region.collections ?? region.subsections ?? [])
        .filter((collection) => collection.isActive !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    }))
    .filter((region) => region.isActive !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const mergedByName = new Map<string, PublicRegion>();
  normalized.forEach((region) => {
    const key = region.name.trim().toLowerCase();
    const existing = mergedByName.get(key);
    if (!existing) {
      mergedByName.set(key, region);
      return;
    }

    const existingCollections = new Map((existing.collections ?? []).map((collection) => [collection.name.trim().toLowerCase(), collection]));
    (region.collections ?? []).forEach((collection) => {
      if (!existingCollections.has(collection.name.trim().toLowerCase())) {
        existingCollections.set(collection.name.trim().toLowerCase(), collection);
      }
    });
    mergedByName.set(key, {
      ...existing,
      sortOrder: Math.min(existing.sortOrder, region.sortOrder),
      collections: Array.from(existingCollections.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    });
  });

  return Array.from(mergedByName.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function collectionNamesForRegion(regions: PublicRegion[], regionName: string | null) {
  if (!regionName) return [];
  return regions.find((region) => region.name === regionName)?.collections?.map((collection) => collection.name) ?? [];
}
