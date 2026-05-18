import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../../middleware/auth.js";
import { authenticateUser, registerCustomer } from "../../services/users-service.js";
import type { AppBindings } from "../../types/hono.js";

export const authRouter = new Hono<AppBindings>();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(1).max(128),
});

authRouter.post("/register", zValidator("json", registerSchema), async (c) => {
  const user = await registerCustomer(c.req.valid("json"));
  return c.json({ data: user }, 201);
});

authRouter.post("/login", zValidator("json", loginSchema), async (c) => {
  const user = await authenticateUser(c.req.valid("json"));
  return c.json({ data: user });
});

authRouter.get("/session", requireAuth, (c) => {
  const user = c.get("authUser");
  return c.json({
    user,
  });
});
