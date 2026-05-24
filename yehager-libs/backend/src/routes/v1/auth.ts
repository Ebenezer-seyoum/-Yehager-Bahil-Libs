import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../../middleware/auth.js";
import { authenticateUser, registerCustomer, requestPasswordResetByEmail } from "../../services/users-service.js";
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

const passwordResetRequestSchema = z.object({
  email: z.string().trim().email().max(320),
});

authRouter.post("/register", zValidator("json", registerSchema), async (c) => {
  const payload = c.req.valid("json");
  c.get("log")?.info({ email: payload.email }, "auth_register_attempt");
  const user = await registerCustomer(payload);
  c.get("log")?.info({ userId: user?.id, email: user?.email, role: user?.role }, "auth_register_success");
  return c.json({ data: user }, 201);
});

authRouter.post("/login", zValidator("json", loginSchema), async (c) => {
  const payload = c.req.valid("json");
  c.get("log")?.info({ email: payload.email }, "auth_login_attempt");
  const user = await authenticateUser(payload);
  c.get("log")?.info({ userId: user?.id, email: user?.email, role: user?.role }, "auth_login_success");
  return c.json({ data: user });
});

authRouter.post("/password-reset", zValidator("json", passwordResetRequestSchema), async (c) => {
  const payload = c.req.valid("json");
  c.get("log")?.info({ email: payload.email }, "auth_password_reset_request");
  const data = await requestPasswordResetByEmail(payload);
  return c.json({ data });
});

authRouter.get("/session", requireAuth, (c) => {
  const user = c.get("authUser");
  return c.json({
    user,
  });
});
