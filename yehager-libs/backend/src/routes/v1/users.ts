import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import { getCurrentUserByEmail, syncCurrentUserFromAuth } from "../../services/users-service.js";
import type { AppBindings } from "../../types/hono.js";

export const usersRouter = new Hono<AppBindings>();

usersRouter.get("/me", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const user = await getCurrentUserByEmail(authUser?.email);
  return c.json({ data: user });
});

usersRouter.post("/me/sync", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const user = await syncCurrentUserFromAuth({
    sub: authUser?.sub ?? "",
    email: authUser?.email,
    role: authUser?.role,
  });

  return c.json({ data: user }, 201);
});
