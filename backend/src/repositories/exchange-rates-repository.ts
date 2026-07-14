import { eq } from "drizzle-orm";
import type { Database } from "../lib/db/drizzle.js";
import { exchangeRates } from "../lib/db/schema.js";

/** DB root or transaction client (read path). */
export async function getUsdEtbRate(client: Pick<Database, "query">) {
  return client.query.exchangeRates.findFirst({
    where: eq(exchangeRates.currencyPair, "USD_ETB"),
  });
}

export async function upsertUsdEtbFromValues(
  db: Database,
  payload: { rate: string; source: string; lastUpdated: Date; rateType?: "bank_selling" | "market_reference"; updatedBy?: string },
) {
  await db
    .insert(exchangeRates)
    .values({
      currencyPair: "USD_ETB",
      rate: payload.rate,
      source: payload.source,
      rateType: payload.rateType ?? "market_reference",
      updatedBy: payload.updatedBy,
      lastUpdated: payload.lastUpdated,
    })
    .onConflictDoUpdate({
      target: exchangeRates.currencyPair,
      set: {
        rate: payload.rate,
        source: payload.source,
        rateType: payload.rateType ?? "market_reference",
        updatedBy: payload.updatedBy,
        lastUpdated: payload.lastUpdated,
        updatedAt: new Date(),
      },
    });
}
