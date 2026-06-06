import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppBindings } from "./types/hono.js";
import { env } from "./config/env.js";
import { onError } from "./middleware/error-handler.js";
import { requestContext } from "./middleware/request-context.js";
import { healthRouter } from "./routes/health.js";
import { v1Router } from "./routes/v1/index.js";

export function createApp() {
  const app = new Hono<AppBindings>();

  app.use("*", requestContext);
  app.use(
    "*",
    cors({
      origin: env.NEXTAUTH_URL,
      credentials: true,
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "x-request-id"],
    }),
  );

  app.onError(onError);

  app.route("/health", healthRouter);
  app.route("/api/v1", v1Router);

  return app;
}
