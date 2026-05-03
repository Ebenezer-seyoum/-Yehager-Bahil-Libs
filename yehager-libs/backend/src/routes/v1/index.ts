import { Hono } from "hono";
import type { AppBindings } from "../../types/hono.js";
import { authRouter } from "./auth.js";
import { cartRouter } from "./cart.js";
import { ordersRouter } from "./orders.js";
import { paymentsRouter } from "./payments.js";
import { productsRouter } from "./products.js";
import { uploadsRouter } from "./uploads.js";
import { usersRouter } from "./users.js";

export const v1Router = new Hono<AppBindings>();

v1Router.route("/auth", authRouter);
v1Router.route("/users", usersRouter);
v1Router.route("/products", productsRouter);
v1Router.route("/cart", cartRouter);
v1Router.route("/orders", ordersRouter);
v1Router.route("/payments", paymentsRouter);
v1Router.route("/uploads", uploadsRouter);
