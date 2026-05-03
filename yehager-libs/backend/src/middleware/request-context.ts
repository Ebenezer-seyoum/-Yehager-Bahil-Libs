import type { MiddlewareHandler } from "hono";
import { randomUUID } from "node:crypto";
import type { AppBindings } from "../types/hono.js";

export const requestContext: MiddlewareHandler<AppBindings> = async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? randomUUID();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
};
