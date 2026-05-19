import { Hono } from "hono";
import { requireAuth, requireAuthenticatedToken } from "../../middleware/auth.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  changeCurrentUserPassword,
  getCurrentUserByEmail,
  syncCurrentUserFromAuth,
  updateCurrentUserProfile,
} from "../../services/users-service.js";
import type { AppBindings } from "../../types/hono.js";

export const usersRouter = new Hono<AppBindings>();

const profilePatchSchema = z.object({
  name: z.string().trim().min(1).max(255),
});

const passwordPatchSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});

usersRouter.get("/me", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const user = await getCurrentUserByEmail(authUser?.email);
  return c.json({ data: user });
});

usersRouter.patch("/me", requireAuth, zValidator("json", profilePatchSchema), async (c) => {
  const authUser = c.get("authUser");
  const { name } = c.req.valid("json");
  const user = await updateCurrentUserProfile({
    email: authUser?.email ?? "",
    name,
  });
  return c.json({ data: user });
});

usersRouter.patch("/me/password", requireAuth, zValidator("json", passwordPatchSchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  const user = await changeCurrentUserPassword({
    email: authUser?.email ?? "",
    ...body,
  });
  return c.json({ data: user });
});

usersRouter.post("/me/sync", requireAuthenticatedToken, async (c) => {
  const authUser = c.get("authUser");
  const user = await syncCurrentUserFromAuth({
    sub: authUser?.sub ?? "",
    email: authUser?.email,
    role: authUser?.role,
  });

  return c.json({ data: user }, 201);
});
