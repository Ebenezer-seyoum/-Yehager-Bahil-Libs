/** Habesha / Ethiopian traditional clothing ecommerce wording */
export const clothingLabels = {
  product: "Clothing item",
  products: "Clothes",
  productManagement: "Clothing catalog",
  stock: "Clothing inventory",
  lowStock: "Low clothing stock",
  outOfStock: "Out of stock clothes",
  bestSelling: "Best selling clothing item",
  category: "Clothing category",
  section: "Tribe section",
  inventory: "Clothing inventory",
  revenue: "Clothing revenue",
  featured: "Featured clothes",
  draft: "Draft clothes",
  active: "Active clothes",
  culturalStyle: "Cultural style",
  tribe: "Tribe / cultural style",
  sizeVariants: "Size options",
  colorVariants: "Color options",
} as const;

export function productReportTitle(key: string, fallback: string) {
  const map: Record<string, string> = {
    "product-overview": "Clothing performance overview",
    "best-selling-products": "Best selling clothes",
    "low-stock": "Low stock clothes",
    "product-category-report": "Clothing category report",
    "inventory-report": "Clothing inventory report",
    "product-revenue-report": "Clothes revenue report",
    "sales-by-product": "Sales by clothing item",
    "sales-by-category": "Sales by clothing category",
  };
  return map[key] ?? fallback;
}
