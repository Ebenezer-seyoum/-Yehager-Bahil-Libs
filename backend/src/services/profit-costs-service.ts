import { desc, eq } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { auditLogs, orders, products, profitCostSettings } from "../lib/db/schema.js";
import { moneyToNumber, numberToMoney } from "./checkout-utils.js";

type CostSetting = typeof profitCostSettings.$inferSelect;

function isCustomOrder(order: typeof orders.$inferSelect) {
  if (order.orderType === "custom_order" || order.orderType === "custom_design_order") return true;
  return Array.isArray(order.items) && order.items.some((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return row.uploaded_design_id || row.uploadedDesignId || row.item_type === "custom_design" || row.itemType === "custom_design";
  });
}

function baseSetting(): CostSetting {
  const now = new Date();
  return {
    id: "default",
    entityType: "default",
    entityId: "default",
    productCostUsd: "0",
    taxPercent: "0",
    designerCostUsd: "0",
    otherCostUsd: "0",
    designerPaymentPolicy: "none",
    designerPaymentStatus: "unpaid",
    designerPaidUsd: "0",
    internalNote: null,
    updatedBy: null,
    createdAt: now,
    updatedAt: now,
  };
}

function key(entityType: string, entityId = "default") {
  return `${entityType}:${entityId}`;
}

function calculateProfit(row: {
  entityType: "product" | "custom_order";
  entityId: string;
  title: string;
  customerName?: string | null;
  customerEmail?: string | null;
  revenueUsd: string | number | null | undefined;
  setting: CostSetting;
  orderNumber?: string | null;
  status?: string | null;
}) {
  const revenue = moneyToNumber(row.revenueUsd);
  const productCost = moneyToNumber(row.setting.productCostUsd);
  const taxPercent = moneyToNumber(row.setting.taxPercent);
  const taxAmount = revenue * (taxPercent / 100);
  const designerCost = moneyToNumber(row.setting.designerCostUsd);
  const otherCost = moneyToNumber(row.setting.otherCostUsd);
  const totalCost = productCost + taxAmount + designerCost + otherCost;
  const netProfit = revenue - totalCost;
  const marginPercent = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const designerPaid = moneyToNumber(row.setting.designerPaidUsd);

  return {
    ...row,
    revenueUsd: numberToMoney(revenue),
    productCostUsd: numberToMoney(productCost),
    taxPercent: numberToMoney(taxPercent),
    taxAmountUsd: numberToMoney(taxAmount),
    designerCostUsd: numberToMoney(designerCost),
    otherCostUsd: numberToMoney(otherCost),
    totalCostUsd: numberToMoney(totalCost),
    netProfitUsd: numberToMoney(netProfit),
    marginPercent: numberToMoney(marginPercent),
    designerPaymentPolicy: row.setting.designerPaymentPolicy,
    designerPaymentStatus: row.setting.designerPaymentStatus,
    designerPaidUsd: numberToMoney(designerPaid),
    designerRemainingUsd: numberToMoney(Math.max(designerCost - designerPaid, 0)),
    internalNote: row.setting.internalNote,
    hasCustomCost: row.setting.entityType === row.entityType && row.setting.entityId === row.entityId,
    updatedAt: row.setting.updatedAt,
  };
}

export async function getProfitCostsWorkspacePayload() {
  const [settings, productRows, orderRows] = await Promise.all([
    db.select().from(profitCostSettings),
    db.select().from(products).orderBy(desc(products.createdAt)).limit(300),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(300),
  ]);

  const settingsByKey = new Map(settings.map((setting) => [key(setting.entityType, setting.entityId), setting]));
  const defaults = settingsByKey.get(key("default")) ?? baseSetting();

  const catalogProducts = productRows.map((product) =>
    calculateProfit({
      entityType: "product",
      entityId: product.id,
      title: product.name,
      revenueUsd: product.priceUsd,
      setting: settingsByKey.get(key("product", product.id)) ?? defaults,
      status: product.isActive ? "active" : "hidden",
    }),
  );

  const customOrders = orderRows
    .filter(isCustomOrder)
    .map((order) =>
      calculateProfit({
        entityType: "custom_order",
        entityId: order.id,
        title: order.orderNumber,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.userEmail,
        revenueUsd: order.totalUsd,
        setting: settingsByKey.get(key("custom_order", order.id)) ?? defaults,
        status: order.status,
      }),
    );

  const designerPayments = customOrders
    .filter((row) => moneyToNumber(row.designerCostUsd) > 0 || row.designerPaymentPolicy !== "none")
    .map((row) => ({
      entityType: row.entityType,
      entityId: row.entityId,
      orderNumber: row.orderNumber,
      customerName: row.customerName,
      customerEmail: row.customerEmail,
      designerCostUsd: row.designerCostUsd,
      designerPaidUsd: row.designerPaidUsd,
      designerRemainingUsd: row.designerRemainingUsd,
      designerPaymentPolicy: row.designerPaymentPolicy,
      designerPaymentStatus: row.designerPaymentStatus,
      updatedAt: row.updatedAt,
    }));

  return {
    defaults,
    catalogProducts,
    customOrders,
    designerPayments,
  };
}

export async function upsertProfitCostSettingForAdmin(payload: {
  entityType: "default" | "product" | "custom_order";
  entityId?: string | null;
  productCostUsd: number;
  taxPercent: number;
  designerCostUsd: number;
  otherCostUsd: number;
  designerPaymentPolicy?: "none" | "fifty_fifty" | "paid_100";
  designerPaymentStatus?: "unpaid" | "advance_paid" | "fully_paid";
  designerPaidUsd?: number;
  internalNote?: string | null;
  performedBy?: string | null;
}) {
  const entityId = payload.entityType === "default" ? "default" : payload.entityId;
  if (!entityId) throw new Error("Entity id is required for product and custom order cost settings");

  const values = {
    entityType: payload.entityType,
    entityId,
    productCostUsd: numberToMoney(payload.productCostUsd),
    taxPercent: numberToMoney(payload.taxPercent),
    designerCostUsd: numberToMoney(payload.designerCostUsd),
    otherCostUsd: numberToMoney(payload.otherCostUsd),
    designerPaymentPolicy: payload.designerPaymentPolicy ?? "none",
    designerPaymentStatus: payload.designerPaymentStatus ?? "unpaid",
    designerPaidUsd: numberToMoney(payload.designerPaidUsd ?? 0),
    internalNote: payload.internalNote?.trim() || null,
    updatedBy: payload.performedBy ?? "admin",
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(profitCostSettings)
    .values(values)
    .onConflictDoUpdate({
      target: [profitCostSettings.entityType, profitCostSettings.entityId],
      set: values,
    })
    .returning();

  await db.insert(auditLogs).values({
    action: "profit_cost_setting_saved",
    category: "finance",
    severity: "info",
    entityType: "profit_cost_setting",
    entityId: row.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Profit and cost setting saved",
    metadata: {
      cost_entity_type: row.entityType,
      cost_entity_id: row.entityId,
      product_cost_usd: row.productCostUsd,
      tax_percent: row.taxPercent,
      designer_cost_usd: row.designerCostUsd,
      other_cost_usd: row.otherCostUsd,
      designer_payment_policy: row.designerPaymentPolicy,
      designer_payment_status: row.designerPaymentStatus,
    },
  });

  return row;
}
