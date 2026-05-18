import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyAccessToken } from "../lib/auth/token.js";
import { getUserByEmail } from "../repositories/users-repository.js";
import type { AppBindings } from "../types/hono.js";

export const requireAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const authHeader = c.req.header("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    throw new HTTPException(401, { message: "Missing Bearer token" });
  }

  try {
    const user = await verifyAccessToken(token);
    if (!user.sub) {
      throw new HTTPException(401, { message: "Invalid token subject" });
    }

    if (user.email) {
      const currentUser = await getUserByEmail(user.email);
      if (!currentUser || currentUser.status !== "active") {
        throw new HTTPException(401, { message: "Unauthorized" });
      }
    }

    c.set("authUser", user);
    await next();
  } catch {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
};

export function requireRole(...allowedRoles: string[]): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const user = c.get("authUser");
    if (!user?.email) {
      throw new HTTPException(403, { message: "Forbidden" });
    }

    const currentUser = await getUserByEmail(user.email);
    const currentRole = currentUser?.role ?? user.role;
    if (!currentRole || !allowedRoles.includes(currentRole)) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  };
}
