import { Hono } from "hono";
import type { AppBindings } from "../types/hono.js";

export const healthRouter = new Hono<AppBindings>();

healthRouter.get("/", (c) =>
  c.json({
    status: "ok",
    service: "yehager-api",
    timestamp: new Date().toISOString(),
  }),
);
