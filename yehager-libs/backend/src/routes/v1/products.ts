import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../../lib/db/drizzle.js";
import { products } from "../../lib/db/schema.js";
import type { AppBindings } from "../../types/hono.js";

const querySchema = z.object({
  featured: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

export const productsRouter = new Hono<AppBindings>();

productsRouter.get("/", zValidator("query", querySchema), async (c) => {
  const { featured } = c.req.valid("query");
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      region: products.region,
      category: products.category,
      priceUsd: products.priceUsd,
      images: products.images,
      isFeatured: products.isFeatured,
    })
    .from(products)
    .where(featured ? eq(products.isFeatured, true) : eq(products.isActive, true))
    .orderBy(desc(products.createdAt))
    .limit(100);

  return c.json({ data: rows });
});
