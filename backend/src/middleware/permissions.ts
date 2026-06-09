import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { getUserByEmail } from "../repositories/users-repository.js";
import { hasAnyPermission, hasPermission } from "../services/permissions-service.js";
import type { AppBindings } from "../types/hono.js";

async function getAuthenticatedUser(c: Parameters<MiddlewareHandler<AppBindings>>[0]) {
  const authUser = c.get("authUser");
  if (!authUser?.email) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const currentUser = await getUserByEmail(authUser.email);
  if (!currentUser || currentUser.status !== "active") {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  return currentUser;
}

export function requirePermission(permissionKey: string): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const user = await getAuthenticatedUser(c);
    // Admin role bypasses all permission checks
    if (user.role === "admin") {
      await next();
      return;
    }
    if (!(await hasPermission(user.id, permissionKey))) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  };
}

export function requireAnyPermission(permissionKeys: string[]): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const user = await getAuthenticatedUser(c);
    // Admin role bypasses all permission checks
    if (user.role === "admin") {
      await next();
      return;
    }
    if (!(await hasAnyPermission(user.id, permissionKeys))) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  };
}
