import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { count } from "drizzle-orm";
import { db, pgPool } from "../lib/db/drizzle.js";
import {
  auditLogs,
  cartItems,
  eventParticipants,
  events,
  exchangeRates,
  familyGroups,
  familyMembers,
  measurements,
  orders,
  products,
  systemAlerts,
  users,
} from "../lib/db/schema.js";
import { logger } from "../lib/logger.js";

type CounterTarget = {
  file: string;
  table: string;
  queryCount: () => Promise<number>;
};

const baseExportDir = process.env.BASE44_EXPORT_DIR ?? path.resolve(process.cwd(), "data-sync/base44-export");

function stripJsonComments(content: string) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

async function loadExportCount(fileName: string): Promise<number> {
  const fullPath = path.join(baseExportDir, fileName);
  try {
    const raw = await readFile(fullPath, "utf8");
    const json = JSON.parse(stripJsonComments(raw));
    if (Array.isArray(json)) return json.length;
    if (Array.isArray(json?.data)) return json.data.length;
    return 0;
  } catch {
    return 0;
  }
}

async function tableCount(queryBuilder: unknown) {
  const rows = (await db
    .select({ value: count() })
    .from(queryBuilder as never)) as Array<{ value: number | string }>;
  return Number(rows[0]?.value ?? 0);
}

const targets: CounterTarget[] = [
  { file: "User.json", table: "users", queryCount: () => tableCount(users) },
  { file: "Product.json", table: "products", queryCount: () => tableCount(products) },
  { file: "Event.json", table: "events", queryCount: () => tableCount(events) },
  { file: "EventParticipant.json", table: "event_participants", queryCount: () => tableCount(eventParticipants) },
  { file: "Measurement.json", table: "measurements", queryCount: () => tableCount(measurements) },
  { file: "FamilyGroup.json", table: "family_groups", queryCount: () => tableCount(familyGroups) },
  { file: "FamilyMember.json", table: "family_members", queryCount: () => tableCount(familyMembers) },
  { file: "CartItem.json", table: "cart_items", queryCount: () => tableCount(cartItems) },
  { file: "Order.json", table: "orders", queryCount: () => tableCount(orders) },
  { file: "ExchangeRate.json", table: "exchange_rates", queryCount: () => tableCount(exchangeRates) },
  { file: "AuditLog.json", table: "audit_logs", queryCount: () => tableCount(auditLogs) },
  { file: "SystemAlert.json", table: "system_alerts", queryCount: () => tableCount(systemAlerts) },
];

async function run() {
  logger.info({ baseExportDir }, "Running parity check");

  let hasMismatch = false;
  for (const target of targets) {
    const exportCount = await loadExportCount(target.file);
    const dbCount = await target.queryCount();
    const diff = dbCount - exportCount;
    const ok = diff === 0;
    hasMismatch ||= !ok;

    logger.info(
      {
        file: target.file,
        table: target.table,
        exportCount,
        dbCount,
        diff,
        status: ok ? "ok" : "mismatch",
      },
      "Parity result",
    );
  }

  await pgPool.end();
  if (hasMismatch) {
    process.exitCode = 1;
    logger.warn("Parity check completed with mismatches");
    return;
  }
  logger.info("Parity check passed");
}

run().catch(async (error) => {
  logger.error({ error }, "Parity check failed");
  await pgPool.end();
  process.exit(1);
});
