import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requireAuth, requireAuthenticatedToken } from "../../middleware/auth.js";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  changeCurrentUserPassword,
  getCurrentUserByEmail,
  syncCurrentUserFromAuth,
  updateCurrentUserProfile,
  updateCurrentUserPresence,
} from "../../services/users-service.js";
import type { AppBindings } from "../../types/hono.js";
import { getDashboardPreferences, updateDashboardPreferences } from "../../services/dashboard-preferences-service.js";

export const usersRouter = new Hono<AppBindings>();

const profilePatchSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  address: z.string().trim().max(1000).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  avatarUrl: z.string().trim().url().nullable().optional(),
  profile: z
    .object({
      firstName: z.string().trim().min(1).max(120).optional(),
      fatherName: z.string().trim().min(1).max(120).optional(),
      grandfatherName: z.string().trim().max(120).nullable().optional(),
      gender: z.string().trim().min(1).max(20).optional(),
      dateOfBirth: z.string().trim().nullable().optional(),
      maritalStatus: z.string().trim().nullable().optional(),
      country: z.string().trim().nullable().optional(),
      city: z.string().trim().nullable().optional(),
      address: z.string().trim().nullable().optional(),
      employmentType: z.string().trim().nullable().optional(),
      startDate: z.string().trim().nullable().optional(),
      inviteStatus: z.string().trim().nullable().optional(),
      notes: z.string().trim().nullable().optional(),
    })
    .optional(),
}).refine((value) => Boolean(value.name || value.phone !== undefined || value.address !== undefined || value.country !== undefined || value.city !== undefined || value.notes !== undefined || value.avatarUrl !== undefined || value.profile), {
  message: "At least one field must be provided",
});

const presenceSchema = z.object({
  online: z.boolean(),
});

const passwordPatchSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});
const dashboardPreferencesSchema = z.object({
  topBarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  sidebarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

usersRouter.get("/me", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const user = await getCurrentUserByEmail(authUser?.email);
  return c.json({ data: user });
});

usersRouter.patch("/me", requireAuth, zValidator("json", profilePatchSchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  const user = await updateCurrentUserProfile({
    email: authUser?.email ?? "",
    ...body,
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

usersRouter.get("/me/dashboard-preferences", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  return c.json({ data: await getDashboardPreferences(authUser?.email ?? "") });
});

usersRouter.patch("/me/dashboard-preferences", requireAuth, zValidator("json", dashboardPreferencesSchema), async (c) => {
  const authUser = c.get("authUser");
  try {
    return c.json({ data: await updateDashboardPreferences(authUser?.email ?? "", c.req.valid("json")) });
  } catch (error) {
    throw new HTTPException(400, { message: error instanceof Error ? error.message : "Could not save dashboard preferences" });
  }
});

usersRouter.post("/me/presence", requireAuth, zValidator("json", presenceSchema), async (c) => {
  const authUser = c.get("authUser");
  const body = c.req.valid("json");
  const user = await updateCurrentUserPresence({
    email: authUser?.email ?? "",
    online: body.online,
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
