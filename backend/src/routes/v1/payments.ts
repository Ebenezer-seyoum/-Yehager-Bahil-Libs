import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../../middleware/auth.js";
import { createStripeCheckoutSession, processStripeWebhook } from "../../services/payments-service.js";
import type { AppBindings } from "../../types/hono.js";

const checkoutSessionSchema = z.object({
  orderId: z.string().uuid(),
  successPath: z.string().optional(),
  cancelPath: z.string().optional(),
});

export const paymentsRouter = new Hono<AppBindings>();

paymentsRouter.post("/stripe/checkout-session", requireAuth, zValidator("json", checkoutSessionSchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  const data = await createStripeCheckoutSession({
    orderId: body.orderId,
    userEmail: authUser?.email,
    successPath: body.successPath,
    cancelPath: body.cancelPath,
  });
  return c.json({ data }, 201);
});

paymentsRouter.post("/stripe/webhook", async (c) => {
  const body = await c.req.raw.text();
  const signature = c.req.header("stripe-signature");
  const data = await processStripeWebhook({ body, signature });
  return c.json(data);
});
