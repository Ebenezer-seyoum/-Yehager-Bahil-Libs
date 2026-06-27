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

function numberToPercent(value: number) {
  const safeValue = Number.isNaN(value) ? 0 : value;
  return safeValue.toFixed(4);
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
    taxPercent: numberToPercent(taxPercent),
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

function productIdFromItem(item: Record<string, unknown>) {
  const value = item.product_id ?? item.productId;
  return typeof value === "string" && value ? value : null;
}

function quantityFromItem(item: Record<string, unknown>) {
  const quantity = Number(item.quantity ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function moneyLike(value: unknown) {
  return typeof value === "string" || typeof value === "number" || value === null || value === undefined ? value : undefined;
}

function sellingPriceFromItem(item: Record<string, unknown>, fallback: string | number | null | undefined) {
  return moneyToNumber(
    moneyLike(
      item.unit_price_usd ??
        item.unitPriceUsd ??
        item.price_usd ??
        item.priceUsd ??
        item.line_unit_price_usd,
    ) ??
      fallback,
  );
}

function productionCostForUnit(setting: CostSetting, sellingPrice: number) {
  const designerCost = moneyToNumber(setting.designerCostUsd);
  const taxPercent = moneyToNumber(setting.taxPercent);
  const taxAmount = sellingPrice * (taxPercent / 100);
  const otherCost = moneyToNumber(setting.otherCostUsd);
  const totalCost = designerCost + taxAmount + otherCost;
  return { designerCost, taxPercent, taxAmount, otherCost, totalCost };
}

function marginPercent(revenue: number, profit: number) {
  return revenue > 0 ? (profit / revenue) * 100 : 0;
}

export async function getProfitCostsWorkspacePayload() {
  const [settings, productRows, orderRows] = await Promise.all([
    db.select().from(profitCostSettings),
    db.select().from(products).orderBy(desc(products.createdAt)).limit(300),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(300),
  ]);

  const settingsByKey = new Map(settings.map((setting) => [key(setting.entityType, setting.entityId), setting]));
  const defaults = settingsByKey.get(key("default")) ?? baseSetting();

  const productSummaries = new Map<string, {
    entityType: "product";
    entityId: string;
    title: string;
    status: string;
    sellingPriceUsd: number;
    designerCostUsd: number;
    taxPercent: number;
    otherCostUsd: number;
    productionCostPerUnitUsd: number;
    orderCount: number;
    unitsSold: number;
    revenueUsd: number;
    totalProductionCostUsd: number;
    netProfitUsd: number;
    marginPercent: number;
    orderProfits: Array<Record<string, unknown>>;
    hasCustomCost: boolean;
  }>();

  for (const product of productRows) {
    const setting = settingsByKey.get(key("product", product.id)) ?? defaults;
    const sellingPrice = moneyToNumber(product.priceUsd);
    const unitCost = productionCostForUnit(setting, sellingPrice);
    productSummaries.set(product.id, {
      entityType: "product",
      entityId: product.id,
      title: product.name,
      status: product.isActive ? "active" : "hidden",
      sellingPriceUsd: sellingPrice,
      designerCostUsd: unitCost.designerCost,
      taxPercent: unitCost.taxPercent,
      otherCostUsd: unitCost.otherCost,
      productionCostPerUnitUsd: unitCost.totalCost,
      orderCount: 0,
      unitsSold: 0,
      revenueUsd: 0,
      totalProductionCostUsd: 0,
      netProfitUsd: 0,
      marginPercent: 0,
      orderProfits: [],
      hasCustomCost: setting.entityType === "product" && setting.entityId === product.id,
    });
  }

  for (const order of orderRows) {
    if (order.paymentStatus !== "paid") continue;
    const items = Array.isArray(order.items) ? order.items : [];
    for (const rawItem of items) {
      if (!rawItem || typeof rawItem !== "object") continue;
      const item = rawItem as Record<string, unknown>;
      const productId = productIdFromItem(item);
      if (!productId) continue;
      const summary = productSummaries.get(productId);
      if (!summary) continue;
      const quantity = quantityFromItem(item);
      const unitSellingPrice = sellingPriceFromItem(item, summary.sellingPriceUsd);
      const setting = settingsByKey.get(key("product", productId)) ?? defaults;
      const unitCost = productionCostForUnit(setting, unitSellingPrice);
      const revenue = unitSellingPrice * quantity;
      const productionCost = unitCost.totalCost * quantity;
      const netProfit = revenue - productionCost;

      summary.orderCount += 1;
      summary.unitsSold += quantity;
      summary.revenueUsd += revenue;
      summary.totalProductionCostUsd += productionCost;
      summary.netProfitUsd += netProfit;
      summary.marginPercent = marginPercent(summary.revenueUsd, summary.netProfitUsd);
      summary.orderProfits.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.userEmail,
        quantity,
        sellingPriceUsd: numberToMoney(unitSellingPrice),
        productionCostUsd: numberToMoney(unitCost.totalCost),
        revenueUsd: numberToMoney(revenue),
        netProfitUsd: numberToMoney(netProfit),
        marginPercent: numberToMoney(marginPercent(revenue, netProfit)),
        paymentStatus: order.paymentStatus,
        orderDate: order.createdAt,
      });
    }
  }

  const catalogProducts = Array.from(productSummaries.values()).map((summary) => ({
    ...summary,
    sellingPriceUsd: numberToMoney(summary.sellingPriceUsd),
    designerCostUsd: numberToMoney(summary.designerCostUsd),
    taxPercent: numberToPercent(summary.taxPercent),
    otherCostUsd: numberToMoney(summary.otherCostUsd),
    productionCostPerUnitUsd: numberToMoney(summary.productionCostPerUnitUsd),
    revenueUsd: numberToMoney(summary.revenueUsd),
    totalProductionCostUsd: numberToMoney(summary.totalProductionCostUsd),
    netProfitUsd: numberToMoney(summary.netProfitUsd),
    marginPercent: numberToMoney(summary.marginPercent),
  }));

  const totalRevenue = catalogProducts.reduce((sum, row) => sum + moneyToNumber(row.revenueUsd), 0);
  const totalProductionCost = catalogProducts.reduce((sum, row) => sum + moneyToNumber(row.totalProductionCostUsd), 0);
  const totalNetProfit = catalogProducts.reduce((sum, row) => sum + moneyToNumber(row.netProfitUsd), 0);
  const allProfitSummary = {
    totalProducts: catalogProducts.length,
    totalOrders: catalogProducts.reduce((sum, row) => sum + Number(row.orderCount ?? 0), 0),
    totalUnitsSold: catalogProducts.reduce((sum, row) => sum + Number(row.unitsSold ?? 0), 0),
    totalRevenueUsd: numberToMoney(totalRevenue),
    totalProductionCostUsd: numberToMoney(totalProductionCost),
    totalNetProfitUsd: numberToMoney(totalNetProfit),
    averageProfitMargin: numberToMoney(marginPercent(totalRevenue, totalNetProfit)),
  };

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
    allProfitSummary,
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
    taxPercent: numberToPercent(payload.taxPercent),
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
