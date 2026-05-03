import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth.js";
import type { AppBindings } from "../../types/hono.js";

export const authRouter = new Hono<AppBindings>();

authRouter.get("/session", requireAuth, (c) => {
  const user = c.get("authUser");
  return c.json({
    user,
  });
});
