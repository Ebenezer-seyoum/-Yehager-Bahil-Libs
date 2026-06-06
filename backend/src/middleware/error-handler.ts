import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../lib/logger.js";
import type { AppBindings } from "../types/hono.js";

export function onError(error: unknown, c: Context<AppBindings>) {
  const requestId = c.get("requestId") ?? "unknown";
  const scoped = c.get("log") ?? logger.child({ requestId });

  if (error instanceof HTTPException) {
    return c.json(
      {
        error: {
          code: error.status,
          message: error.message,
        },
        requestId,
      },
      error.status,
    );
  }

  scoped.error({ err: error }, "Unhandled API error");
  return c.json(
    {
      error: {
        code: 500,
        message: "Internal Server Error",
      },
      requestId,
    },
    500,
  );
}
