import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../../middleware/auth.js";
import {
  authenticateUser,
  requestPasswordResetByEmail,
  resendCustomerRegistrationCode,
  startCustomerRegistration,
  verifyCustomerRegistration,
} from "../../services/users-service.js";
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

const verifyRegistrationSchema = z.object({
  email: z.string().trim().email().max(320),
  code: z.string().trim().regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

authRouter.post("/register", zValidator("json", registerSchema), async (c) => {
  const payload = c.req.valid("json");
  c.get("log")?.info({ email: payload.email }, "auth_register_attempt");
  const data = await startCustomerRegistration(payload);
  c.get("log")?.info({ email: data.email }, "auth_register_verification_sent");
  return c.json({ data }, 202);
});

authRouter.post("/register/start", zValidator("json", registerSchema), async (c) => {
  const payload = c.req.valid("json");
  c.get("log")?.info({ email: payload.email }, "auth_register_start_attempt");
  const data = await startCustomerRegistration(payload);
  return c.json({ data }, 202);
});

authRouter.post("/register/verify", zValidator("json", verifyRegistrationSchema), async (c) => {
  const payload = c.req.valid("json");
  c.get("log")?.info({ email: payload.email }, "auth_register_verify_attempt");
  const user = await verifyCustomerRegistration(payload);
  c.get("log")?.info({ userId: user?.id, email: user?.email, role: user?.role }, "auth_register_success");
  return c.json({ data: user }, 201);
});

authRouter.post("/register/resend-code", zValidator("json", passwordResetRequestSchema), async (c) => {
  const payload = c.req.valid("json");
  const data = await resendCustomerRegistrationCode(payload);
  return c.json({ data });
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
