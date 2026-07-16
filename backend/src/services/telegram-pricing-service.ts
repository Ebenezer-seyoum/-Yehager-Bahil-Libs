import { and, eq } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import sharp from "sharp";
import { db } from "../lib/db/drizzle.js";
import { globalPricingRules, products, systemAlerts, telegramRegionTopics } from "../lib/db/schema.js";
import { env } from "../config/env.js";
import { getSignedReadUrl } from "../lib/storage/s3.js";
import { logger } from "../lib/logger.js";
import {
  calculateRolePricing,
  resolveEffectivePricingRuleValues,
  type GlobalPricingRuleValues,
} from "./global-pricing-rules.js";

type TelegramResponse<T> = { ok: boolean; result?: T; description?: string };

export type EstimatedPrices = {
  men: number;
  woman: number;
  boy: number;
  girl: number;
};

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

async function telegramPhotoUpload<T>(body: {
  chatId: string;
  topicId: string;
  photo: Buffer;
  caption: string;
  replyMarkup: unknown;
}) {
  if (!env.TELEGRAM_BOT_TOKEN) throw new Error("Telegram bot token is not configured");
  const form = new FormData();
  form.set("chat_id", body.chatId);
  form.set("message_thread_id", body.topicId);
  form.set("caption", body.caption);
  form.set("parse_mode", "HTML");
  form.set("reply_markup", JSON.stringify(body.replyMarkup));
  form.set("photo", new Blob([new Uint8Array(body.photo)], { type: "image/jpeg" }), "product-collage.jpg");
  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    method: "POST",
    body: form,
  });
  const payload = (await response.json()) as TelegramResponse<T>;
  if (!response.ok || !payload.ok) throw new Error(payload.description || "Telegram sendPhoto failed");
  return payload.result as T;
}

function priceFormSecret() {
  return env.TELEGRAM_WEBHOOK_SECRET || env.TELEGRAM_BOT_TOKEN || "";
}

function uuidBytes(productId: string) {
  const hex = productId.replace(/-/g, "");
  if (!/^[a-f0-9]{32}$/i.test(hex)) throw new Error("Invalid product ID for Telegram price form");
  return Buffer.from(hex, "hex");
}

function uuidFromBytes(bytes: Buffer) {
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createPriceFormToken(productId: string, expiresAt = Math.floor(Date.now() / 1000) + 30 * 86400) {
  const payload = Buffer.alloc(20);
  uuidBytes(productId).copy(payload, 0);
  payload.writeUInt32BE(expiresAt, 16);
  const secret = env.TELEGRAM_WEBHOOK_SECRET || env.TELEGRAM_BOT_TOKEN || "";
  const signature = createHmac("sha256", secret).update(payload).digest().subarray(0, 16);
  return Buffer.concat([payload, signature]).toString("base64url");
}

export function productIdFromPriceFormToken(token: string) {
  try {
    if (token.includes(".")) return token.split(".")[0] || null;
    const decoded = Buffer.from(token, "base64url");
    if (decoded.length !== 36) return null;
    return uuidFromBytes(decoded.subarray(0, 16));
  } catch {
    return null;
  }
}

export function verifyPriceFormToken(productId: string, token: string) {
  if (!token) return false;
  if (token.includes(".")) {
    const [tokenProductId, expiresText, receivedSignature] = token.split(".");
    const expiresAt = Number(expiresText);
    if (tokenProductId !== productId || !Number.isFinite(expiresAt) || expiresAt < Date.now() / 1000 || !receivedSignature) return false;
    const expectedSignature = createHmac("sha256", priceFormSecret()).update(`${productId}.${expiresAt}`).digest("hex");
    return receivedSignature.length === expectedSignature.length && timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expectedSignature));
  }
  try {
    const decoded = Buffer.from(token, "base64url");
    if (decoded.length !== 36) return false;
    const payload = decoded.subarray(0, 20);
    const receivedSignature = decoded.subarray(20);
    if (uuidFromBytes(payload.subarray(0, 16)) !== productId) return false;
    if (payload.readUInt32BE(16) < Date.now() / 1000) return false;
    const expectedSignature = createHmac("sha256", priceFormSecret()).update(payload).digest().subarray(0, 16);
    return timingSafeEqual(receivedSignature, expectedSignature);
  } catch {
    return false;
  }
}

function miniAppUrl(productId: string) {
  if (!env.TELEGRAM_MINI_APP_SHORT_NAME) throw new Error("Telegram Mini App short name is not configured");
  const botUsername = env.TELEGRAM_BOT_USERNAME || "yehager_price_manager_bot";
  return `https://t.me/${botUsername}/${env.TELEGRAM_MINI_APP_SHORT_NAME}?startapp=${encodeURIComponent(createPriceFormToken(productId))}`;
}

