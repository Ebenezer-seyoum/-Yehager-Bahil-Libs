import { and, eq } from "drizzle-orm";
import { createHmac } from "node:crypto";
import { db } from "../lib/db/drizzle.js";
import { globalPricingRules, products, telegramRegionTopics } from "../lib/db/schema.js";
import { env } from "../config/env.js";
import { getSignedReadUrl } from "../lib/storage/s3.js";

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

export function createPriceFormToken(productId: string, expiresAt = Math.floor(Date.now() / 1000) + 86400) {
  const payload = `${productId}.${expiresAt}`;
  const secret = env.TELEGRAM_WEBHOOK_SECRET || env.TELEGRAM_BOT_TOKEN || "";
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${productId}.${expiresAt}.${signature}`;
}

async function makeTelegramImageUrl(imageUrl: string) {
  // Product images are stored in a private S3 bucket. Telegram cannot fetch
  // the stored public-looking URL directly, so convert our S3 URL to a short-
  // lived signed read URL before sending it to Telegram.
  const publicBase = env.AWS_S3_PUBLIC_BASE_URL.replace(/\/+$/, "");
  if (!imageUrl.startsWith(`${publicBase}/`)) return imageUrl;
  const key = decodeURIComponent(imageUrl.slice(publicBase.length + 1));
  return getSignedReadUrl(key, 15 * 60);
}

export async function sendTelegramMessage(text: string, replyMarkup?: unknown, topicId?: string | null, chatId: string | number | null = env.TELEGRAM_GROUP_ID ?? null) {
  return telegram<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    ...(topicId ? { message_thread_id: Number(topicId) } : {}),
    text,
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function answerTelegramCallbackQuery(callbackQueryId: string) {
  return telegram("answerCallbackQuery", { callback_query_id: callbackQueryId });
}

function cleanProductName(name: string, uniqueId: string) {
  return name.replace(new RegExp(`\\s*[-–—]\\s*${uniqueId.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*$`, "i"), "").trim();
}

function priceEntryPrompt(product: { uniqueId?: string | null; name: string }) {
  const uniqueId = product.uniqueId || "PRODUCT-ID";
  return `<b>${uniqueId}</b>\n${cleanProductName(product.name, uniqueId)}\n\nEnter only these four prices:\n<code>${uniqueId}\nMen: 0 ETB\nWoman: 0 ETB\nBoy: 0 ETB\nGirl: 0 ETB</code>`;
}

export async function getOrCreateRegionTopic(regionName: string) {
  if (!env.TELEGRAM_GROUP_ID) throw new Error("Telegram group ID is not configured");
  const existing = await db.query.telegramRegionTopics.findFirst({ where: and(eq(telegramRegionTopics.telegramGroupId, env.TELEGRAM_GROUP_ID), eq(telegramRegionTopics.regionName, regionName), eq(telegramRegionTopics.status, "active")) });
  if (existing) return existing;
  const topic = await telegram<{ message_thread_id: number }>("createForumTopic", { chat_id: env.TELEGRAM_GROUP_ID, name: regionName });
  const [row] = await db.insert(telegramRegionTopics).values({ regionName, telegramGroupId: env.TELEGRAM_GROUP_ID, telegramTopicId: String(topic.message_thread_id), status: "active" }).returning();
  return row;
}

export async function sendTelegramProduct(product: { id: string; uniqueId?: string | null; name: string; region: string; images?: string[] | null }) {
  const regionTopic = await getOrCreateRegionTopic(product.region);
  const productName = cleanProductName(product.name, product.uniqueId || product.id);
  const images = (product.images ?? []).filter(Boolean).slice(0, 10);
  if (images.length) {
    const telegramImages = await Promise.all(images.map(makeTelegramImageUrl));
    await telegram("sendMediaGroup", {
      chat_id: env.TELEGRAM_GROUP_ID,
      message_thread_id: Number(regionTopic.telegramTopicId),
      media: telegramImages.map((url, index) => ({ type: "photo", media: url, caption: index === 0 ? `<b>${product.uniqueId || product.id}</b>\n${productName}` : undefined, parse_mode: "HTML" })),
    });
  }
  const message = await sendTelegramMessage(
    priceEntryPrompt({ uniqueId: product.uniqueId || product.id, name: productName }),
    { inline_keyboard: [[{ text: "Enter / Edit Price", url: env.TELEGRAM_MINI_APP_SHORT_NAME ? `https://t.me/${env.TELEGRAM_BOT_USERNAME || "yehager_price_manager_bot"}/${env.TELEGRAM_MINI_APP_SHORT_NAME}?startapp=${encodeURIComponent(createPriceFormToken(product.id))}` : `https://t.me/${env.TELEGRAM_BOT_USERNAME || "yehager_price_manager_bot"}?start=price_${product.id}` }]] },
    regionTopic.telegramTopicId,
  );
  return { message, topicId: regionTopic.telegramTopicId };
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

function customerPriceKey(role: { customerType?: string }) {
  return role.customerType === "man" ? "men" : role.customerType === "boy" ? "boy" : role.customerType === "girl" ? "girl" : "woman";
}

function roleRuleKey(role: { customerType?: string; outfitOption?: string }) {
  const customer = customerPriceKey(role);
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
  const idMatch = text.match(/\b([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\b/i);
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
    const customer = customerPriceKey(role);
    const key = roleRuleKey(role);
    const aliases = [customer, `${customer}_outfit`, key, normalizeKey(role.label || "")];
    const entered = aliases.map((alias) => entries.get(alias)).find((value) => value !== undefined);
    if (!entered) return role;
    const markup = ruleByKey.get(customer) ?? ruleByKey.get(`${customer}_outfit`) ?? ruleByKey.get(key) ?? 0;
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
