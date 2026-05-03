import { HTTPException } from "hono/http-exception";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { auditLogs, orders, products } from "../lib/db/schema.js";
import { listCartItemsByIdsForUser } from "../repositories/cart-repository.js";
import {
  getOrderById,
  getOrderByIdForUser,
  listAllOrders,
  listOrdersByUserEmail,
} from "../repositories/orders-repository.js";
import { getUserByEmail } from "../repositories/users-repository.js";
import { buildCheckoutLines, computeTotals, generateOrderNumber, numberToMoney } from "./checkout-utils.js";

export async function getOrdersForCurrentUser(userEmail?: string, limit = 50) {
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  return listOrdersByUserEmail(userEmail, limit);
}

export async function getOrderDetailsForCurrentUser(payload: { orderId: string; userEmail?: string }) {
  if (!payload.userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const order = await getOrderByIdForUser({ orderId: payload.orderId, userEmail: payload.userEmail });
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  return order;
}

export async function getOrdersForAdmin(limit = 100) {
  return listAllOrders(limit);
}

export async function getOrderDetailsForAdmin(orderId: string) {
  const order = await getOrderById(orderId);
  if (!order) {
    throw new HTTPException(404, { message: "Order not found" });
  }
  return order;
}

export async function createCheckoutIntent(payload: {
  userEmail?: string;
  cartItemIds: string[];
  fulfillmentType?: "mail" | "pickup";
  paymentMethod?: "stripe_usd" | "etb_bank_transfer";
  paymentCurrency?: "USD" | "ETB";
  shippingAddress?: Record<string, unknown>;
  useEventOwnerAddress?: boolean;
}) {
  const userEmail = payload.userEmail;
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  if (!payload.cartItemIds.length) {
    throw new HTTPException(400, { message: "At least one cart item is required" });
  }

  return db.transaction(async (tx) => {
    const cartRows = await listCartItemsByIdsForUser({
      itemIds: payload.cartItemIds,
      userEmail,
    });
    if (!cartRows.length) {
      throw new HTTPException(404, { message: "No matching cart items found" });
    }

    const productIds = [...new Set(cartRows.map((row) => row.productId).filter((id): id is string => Boolean(id)))];
    const dbProducts = productIds.length
      ? await tx.query.products.findMany({
          where: and(inArray(products.id, productIds), eq(products.isActive, true)),
        })
      : [];

    const productPriceMap = new Map(dbProducts.map((p) => [p.id, p.priceUsd]));

    const lineInputs = cartRows.map((row) => {
      const trustedUnitPriceUsd = row.productId ? productPriceMap.get(row.productId) ?? row.priceUsd : row.priceUsd;
      return {
        cartItemId: row.id,
        productId: row.productId,
        productName: row.productName,
        quantity: row.quantity,
        trustedUnitPriceUsd,
        measurementId: row.measurementId,
      };
    });

    const lines = buildCheckoutLines(lineInputs);
    const totals = computeTotals(lines, 0);

    const user = await getUserByEmail(userEmail);
    const customerName = user?.name ?? userEmail.split("@")[0];
    const orderNumber = generateOrderNumber();

    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        userId: user?.id,
        userEmail,
        customerName,
        items: lines.map((line) => ({
          cart_item_id: line.cartItemId,
          product_id: line.productId,
          product_name: line.productName,
          quantity: line.quantity,
          unit_price_usd: line.unitPriceUsd,
          line_total_usd: line.lineTotalUsd,
          measurement_id: line.measurementId,
        })),
        totalUsd: numberToMoney(totals.totalUsd),
        shippingCostUsd: numberToMoney(totals.shippingCostUsd),
        status: "pending",
        paymentStatus: "pending",
        paymentMethod: payload.paymentMethod ?? "stripe_usd",
        paymentCurrency: payload.paymentCurrency ?? "USD",
        fulfillmentType: payload.fulfillmentType ?? "mail",
        shippingAddress: payload.shippingAddress,
        useEventOwnerAddress: Boolean(payload.useEventOwnerAddress),
      })
      .returning();

    await tx.insert(auditLogs).values({
      action: "checkout_intent_created",
      category: "order",
      severity: "info",
      entityType: "order",
      entityId: order.id,
      performedBy: userEmail,
      details: `Checkout intent created with ${lines.length} item(s)`,
      metadata: {
        order_number: order.orderNumber,
        cart_item_ids: payload.cartItemIds,
        total_usd: totals.totalUsd,
      },
    });

    return {
      order,
      totals,
      lines,
    };
  });
}
