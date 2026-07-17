import { desc, eq } from "drizzle-orm";
import { auditLogs, systemSettings } from "../lib/db/schema.js";
import { db } from "../lib/db/drizzle.js";

export const SYSTEM_SETTING_DEFAULTS = [
  { key: "store.business_name", category: "store", value: "Yehager Bahil", valueType: "string", description: "Business name used in customer-facing documents." },
  { key: "store.default_currency", category: "store", value: "USD", valueType: "string", description: "Default currency for new prices and reports." },
  { key: "store.timezone", category: "store", value: "Africa/Addis_Ababa", valueType: "string", description: "Timezone used for dates, reports, and notifications." },
  { key: "orders.default_delivery_days", category: "orders", value: 14, valueType: "number", description: "Default delivery estimate in days." },
  { key: "notifications.email_enabled", category: "notifications", value: true, valueType: "boolean", description: "Enable transactional email notifications." },
  { key: "appearance.brand_color", category: "appearance", value: "#0f172a", valueType: "string", description: "Primary admin interface brand color." },
] as const;

export async function getSystemSettings() {
  const rows = await db.select().from(systemSettings).orderBy(desc(systemSettings.updatedAt));
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return SYSTEM_SETTING_DEFAULTS.map((fallback) => byKey.get(fallback.key) ?? { ...fallback, isSensitive: false, updatedBy: null })
    .concat(rows.filter((row) => !SYSTEM_SETTING_DEFAULTS.some((item) => item.key === row.key)))
    .map(({ isSensitive, ...row }) => ({ ...row, value: isSensitive ? null : row.value }));
}

export async function updateSystemSettings(values: Record<string, unknown>, performedBy: string) {
  const allowed = new Map<string, (typeof SYSTEM_SETTING_DEFAULTS)[number]>(SYSTEM_SETTING_DEFAULTS.map((item) => [item.key, item]));
  const changed: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    const definition = allowed.get(key);
    if (!definition) throw new Error(`Unsupported setting: ${key}`);
    if (definition.valueType === "number" && (typeof value !== "number" || !Number.isFinite(value))) throw new Error(`${key} must be a number`);
    if (definition.valueType === "boolean" && typeof value !== "boolean") throw new Error(`${key} must be true or false`);
    const previous = await db.query.systemSettings.findFirst({ where: eq(systemSettings.key, key) });
    await db.insert(systemSettings).values({ key, category: definition.category, value: value as never, valueType: definition.valueType, description: definition.description, updatedBy: performedBy }).onConflictDoUpdate({ target: systemSettings.key, set: { value: value as never, updatedBy: performedBy, updatedAt: new Date() } });
    changed.push(key);
    await db.insert(auditLogs).values({ action: "system_setting_updated", category: "settings", severity: "info", entityType: "system_setting", entityId: key, performedBy, details: `Updated ${key}`, metadata: { previous: previous?.value ?? null, next: value } });
  }
  return { changed };
}
