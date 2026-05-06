import { Hono } from "hono";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { getPublicUsdEtb, refreshUsdEtbFromOpenEr } from "../../services/exchange-rate-service.js";
import type { AppBindings } from "../../types/hono.js";

export const exchangeRateRouter = new Hono<AppBindings>();

exchangeRateRouter.get("/", async (c) => {
  const data = await getPublicUsdEtb();
  if (!data) {
    return c.json({ data: null, message: "No USD→ETB rate configured yet" });
  }
  return c.json({ data });
});

exchangeRateRouter.post("/refresh", requireAuth, requireRole("admin"), async (c) => {
  const data = await refreshUsdEtbFromOpenEr();
  return c.json({ data }, 201);
});
