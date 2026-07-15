import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import type { AppBindings } from "../../types/hono.js";
import { env } from "../../config/env.js";
import { db } from "../../lib/db/drizzle.js";
import { products } from "../../lib/db/schema.js";
import { answerTelegramCallbackQuery, approvalKeyboard, editTelegramMessage, priceSummary, processTelegramPriceMessage, sendTelegramMessage } from "../../services/telegram-pricing-service.js";

export const telegramRouter = new Hono<AppBindings>();

telegramRouter.post("/webhook", async (c) => {
  if (env.TELEGRAM_WEBHOOK_SECRET && c.req.header("x-telegram-bot-api-secret-token") !== env.TELEGRAM_WEBHOOK_SECRET) return c.json({ error: "Invalid webhook secret" }, 401);
  const update = await c.req.json().catch(() => null) as { message?: { text?: string; caption?: string; message_id?: number }; callback_query?: { id: string; data?: string; message?: { message_id?: number } } } | null;
  if (!update) return c.json({ ok: true });
  if (update.message?.text || update.message?.caption) {
    const result = await processTelegramPriceMessage(update.message.text || update.message.caption || "");
    if (result?.status === "submitted" && result.product) {
      const submittedText = `${priceSummary(result.product)}\n\n<b>✅ PRICE SUBMITTED SUCCESSFULLY</b>\nPending admin approval.`;
      if (result.product.telegramMessageId) {
        await editTelegramMessage(result.product.telegramMessageId, submittedText, approvalKeyboard(result.product.id));
      } else {
        await sendTelegramMessage(submittedText, approvalKeyboard(result.product.id), result.product.telegramTopicId);
      }
    }
  }
  if (update.callback_query?.data?.startsWith("price:")) {
    const [, action, productId] = update.callback_query.data.split(":");
    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (product && action === "edit") {
      await answerTelegramCallbackQuery(update.callback_query.id);
      await sendTelegramMessage(
        `<b>${product.uniqueId}</b>\nEnter only these four prices:\n<code>${product.uniqueId}\nMen: 0 ETB\nWoman: 0 ETB\nBoy: 0 ETB\nGirl: 0 ETB</code>`,
        { force_reply: true, selective: true },
        product.telegramTopicId,
      );
    } else if (product && (action === "approve" || action === "reject")) {
      const status = action === "approve" ? "approved" : "rejected";
      await db.update(products).set({ priceStatus: status, telegramStatus: status, updatedAt: new Date() }).where(eq(products.id, product.id));
      if (update.callback_query.message?.message_id) await editTelegramMessage(update.callback_query.message.message_id, `${priceSummary(product)}\n\n<b>${action === "approve" ? "✅ APPROVED" : "🔴 REJECTED - PLEASE ENTER PRICE AGAIN"}</b>`);
    }
  }
  return c.json({ ok: true });
});
