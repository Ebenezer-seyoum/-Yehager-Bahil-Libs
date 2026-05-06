import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../../lib/db/drizzle.js";
import { products } from "../../lib/db/schema.js";
import { getActiveProductById } from "../../repositories/products-repository.js";
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

export const productsRouter = new Hono<AppBindings>();

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
      priceUsd: products.priceUsd,
      images: products.images,
      isFeatured: products.isFeatured,
    })
    .from(products)
    .where(and(...filters))
    .orderBy(desc(products.createdAt))
    .limit(limit ?? 100);

  return c.json({ data: rows });
});

productsRouter.get("/:productId", zValidator("param", productIdParamSchema), async (c) => {
  const { productId } = c.req.valid("param");
  const row = await getActiveProductById(productId);
  if (!row) {
    return c.json({ error: { message: "Product not found" } }, 404);
  }
  return c.json({ data: row });
});
