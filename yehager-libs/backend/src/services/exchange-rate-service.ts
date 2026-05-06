import { HTTPException } from "hono/http-exception";
import { db } from "../lib/db/drizzle.js";
import { getUsdEtbRate, upsertUsdEtbFromValues } from "../repositories/exchange-rates-repository.js";

export async function getPublicUsdEtb() {
  const row = await getUsdEtbRate(db);
  if (!row) {
    return null;
  }
  return {
    currencyPair: row.currencyPair,
    rate: row.rate,
    source: row.source,
    lastUpdated: row.lastUpdated?.toISOString() ?? null,
  };
}

/** Fetches USD→ETB from open.er-api.com and upserts `exchange_rates` (same source as legacy Base44). */
export async function refreshUsdEtbFromOpenEr() {
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!response.ok) {
    throw new HTTPException(502, { message: "Upstream exchange-rate service unavailable" });
  }

  const data = (await response.json()) as { rates?: { ETB?: number } };
  const etb = data.rates?.ETB;
  if (typeof etb !== "number" || !Number.isFinite(etb) || etb <= 0) {
    throw new HTTPException(502, { message: "Invalid rate response for ETB" });
  }

  const lastUpdated = new Date();
  await upsertUsdEtbFromValues(db, {
    rate: String(etb),
    source: "open.er-api.com",
    lastUpdated,
  });

  return { rate: etb, lastUpdated: lastUpdated.toISOString() };
}
