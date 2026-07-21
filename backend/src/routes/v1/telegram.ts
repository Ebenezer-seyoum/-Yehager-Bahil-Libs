import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { AppBindings } from "../../types/hono.js";
import { env } from "../../config/env.js";
import { db } from "../../lib/db/drizzle.js";
import { products } from "../../lib/db/schema.js";
import { logger } from "../../lib/logger.js";
import { answerTelegramCallbackQuery, approvalKeyboard, createPriceFormToken, designerEstimateCaption, editTelegramMessage, priceEntryKeyboard, processTelegramPriceMessage, sendTelegramMessage, sendTelegramProduct, updateEstimatedPrices, verifyPriceFormToken } from "../../services/telegram-pricing-service.js";

export const telegramRouter = new Hono<AppBindings>();

function validPriceFormToken(productId: string, token: string) {
  return verifyPriceFormToken(productId, token);
}

function validWebAppInitData(initData: string) {
  if (!env.TELEGRAM_BOT_TOKEN || !initData) return false;
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  if (!receivedHash || !Number.isFinite(authDate) || Math.abs(Date.now() / 1000 - authDate) > 86400) return false;
  params.delete("hash");
  const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(env.TELEGRAM_BOT_TOKEN).digest();
  const calculated = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return receivedHash.length === calculated.length && timingSafeEqual(Buffer.from(receivedHash), Buffer.from(calculated));
}

type PriceFormBody = {
  productId?: string;
  token?: string;
  initData?: string;
  prices?: Record<string, number>;
};

async function syncProductTelegramPost(
  product: typeof products.$inferSelect,
  caption: string,
  replyMarkup: unknown,
) {
  if (product.telegramMessageId) {
    await editTelegramMessage(product.telegramMessageId, caption, replyMarkup);
    return;
  }
  const result = await sendTelegramProduct(product, { caption, replyMarkup });
  await db.update(products).set({
    telegramMessageId: String(result.message.message_id),
    telegramTopicId: result.topicId,
    updatedAt: new Date(),
  }).where(eq(products.id, product.id));
}

function validPriceFormSession(body: PriceFormBody | null) {
  return Boolean(body?.productId && (validPriceFormToken(body.productId, body.token || "") || validWebAppInitData(body.initData || "")));
}

telegramRouter.post("/price-form", async (c) => {
  const body = await c.req.json().catch(() => null) as PriceFormBody | null;
  if (!validPriceFormSession(body) || !body?.productId) return c.json({ error: "Invalid Telegram form session" }, 401);
  const [product] = await db.select().from(products).where(eq(products.id, body.productId)).limit(1);
  if (!product) return c.json({ error: "Product not found" }, 404);
  return c.json({
    data: {
      productId: product.id,
      productName: product.name,
      uniqueId: product.uniqueId,
      prices: product.estimatedPrices ?? { men: 0, woman: 0, boy: 0, girl: 0 },
      status: product.priceStatus,
    },
  });
});

telegramRouter.post("/price-submit", async (c) => {
  const body = await c.req.json().catch(() => null) as PriceFormBody | null;
  if (!validPriceFormSession(body) || !body?.productId) return c.json({ error: "Invalid Telegram form session" }, 401);
  const [product] = await db.select().from(products).where(eq(products.id, body.productId)).limit(1);
  if (!product) return c.json({ error: "Product not found" }, 404);
  const prices = body.prices || {};
  const result = await updateEstimatedPrices(product.id, {
    men: Number(prices.men),
    woman: Number(prices.woman),
    boy: Number(prices.boy),
    girl: Number(prices.girl),
  }, { recordSubmission: true });
  if (!result || result.status !== "submitted") {
    return c.json({ error: "message" in result ? result.message : "All four prices are required" }, 422);
  }
  let telegramUpdated = false;
  try {
    const submittedText = designerEstimateCaption(result.product, "submitted");
    await syncProductTelegramPost(result.product, submittedText, approvalKeyboard(result.product.id));
    telegramUpdated = true;
  } catch (error) {
    logger.error({ error, productId: product.id }, "telegram_price_submission_message_update_failed");
  }
  return c.json({ ok: true, status: "submitted", telegramUpdated });
});

telegramRouter.post("/webhook", async (c) => {
  if (env.TELEGRAM_WEBHOOK_SECRET && c.req.header("x-telegram-bot-api-secret-token") !== env.TELEGRAM_WEBHOOK_SECRET) return c.json({ error: "Invalid webhook secret" }, 401);
  const update = await c.req.json().catch(() => null) as { message?: { text?: string; caption?: string; message_id?: number; chat?: { id?: number; type?: string } }; callback_query?: { id: string; data?: string; message?: { message_id?: number } } } | null;
  if (!update) return c.json({ ok: true });
  const incomingText = update.message?.text || update.message?.caption || "";
  if (update.message?.chat?.id && update.message.chat.type === "private" && incomingText.startsWith("/start")) {
    const payload = incomingText.split(/\s+/, 2)[1] || "";
    const productId = payload.startsWith("price_") ? payload.slice("price_".length) : "";
    const [product] = productId ? await db.select().from(products).where(eq(products.id, productId)).limit(1) : [];
    if (product) {
      const token = createPriceFormToken(product.id);
      await sendTelegramMessage(`<b>${product.uniqueId}</b>\n${product.name}\n\nOpen the secure price form to enter Men, Woman, Boy, and Girl prices.`, { inline_keyboard: [[{ text: "Open Price Form", web_app: { url: `${env.FRONTEND_APP_URL.replace(/\/$/, "")}/telegram/pricing/${product.id}?token=${token}` } }]] }, null, update.message.chat.id);
    } else {
      await sendTelegramMessage("Welcome to Yehager Price Manager. Open this bot from a product's Telegram price button to enter its prices.", undefined, null, update.message.chat.id);
    }
    return c.json({ ok: true });
  }
  if (update.message?.text || update.message?.caption) {
    const result = await processTelegramPriceMessage(incomingText);
    if (result?.status === "submitted" && result.product) {
      const submittedText = designerEstimateCaption(result.product, "submitted");
      await syncProductTelegramPost(result.product, submittedText, approvalKeyboard(result.product.id));
    }
  }
  if (update.callback_query?.data?.startsWith("price:")) {
    const [, action, productId] = update.callback_query.data.split(":");
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (product && action === "edit") {
      await answerTelegramCallbackQuery(update.callback_query.id);
      if (update.callback_query.message?.message_id) {
        await editTelegramMessage(
          update.callback_query.message.message_id,
          designerEstimateCaption(product, product.priceStatus === "rejected" ? "declined" : "submitted"),
          priceEntryKeyboard(product.id, "Open Price Form"),
        );
      }
    } else if (product && (action === "approve" || action === "reject")) {
      const status = action === "approve" ? "approved" : "rejected";
      await db.update(products).set({ priceStatus: status, telegramStatus: status, updatedAt: new Date() }).where(eq(products.id, product.id));
      if (update.callback_query.message?.message_id) await editTelegramMessage(
        update.callback_query.message.message_id,
        designerEstimateCaption(product, action === "approve" ? "approved" : "declined"),
        action === "approve" ? { inline_keyboard: [] } : priceEntryKeyboard(product.id),
      );
    }
  }
  return c.json({ ok: true });
});
