export const DEFAULT_OTHER_SIZE_OPTIONS = ["Small", "Medium", "Large"] as const;

export function isOtherProductCategory(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "other" || normalized === "others";
}

export function isOtherProduct(product?: { category?: string | null; region?: string | null } | null) {
  return isOtherProductCategory(product?.category) || isOtherProductCategory(product?.region);
}
