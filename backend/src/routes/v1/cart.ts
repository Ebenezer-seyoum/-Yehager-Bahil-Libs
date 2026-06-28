import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../../middleware/auth.js";
import {
  addItemToCart,
  changeCartItemQuantity,
  getCartForUser,
  removeCartItem,
} from "../../services/cart-service.js";
import type { AppBindings } from "../../types/hono.js";

const addItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
  measurementId: z.string().uuid().optional(),
  measurementSnapshot: z.record(z.string(), z.unknown()).optional(),
  eventId: z.string().uuid().optional(),
  eventName: z.string().optional(),
  roleLabel: z.string().optional(),
});

const patchQuantitySchema = z.object({
  quantity: z.number().int().positive(),
});

export const cartRouter = new Hono<AppBindings>();

cartRouter.get("/", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const items = await getCartForUser(authUser?.email);
  return c.json({ data: items });
});

cartRouter.post("/", requireAuth, zValidator("json", addItemSchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  const item = await addItemToCart({
    userEmail: authUser?.email,
    productId: body.productId,
    quantity: body.quantity,
    measurementId: body.measurementId,
    measurementSnapshot: body.measurementSnapshot,
    eventId: body.eventId,
    eventName: body.eventName,
    roleLabel: body.roleLabel,
  });
  return c.json({ data: item }, 201);
});

cartRouter.patch("/:itemId", requireAuth, zValidator("json", patchQuantitySchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  const itemId = c.req.param("itemId");

  const item = await changeCartItemQuantity({
    userEmail: authUser?.email,
    itemId,
    quantity: body.quantity,
  });
  return c.json({ data: item });
});

cartRouter.delete("/:itemId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const itemId = c.req.param("itemId");
  await removeCartItem({ userEmail: authUser?.email, itemId });
  return c.body(null, 204);
});
