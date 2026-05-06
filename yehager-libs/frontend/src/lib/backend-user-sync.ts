import "server-only";

import { cache } from "react";
import { apiRequest } from "@/lib/api-client";

/**
 * Ensure authenticated frontend users exist in backend `users` table.
 * This endpoint is idempotent (upsert semantics), so it's safe to call
 * before protected data operations.
 */
export const ensureBackendUserSynced = cache(async () => {
  try {
    await apiRequest("/api/v1/users/me/sync", {
      method: "POST",
    });
  } catch {
    // Best-effort bootstrap; protected page handlers still surface
    // downstream auth/data errors through their own logic.
  }
});
