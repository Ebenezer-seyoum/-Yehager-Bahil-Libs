import { Hono } from "hono";
import type { AppBindings } from "../../types/hono.js";
import { adminRouter } from "./admin.js";
import { authRouter } from "./auth.js";
import { cartRouter } from "./cart.js";
import { eventsRouter } from "./events.js";
import { exchangeRateRouter } from "./exchange-rate.js";
import { familyGroupsRouter } from "./family-groups.js";
import { measurementsRouter } from "./measurements.js";
import { ordersRouter } from "./orders.js";
import { paymentsRouter } from "./payments.js";
import { productsRouter } from "./products.js";
import { uploadsRouter } from "./uploads.js";
import { usersRouter } from "./users.js";

export const v1Router = new Hono<AppBindings>();

v1Router.route("/auth", authRouter);
v1Router.route("/users", usersRouter);
v1Router.route("/exchange-rate", exchangeRateRouter);
v1Router.route("/measurements", measurementsRouter);
v1Router.route("/events", eventsRouter);
v1Router.route("/family-groups", familyGroupsRouter);
v1Router.route("/products", productsRouter);
v1Router.route("/cart", cartRouter);
v1Router.route("/orders", ordersRouter);
v1Router.route("/payments", paymentsRouter);
v1Router.route("/uploads", uploadsRouter);
v1Router.route("/admin", adminRouter);
