import { Hono } from "hono";
import { pgPool } from "../lib/db/drizzle.js";
import type { AppBindings } from "../types/hono.js";

export const healthRouter = new Hono<AppBindings>();

/** Liveness: process is up; safe for orchestrator probes that should not hit the DB */
healthRouter.get("/", (c) =>
  c.json({
    status: "ok",
    service: "yehager-api",
    timestamp: new Date().toISOString(),
  }),
);

/** Readiness: PostgreSQL reachable */
healthRouter.get("/ready", async (c) => {
  try {
    await pgPool.query("select 1");
    return c.json({
      status: "ready",
      service: "yehager-api",
      checks: { database: "ok" },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    c.get("log").warn({ err }, "Readiness check failed");
    return c.json(
      {
        status: "not_ready",
        service: "yehager-api",
        checks: { database: "error" },
        timestamp: new Date().toISOString(),
      },
      503,
    );
  }
});
