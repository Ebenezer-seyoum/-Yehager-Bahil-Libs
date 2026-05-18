import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { getUserByEmail } from "../repositories/users-repository.js";
import { hasAnyPermission, hasPermission } from "../services/permissions-service.js";
import type { AppBindings } from "../types/hono.js";

async function getAuthenticatedUserId(c: Parameters<MiddlewareHandler<AppBindings>>[0]) {
  const authUser = c.get("authUser");
  if (!authUser?.email) {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  const currentUser = await getUserByEmail(authUser.email);
  if (!currentUser || currentUser.status !== "active") {
    throw new HTTPException(403, { message: "Forbidden" });
  }

  return currentUser.id;
}

export function requirePermission(permissionKey: string): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const userId = await getAuthenticatedUserId(c);
    if (!(await hasPermission(userId, permissionKey))) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  };
}

export function requireAnyPermission(permissionKeys: string[]): MiddlewareHandler<AppBindings> {
  return async (c, next) => {
    const userId = await getAuthenticatedUserId(c);
    if (!(await hasAnyPermission(userId, permissionKeys))) {
      throw new HTTPException(403, { message: "Forbidden" });
    }
    await next();
  };
}
