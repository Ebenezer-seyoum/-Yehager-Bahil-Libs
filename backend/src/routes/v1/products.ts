import { Hono } from "hono";
import { and, asc, desc, eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../../lib/db/drizzle.js";
import { homepageSections, products } from "../../lib/db/schema.js";
import { getActiveProductById } from "../../repositories/products-repository.js";
import { enrichProductsWithDiscounts, getEffectiveProductPrice } from "../../services/discounts-service.js";
import type { AppBindings } from "../../types/hono.js";

const querySchema = z.object({
  featured: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  region: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  sub: z.string().min(1).optional(),
  gender: z.enum(["male", "female", "unisex"]).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

const productIdParamSchema = z.object({
  productId: z.string().uuid(),
});

const homeProductsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const productsRouter = new Hono<AppBindings>();

productsRouter.get("/sections", async (c) => {
  const rows = await db
    .select({
      id: homepageSections.id,
      name: homepageSections.name,
      slug: homepageSections.slug,
      isActive: homepageSections.isActive,
      sortOrder: homepageSections.sortOrder,
      collections: homepageSections.collections,
    })
    .from(homepageSections)
    .orderBy(asc(homepageSections.sortOrder), asc(homepageSections.name));

  if (rows.length > 0) {
    return c.json({
      data: rows
        .filter((row) => row.isActive)
        .map((row) => ({
          ...row,
          collections: (row.collections ?? []).filter((collection) => collection.isActive),
          subsections: (row.collections ?? []).filter((collection) => collection.isActive),
        })),
    });
  }

  const productRows = await db
    .select({
      region: products.region,
      subcategory: products.subcategory,
    })
    .from(products)
    .where(eq(products.isActive, true));

  const grouped = new Map<string, Set<string>>();
  productRows.forEach((product) => {
    const region = product.region?.trim();
    if (!region) return;
    const current = grouped.get(region) ?? new Set<string>();
    if (product.subcategory?.trim()) current.add(product.subcategory.trim());
    grouped.set(region, current);
  });

  return c.json({
    data: Array.from(grouped.entries()).map(([name, subsections], index) => ({
      id: name,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      isActive: true,
      sortOrder: index,
      collections: Array.from(subsections).sort().map((subsection, subIndex) => ({
        id: `${name}-${subsection}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        name: subsection,
        isActive: true,
        sortOrder: subIndex,
      })),
      subsections: Array.from(subsections).sort().map((subsection, subIndex) => ({
        id: `${name}-${subsection}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        name: subsection,
        isActive: true,
        sortOrder: subIndex,
      })),
    })),
  });
});

productsRouter.get("/home", zValidator("query", homeProductsQuerySchema), async (c) => {
  const { limit } = c.req.valid("query");
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      region: products.region,
      category: products.category,
      subcategory: products.subcategory,
      gender: products.gender,
      uniqueId: products.uniqueId,
      groomPriceUsd: products.groomPriceUsd,
      familyRoles: products.familyRoles,
      isCouple: products.isCouple,
      priceUsd: products.priceUsd,
      images: products.images,
      isFeatured: products.isFeatured,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .orderBy(desc(products.isFeatured), desc(products.createdAt))
    .limit(limit ?? 120);

  const data = await enrichProductsWithDiscounts(rows);
  return c.json({ data });
});

productsRouter.get("/", zValidator("query", querySchema), async (c) => {
  const { featured, region, category, sub, gender, limit } = c.req.valid("query");
  const filters = [eq(products.isActive, true)];
  if (featured) filters.push(eq(products.isFeatured, true));
  if (region) filters.push(eq(products.region, region));
  if (category) filters.push(eq(products.category, category));
  if (sub) filters.push(eq(products.subcategory, sub));
  if (gender) filters.push(eq(products.gender, gender));

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      region: products.region,
      category: products.category,
      subcategory: products.subcategory,
      gender: products.gender,
      uniqueId: products.uniqueId,
      groomPriceUsd: products.groomPriceUsd,
      familyRoles: products.familyRoles,
      isCouple: products.isCouple,
      priceUsd: products.priceUsd,
      images: products.images,
      isFeatured: products.isFeatured,
    })
    .from(products)
    .where(and(...filters))
    .orderBy(desc(products.createdAt))
    .limit(limit ?? 100);

  const data = await enrichProductsWithDiscounts(rows);
  return c.json({ data });
});

productsRouter.get("/:productId", zValidator("param", productIdParamSchema), async (c) => {
  const { productId } = c.req.valid("param");
  const row = await getActiveProductById(productId);
  if (!row) {
    return c.json({ error: { message: "Product not found" } }, 404);
  }
  const data = await getEffectiveProductPrice(row);
  return c.json({ data });
});