export function priceEntryKeyboard(productId: string, label = "Enter / Edit Price") {
  return { inline_keyboard: [[{ text: label, url: miniAppUrl(productId) }]] };
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

export async function composeTelegramCollage(imageBuffers: Buffer[]) {
  const images = imageBuffers.slice(0, 4);
  if (!images.length) throw new Error("At least one image is required for a Telegram collage");
  const size = 1200;
  const gap = 8;
  const half = (size - gap) / 2;
  const layouts = images.length === 1
    ? [{ left: 0, top: 0, width: size, height: size }]
    : images.length === 2
      ? [
          { left: 0, top: 0, width: half, height: size },
          { left: half + gap, top: 0, width: half, height: size },
        ]
      : images.length === 3
        ? [
            { left: 0, top: 0, width: size, height: half },
            { left: 0, top: half + gap, width: half, height: half },
            { left: half + gap, top: half + gap, width: half, height: half },
          ]
        : [
            { left: 0, top: 0, width: half, height: half },
            { left: half + gap, top: 0, width: half, height: half },
            { left: 0, top: half + gap, width: half, height: half },
            { left: half + gap, top: half + gap, width: half, height: half },
          ];
  const tiles = await Promise.all(images.map((image, index) => sharp(image)
    .rotate()
    .resize(Math.round(layouts[index].width), Math.round(layouts[index].height), { fit: "cover", position: "attention" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer()));
  return sharp({
    create: { width: size, height: size, channels: 3, background: "#132536" },
  }).composite(tiles.map((input, index) => ({
    input,
    left: Math.round(layouts[index].left),
    top: Math.round(layouts[index].top),
  }))).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

async function telegramCollageFromUrls(imageUrls: string[]) {
  const signedUrls = await Promise.all(imageUrls.slice(0, 4).map(makeTelegramImageUrl));
  const downloads = await Promise.allSettled(signedUrls.map(async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Product image download failed with ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }));
  const buffers: Buffer[] = [];
  for (const result of downloads) {
    if (result.status === "fulfilled") buffers.push(Buffer.from(result.value));
  }
  return buffers.length ? composeTelegramCollage(buffers) : null;
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

function escapeTelegramHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatEtb(value: number) {
  return `${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ETB`;
}

function priceEntryPrompt(product: { uniqueId?: string | null; name: string }) {
  const uniqueId = product.uniqueId || "PRODUCT-ID";
  const title = cleanProductName(product.name, uniqueId).toLocaleUpperCase();
  return [
    `<b>${escapeTelegramHtml(title)}</b>`,
    `<code>${escapeTelegramHtml(uniqueId)}</code>`,
    "",
    "<b>DESIGNER PRICE SUBMISSION</b>",
    "Prices have not been submitted.",
    "",
    "Use the button below to enter the four estimated prices.",
    "",
    "#PriceNeeded",
  ].join("\n");
}

type TelegramPriceState = "submitted" | "approved" | "declined";

export function designerEstimateCaption(product: {
  uniqueId?: string | null;
  name?: string | null;
  estimatedPrices?: EstimatedPrices | null;
}, state: TelegramPriceState = "submitted") {
  const uniqueId = product.uniqueId || "PRODUCT-ID";
  const title = product.name ? cleanProductName(product.name, uniqueId).toLocaleUpperCase() : "PRODUCT PRICE";
  const prices = product.estimatedPrices;
  const heading = state === "approved" ? "✅ PRICE DATA APPROVED" : state === "declined" ? "🔴 PRICE DECLINED" : "✅ PRICE SUBMITTED";
  const status = state === "approved"
    ? "Approved by admin"
    : state === "declined"
      ? "Please review and submit the four estimates again"
      : "Pending admin approval";
  const hashtag = state === "approved" ? "#PriceApproved" : state === "declined" ? "#PriceDeclined" : "#PriceSubmitted";
  const rows = prices ? [
    `<b>Men</b>      <code>${formatEtb(Number(prices.men))}</code>`,
    `<b>Woman</b>  <code>${formatEtb(Number(prices.woman))}</code>`,
    `<b>Boy</b>       <code>${formatEtb(Number(prices.boy))}</code>`,
    `<b>Girl</b>       <code>${formatEtb(Number(prices.girl))}</code>`,
  ] : ["No designer estimates are available."];
  return [
    `<b>${escapeTelegramHtml(title)}</b>`,
    `<code>${escapeTelegramHtml(uniqueId)}</code>`,
    "",
    "<b>DESIGNER ESTIMATED PRICES</b>",
    ...rows,
    "",
    `<b>${heading}</b>`,
    `<b>Status:</b> ${status}`,
    hashtag,
  ].filter((line, index, lines) => line !== "" || lines[index - 1] !== "").join("\n");
}

export async function getOrCreateRegionTopic(regionName: string) {
  if (!env.TELEGRAM_GROUP_ID) throw new Error("Telegram group ID is not configured");
  const existing = await db.query.telegramRegionTopics.findFirst({ where: and(eq(telegramRegionTopics.telegramGroupId, env.TELEGRAM_GROUP_ID), eq(telegramRegionTopics.regionName, regionName), eq(telegramRegionTopics.status, "active")) });
  if (existing) return existing;
  const topic = await telegram<{ message_thread_id: number }>("createForumTopic", { chat_id: env.TELEGRAM_GROUP_ID, name: regionName });
  const [row] = await db.insert(telegramRegionTopics).values({ regionName, telegramGroupId: env.TELEGRAM_GROUP_ID, telegramTopicId: String(topic.message_thread_id), status: "active" }).returning();
  return row;
}

export async function sendTelegramProduct(
  product: { id: string; uniqueId?: string | null; name: string; region: string; images?: string[] | null },
  options: { caption?: string; replyMarkup?: unknown } = {},
) {
  const regionTopic = await getOrCreateRegionTopic(product.region);
  const productName = cleanProductName(product.name, product.uniqueId || product.id);
  const caption = options.caption ?? priceEntryPrompt({ uniqueId: product.uniqueId || product.id, name: productName });
  const replyMarkup = options.replyMarkup ?? priceEntryKeyboard(product.id);
  const productImages = (product.images ?? []).filter(Boolean).slice(0, 4);
  let message: { message_id: number };
  if (productImages.length && env.TELEGRAM_GROUP_ID) {
    const collage = await telegramCollageFromUrls(productImages).catch((error) => {
      logger.warn({ error, productId: product.id }, "telegram_product_collage_failed");
      return null;
    });
    message = collage
      ? await telegramPhotoUpload<{ message_id: number }>({
          chatId: env.TELEGRAM_GROUP_ID,
          topicId: regionTopic.telegramTopicId,
          photo: collage,
          caption,
          replyMarkup,
        })
      : await telegram<{ message_id: number }>("sendPhoto", {
          chat_id: env.TELEGRAM_GROUP_ID,
          message_thread_id: Number(regionTopic.telegramTopicId),
          photo: await makeTelegramImageUrl(productImages[0]),
          caption,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        });
  } else {
    message = await sendTelegramMessage(caption, replyMarkup, regionTopic.telegramTopicId);
  }
  return { message, topicId: regionTopic.telegramTopicId };
}

export async function editTelegramMessage(messageId: string | number, text: string, replyMarkup?: unknown) {
  const common = {
    chat_id: env.TELEGRAM_GROUP_ID,
    message_id: Number(messageId),
    parse_mode: "HTML",
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  };
  try {
    return await telegram("editMessageCaption", { ...common, caption: text });
  } catch (captionError) {
    try {
      return await telegram("editMessageText", { ...common, text });
    } catch {
      throw captionError;
    }
  }
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function customerPriceKey(role: { customerType?: string }) {
  return role.customerType === "man" ? "men" : role.customerType === "boy" ? "boy" : role.customerType === "girl" ? "girl" : "woman";
}

export function calculateProductFamilyRoles(
  product: typeof products.$inferSelect,
  prices: EstimatedPrices,
  pricingRules: GlobalPricingRuleValues,
) {
  const roles = Array.isArray(product.familyRoles) ? product.familyRoles.map((role) => ({ ...role })) : [];
  const roleTemplates = [
    { label: "Women's Traditional Outfit", customerType: "woman", outfitOption: "standard", gender: "female", description: "Complete traditional outfit" },
    { label: "Men's Traditional Full Set", customerType: "man", outfitOption: "full_set", gender: "male", description: "Traditional top and pants" },
    { label: "Men's Traditional Top", customerType: "man", outfitOption: "top_only", gender: "male", description: "Traditional top garment" },
    { label: "Men's Traditional Pants", customerType: "man", outfitOption: "pants_only", gender: "male", description: "Traditional pants" },
    { label: "Girls' Traditional Outfit", customerType: "girl", outfitOption: "standard", gender: "female", description: "Traditional outfit for girls" },
    { label: "Boys' Traditional Full Set", customerType: "boy", outfitOption: "full_set", gender: "male", description: "Traditional top and pants for boys" },
    { label: "Boys' Traditional Top", customerType: "boy", outfitOption: "top_only", gender: "male", description: "Traditional top garment for boys" },
    { label: "Boys' Traditional Pants", customerType: "boy", outfitOption: "pants_only", gender: "male", description: "Traditional pants for boys" },
  ] as const;
  for (const template of roleTemplates) {
    const exists = roles.some(
      (role) => role.customerType === template.customerType && role.outfitOption === template.outfitOption,
    );
    if (!exists) {
      roles.push({
        ...template,
        price: Number(product.priceUsd),
        currency: product.baseCurrency === "ETB" ? "ETB" : "USD",
        enteredPrice: Number(product.basePriceAmount ?? product.priceUsd),
        exchangeRate: Number(product.baseExchangeRate ?? 1),
      });
    }
  }
  let updated = 0;
  let pricingError = "";
  const nextRoles = roles.map((role) => {
    const customer = customerPriceKey(role);
    const entered = prices[customer as keyof EstimatedPrices];
    if (!entered) return role;
    try {
      const calculated = calculateRolePricing({
        customerType: role.customerType ?? "woman",
        outfitOption: role.outfitOption,
        telegramEstimateEtb: entered,
        rules: pricingRules,
      });
      updated += 1;
      return { ...role, ...calculated, enteredPrice: entered, currency: "ETB" as const };
    } catch (error) {
      pricingError = error instanceof Error ? error.message : "Global pricing rules are invalid.";
      return role;
    }
  });
  return { nextRoles, updated, pricingError };
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
  const prices = {
    men: entries.get("men") ?? entries.get("man") ?? 0,
    woman: entries.get("woman") ?? entries.get("women") ?? 0,
    boy: entries.get("boy") ?? 0,
    girl: entries.get("girl") ?? 0,
  };
  if (Object.values(prices).some((price) => !Number.isFinite(price) || price <= 0)) return { uniqueId, status: "no_prices" as const };
  return updateEstimatedPrices(product.id, prices, { recordSubmission: true });
}

export async function updateEstimatedPrices(
  productId: string,
  prices: EstimatedPrices,
  options: { recordSubmission?: boolean } = {},
) {
  const values = Object.values(prices);
  if (values.some((price) => !Number.isFinite(price) || price <= 0)) {
    return { status: "invalid_prices" as const };
  }
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) return { status: "unmatched" as const };
  const rules = await db.select().from(globalPricingRules).where(eq(globalPricingRules.isActive, true));
  const pricingRules = resolveEffectivePricingRuleValues(rules, product);
  const { nextRoles, updated, pricingError } = calculateProductFamilyRoles(product, prices, pricingRules);
  if (pricingError) return { status: "invalid_pricing_rules" as const, message: pricingError };
  const submittedAt = new Date();
  const recordSubmission = options.recordSubmission ?? false;
  const [row] = await db.update(products).set({
    familyRoles: nextRoles,
    estimatedPrices: prices,
    priceStatus: "pending_approval",
    telegramStatus: "submitted",
    priceSubmissionCount: recordSubmission ? Number(product.priceSubmissionCount ?? 0) + 1 : Number(product.priceSubmissionCount ?? 0),
    lastPriceSubmittedAt: recordSubmission ? submittedAt : product.lastPriceSubmittedAt,
    priceVersion: Number(product.priceVersion ?? 0) + 1,
    updatedAt: submittedAt,
  }).where(eq(products.id, product.id)).returning();
  if (recordSubmission) {
    try {
      const existingAlert = await db.query.systemAlerts.findFirst({
        where: and(
          eq(systemAlerts.type, "catalog_price_submitted"),
          eq(systemAlerts.entityId, product.id),
          eq(systemAlerts.isResolved, false),
        ),
      });
      const alertValues = {
        title: "New catalog price submitted",
        message: `${product.uniqueId || product.id} — ${product.name}`,
        type: "catalog_price_submitted",
        severity: "info",
        entityId: product.id,
        isResolved: false,
        resolvedBy: null,
        updatedAt: submittedAt,
      } as const;
      if (existingAlert) {
        await db.update(systemAlerts).set(alertValues).where(eq(systemAlerts.id, existingAlert.id));
      } else {
        await db.insert(systemAlerts).values(alertValues);
      }
    } catch (error) {
      logger.error({ error, productId: product.id }, "catalog_price_submission_alert_failed");
    }
  }
  return { uniqueId: product.uniqueId || product.id, status: "submitted" as const, product: row, updated };
}

export function approvalKeyboard(productId: string) {
  return priceEntryKeyboard(productId, "Edit Submitted Prices");
}

export function priceSummary(product: { uniqueId?: string | null; familyRoles?: unknown[] | null; estimatedPrices?: EstimatedPrices | null }) {
  return designerEstimateCaption(product, "submitted");
}
