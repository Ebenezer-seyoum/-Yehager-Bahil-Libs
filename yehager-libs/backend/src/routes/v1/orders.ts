import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  createCheckoutIntent,
  getOrderDetailsForAdmin,
  getOrderDetailsForCurrentUser,
  getOrdersForAdmin,
  getOrdersForCurrentUser,
} from "../../services/orders-service.js";
import type { AppBindings } from "../../types/hono.js";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});
const checkoutIntentSchema = z.object({
  cartItemIds: z.array(z.string().uuid()).min(1),
  fulfillmentType: z.enum(["mail", "pickup"]).optional(),
  paymentMethod: z.enum(["stripe_usd", "etb_bank_transfer"]).optional(),
  paymentCurrency: z.enum(["USD", "ETB"]).optional(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  useEventOwnerAddress: z.boolean().optional(),
});

export const ordersRouter = new Hono<AppBindings>();

ordersRouter.get("/me", requireAuth, zValidator("query", querySchema), async (c) => {
  const authUser = c.get("authUser");
  const { limit } = c.req.valid("query");
  const data = await getOrdersForCurrentUser(authUser?.email, limit ?? 50);
  return c.json({ data });
});

ordersRouter.get("/me/:orderId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const orderId = c.req.param("orderId");
  const data = await getOrderDetailsForCurrentUser({ orderId, userEmail: authUser?.email });
  return c.json({ data });
});

ordersRouter.post("/checkout-intent", requireAuth, zValidator("json", checkoutIntentSchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  const data = await createCheckoutIntent({
    userEmail: authUser?.email,
    cartItemIds: body.cartItemIds,
    fulfillmentType: body.fulfillmentType,
    paymentMethod: body.paymentMethod,
    paymentCurrency: body.paymentCurrency,
    shippingAddress: body.shippingAddress,
    useEventOwnerAddress: body.useEventOwnerAddress,
  });
  return c.json({ data }, 201);
});

ordersRouter.get("/", requireAuth, requireRole("admin"), zValidator("query", querySchema), async (c) => {
  const { limit } = c.req.valid("query");
  const data = await getOrdersForAdmin(limit ?? 100);
  return c.json({ data });
});

ordersRouter.get("/:orderId", requireAuth, requireRole("admin"), async (c) => {
  const orderId = c.req.param("orderId");
  const data = await getOrderDetailsForAdmin(orderId);
  return c.json({ data });
});
