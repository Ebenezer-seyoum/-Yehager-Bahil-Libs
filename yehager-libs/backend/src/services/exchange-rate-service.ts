import { HTTPException } from "hono/http-exception";
import { db } from "../lib/db/drizzle.js";
import { auditLogs } from "../lib/db/schema.js";
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

export async function setManualUsdEtbRate(payload: { rate: number; performedBy?: string }) {
  if (!Number.isFinite(payload.rate) || payload.rate <= 0) {
    throw new HTTPException(400, { message: "Rate must be a positive number" });
  }

  const lastUpdated = new Date();
  await upsertUsdEtbFromValues(db, {
    rate: String(payload.rate),
    source: "Manual override",
    lastUpdated,
  });
  await db.insert(auditLogs).values({
    action: "exchange_rate_manual_override",
    category: "admin",
    severity: "info",
    entityType: "exchange_rate",
    entityId: "USD_ETB",
    performedBy: payload.performedBy ?? "admin",
    details: `Manual USD_ETB override set to ${payload.rate}`,
    metadata: { rate: payload.rate },
  });

  return { rate: payload.rate, source: "Manual override", lastUpdated: lastUpdated.toISOString() };
}
