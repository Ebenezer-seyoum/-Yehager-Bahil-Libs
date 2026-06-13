import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { PERMISSIONS } from "../../lib/auth/permissions.js";
import { getPublicUsdEtb, refreshUsdEtbFromOpenEr, setManualUsdEtbRate } from "../../services/exchange-rate-service.js";
import type { AppBindings } from "../../types/hono.js";

export const exchangeRateRouter = new Hono<AppBindings>();

exchangeRateRouter.get("/", async (c) => {
  const data = await getPublicUsdEtb();
  if (!data) {
    return c.json({ data: null, message: "No USD→ETB rate configured yet" });
  }
  return c.json({ data });
});

exchangeRateRouter.post("/refresh", requireAuth, requirePermission(PERMISSIONS.EXCHANGE_EDIT), async (c) => {
  const data = await refreshUsdEtbFromOpenEr();
  return c.json({ data }, 201);
});

exchangeRateRouter.patch(
  "/",
  requireAuth,
  requirePermission(PERMISSIONS.EXCHANGE_EDIT),
  zValidator("json", z.object({ rate: z.coerce.number().positive() })),
  async (c) => {
    const authUser = c.get("authUser");
    const { rate } = c.req.valid("json");
    const data = await setManualUsdEtbRate({ rate, performedBy: authUser?.email });
    return c.json({ data });
  },
);
