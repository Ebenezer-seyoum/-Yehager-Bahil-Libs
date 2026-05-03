import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../lib/logger.js";

export function onError(error: unknown, c: Context) {
  const requestId = c.get("requestId") ?? "unknown";

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

  logger.error({ error, requestId }, "Unhandled API error");
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
