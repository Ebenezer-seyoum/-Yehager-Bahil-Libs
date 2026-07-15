import { and, eq } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { globalPricingRules, products } from "../lib/db/schema.js";
import { env } from "../config/env.js";

type TelegramResponse<T> = { ok: boolean; result?: T; description?: string };

async function telegram<T>(method: string, body: Record<string, unknown>) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("Telegram bot token is not configured");
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as TelegramResponse<T>;
  if (!response.ok || !payload.ok) throw new Error(payload.description || `Telegram ${method} failed`);
  return payload.result as T;
}

export async function sendTelegramMessage(text: string, replyMarkup?: unknown) {
  return telegram<{ message_id: number }>("sendMessage", {
    chat_id: env.TELEGRAM_GROUP_ID,
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function sendTelegramProduct(product: { id: string; uniqueId?: string | null; name: string; images?: string[] | null }) {
  const images = (product.images ?? []).filter(Boolean).slice(0, 10);
  if (images.length) {
    await telegram("sendMediaGroup", {
      chat_id: env.TELEGRAM_GROUP_ID,
      media: images.map((url, index) => ({ type: "photo", media: url, caption: index === 0 ? `<b>${product.uniqueId || product.id}</b>\n${product.name}` : undefined, parse_mode: "HTML" })),
    });
  }
  return sendTelegramMessage(
    `<b>${product.uniqueId || product.id}</b>\n${product.name}\n\nEnter prices using this format:\n<code>${product.uniqueId || product.id}\nMen Top: 0 ETB\nMen Pants: 0 ETB\nBoy Top: 0 ETB\nBoy Pants: 0 ETB\nWoman Outfit: 0 ETB\nGirl Outfit: 0 ETB</code>`,
    { inline_keyboard: [[{ text: "Enter / Edit Price", callback_data: `price:edit:${product.id}` }]] },
  );
}

export async function editTelegramMessage(messageId: string | number, text: string, replyMarkup?: unknown) {
  return telegram("editMessageText", {
    chat_id: env.TELEGRAM_GROUP_ID,
    message_id: Number(messageId),
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function roleRuleKey(role: { customerType?: string; outfitOption?: string }) {
  const customer = role.customerType === "man" ? "men" : role.customerType === "boy" ? "boy" : role.customerType === "girl" ? "girl" : "woman";
  const outfit = role.outfitOption === "top_only" ? "top" : role.outfitOption === "pants_only" ? "pants" : role.outfitOption === "full_set" ? "full_set" : "outfit";
  return `${customer}_${outfit}`;
}

function parsePriceLines(text: string) {
  const entries = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([a-z][a-z0-9 _-]*)\s*[:=]\s*([0-9]+(?:[.,][0-9]{1,2})?)/i);
    if (!match) continue;
    const key = normalizeKey(match[1]);
    const amount = Number(match[2].replace(/,/g, ""));
    if (Number.isFinite(amount) && amount > 0) entries.set(key, amount);
  }
  return entries;
}

export async function processTelegramPriceMessage(text: string) {
  const idMatch = text.match(/\b(YB-[A-Z0-9-]+)\b/i);
  if (!idMatch) return null;
  const uniqueId = idMatch[1].toUpperCase();
  const [product] = await db.select().from(products).where(eq(products.uniqueId, uniqueId)).limit(1);
  if (!product) return { uniqueId, status: "unmatched" as const };
  const entries = parsePriceLines(text);
  if (!entries.size) return { uniqueId, status: "no_prices" as const };
  const rules = await db.select().from(globalPricingRules).where(eq(globalPricingRules.isActive, true));
  const ruleByKey = new Map(rules.map((rule) => [rule.ruleKey, Number(rule.markupAmountEtb)]));
  const roles = Array.isArray(product.familyRoles) ? product.familyRoles.map((role) => ({ ...role })) : [];
  let updated = 0;
  const nextRoles = roles.map((role) => {
    const key = roleRuleKey(role);
    const aliases = [key, normalizeKey(role.label || "")];
    const entered = aliases.map((alias) => entries.get(alias)).find((value) => value !== undefined);
    if (!entered) return role;
    const markup = ruleByKey.get(key) ?? 0;
    updated += 1;
    return { ...role, designerPriceEtb: entered, markupAmountEtb: markup, sellingPriceEtb: entered + markup, pricingRuleKey: key, enteredPrice: entered, currency: "ETB" as const };
  });
  if (!updated) return { uniqueId, status: "no_matching_roles" as const };
  const submittedAt = new Date();
  const [row] = await db.update(products).set({ familyRoles: nextRoles, priceStatus: "pending_approval", telegramStatus: "submitted", priceSubmissionCount: Number(product.priceSubmissionCount ?? 0) + 1, lastPriceSubmittedAt: submittedAt, priceVersion: Number(product.priceVersion ?? 0) + 1, updatedAt: submittedAt }).where(eq(products.id, product.id)).returning();
  return { uniqueId, status: "submitted" as const, product: row, updated };
}

export function approvalKeyboard(productId: string) {
  return { inline_keyboard: [[{ text: "Edit Price", callback_data: `price:edit:${productId}` }]] };
}

export function priceSummary(product: { uniqueId?: string | null; familyRoles?: unknown[] | null }) {
  const roles = Array.isArray(product.familyRoles) ? product.familyRoles as Array<{ label?: string; designerPriceEtb?: number; markupAmountEtb?: number; sellingPriceEtb?: number }> : [];
  return [`<b>Product ${product.uniqueId || ""}</b>`, ...roles.filter((role) => role.sellingPriceEtb !== undefined).map((role) => `${role.label}: ${role.designerPriceEtb} ETB + ${role.markupAmountEtb} ETB = <b>${role.sellingPriceEtb} ETB</b>`)].join("\n");
}
