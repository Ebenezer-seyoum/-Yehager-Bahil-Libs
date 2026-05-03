import { eq, inArray } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { products } from "../lib/db/schema.js";

export async function getActiveProductById(productId: string) {
  return db.query.products.findFirst({
    where: eq(products.id, productId),
  });
}

export async function getProductsByIds(productIds: string[]) {
  if (!productIds.length) {
    return [];
  }

  return db.query.products.findMany({
    where: inArray(products.id, productIds),
  });
}
