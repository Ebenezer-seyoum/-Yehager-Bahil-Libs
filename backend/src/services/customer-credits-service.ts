import { desc, eq, sql } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { auditLogs, customerCreditLedger, customerCreditRules, orders, users } from "../lib/db/schema.js";
import { moneyToNumber, numberToMoney } from "./checkout-utils.js";
import { sendCustomerCreditAwardedEmail } from "./email-service.js";

type CreditOrder = typeof orders.$inferSelect;

export function isOtherCreditLine(item: Record<string, unknown>) {
  const metadata = item.item_metadata ?? item.itemMetadata;
  const values = [
    item.category,
    item.subcategory,
    item.region,
    typeof metadata === "object" && metadata ? (metadata as Record<string, unknown>).category : null,
    typeof metadata === "object" && metadata ? (metadata as Record<string, unknown>).subcategory : null,
    typeof metadata === "object" && metadata ? (metadata as Record<string, unknown>).region : null,
  ].map((value) => String(value ?? "").trim().toLowerCase());
  return values.some((value) => ["other", "others", "jewelry", "jewellery", "ring", "rings"].includes(value));
}

function isCustomLine(item: Record<string, unknown>) {
  return Boolean(
    item.uploaded_design_id ||
    item.uploadedDesignId ||
    item.item_type === "custom_design" ||
    item.itemType === "custom_design",
  );
}

function lineTotal(item: Record<string, unknown>) {
  const quantity = Math.max(Number(item.quantity ?? 1), 1);
  const explicitTotal = moneyToNumber(item.line_total_usd as string | number | null | undefined ?? item.lineTotalUsd as string | number | null | undefined);
  if (explicitTotal > 0) return explicitTotal;
  return moneyToNumber(item.unit_price_usd as string | number | null | undefined ?? item.unitPriceUsd as string | number | null | undefined) * quantity;
}

function eligiblePaidTotal(ruleAppliesTo: string | null | undefined, order: CreditOrder) {
  if (!ruleAppliesTo || ruleAppliesTo === "all_orders") return moneyToNumber(order.totalUsd);
  const items = Array.isArray(order.items)
    ? order.items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
  if (ruleAppliesTo === "other_orders") {
    return items.filter(isOtherCreditLine).reduce((sum, item) => sum + lineTotal(item), 0);
  }
  const wantsCustom = ruleAppliesTo === "custom_orders";
  const subtotal = items
    .filter((item) => isCustomLine(item) === wantsCustom)
    .reduce((sum, item) => sum + lineTotal(item), 0);
  if (subtotal > 0) return subtotal;
  if (wantsCustom && order.orderType === "custom_order") return moneyToNumber(order.totalUsd);
  if (!wantsCustom && order.orderType === "catalog_order") return moneyToNumber(order.totalUsd);
  return 0;
}

async function balanceForCustomer(userEmail: string) {
  const [row] = await db
    .select({ balance: sql<string>`coalesce(sum(${customerCreditLedger.amountUsd}), 0)` })
    .from(customerCreditLedger)
    .where(eq(customerCreditLedger.userEmail, userEmail));
  return moneyToNumber(row?.balance);
}

export async function getCustomerCreditWorkspacePayload() {
  const [customers, rules, ledger] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "customer"))
      .orderBy(desc(users.createdAt))
      .limit(300),
    db.select().from(customerCreditRules).orderBy(desc(customerCreditRules.createdAt)).limit(50),
    db.select().from(customerCreditLedger).orderBy(desc(customerCreditLedger.createdAt)).limit(1000),
  ]);

  const byEmail = new Map<string, typeof ledger>();
  for (const entry of ledger) {
    const list = byEmail.get(entry.userEmail) ?? [];
    list.push(entry);
    byEmail.set(entry.userEmail, list);
  }

  const creditCustomers = customers.map((customer) => {
    const entries = byEmail.get(customer.email) ?? [];
    const totalEarned = entries.filter((entry) => moneyToNumber(entry.amountUsd) > 0).reduce((sum, entry) => sum + moneyToNumber(entry.amountUsd), 0);
    const totalUsed = Math.abs(entries.filter((entry) => moneyToNumber(entry.amountUsd) < 0).reduce((sum, entry) => sum + moneyToNumber(entry.amountUsd), 0));
    const balance = entries.reduce((sum, entry) => sum + moneyToNumber(entry.amountUsd), 0);
    const lastEarned = entries.find((entry) => moneyToNumber(entry.amountUsd) > 0)?.createdAt ?? null;
    const lastUsed = entries.find((entry) => moneyToNumber(entry.amountUsd) < 0)?.createdAt ?? null;
    const lastActivity = entries[0]?.createdAt ?? null;

    return {
      ...customer,
      balanceUsd: numberToMoney(balance),
      totalEarnedUsd: numberToMoney(totalEarned),
      totalUsedUsd: numberToMoney(totalUsed),
      lastEarnedAt: lastEarned,
      lastUsedAt: lastUsed,
      lastActivityAt: lastActivity,
      ledgerCount: entries.length,
      statusLabel: balance > 0 ? "Active Balance" : "Zero Balance",
    };
  });

  return {
    rules,
    activeRule: rules.find((rule) => rule.status === "active") ?? null,
    creditCustomers,
    ledgerEntries: ledger,
  };
}

export async function updateCustomerCreditRuleForAdmin(payload: {
  ruleId?: string | null;
  name?: string | null;
  minimumPaidUsd: number;
  rewardUsd: number;
  appliesTo: "all_orders" | "catalog_orders" | "custom_orders" | "other_orders";
  status: "active" | "inactive";
  internalNote?: string | null;
  performedBy?: string | null;
}) {
  const values = {
    name: payload.name?.trim() || `Spend $${payload.minimumPaidUsd.toFixed(2)}, earn $${payload.rewardUsd.toFixed(2)}`,
    minimumPaidUsd: numberToMoney(payload.minimumPaidUsd),
    rewardUsd: numberToMoney(payload.rewardUsd),
    appliesTo: payload.appliesTo,
    status: payload.status,
    internalNote: payload.internalNote?.trim() || null,
    updatedAt: new Date(),
  };

  const [row] = payload.ruleId
    ? await db.update(customerCreditRules).set(values).where(eq(customerCreditRules.id, payload.ruleId)).returning()
    : await db.insert(customerCreditRules).values(values).returning();

  await db.insert(auditLogs).values({
    action: "customer_credit_rule_saved",
    category: "finance",
    severity: "info",
    entityType: "customer_credit_rule",
    entityId: row.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Customer bonus credit rule saved",
    metadata: {
      minimum_paid_usd: values.minimumPaidUsd,
      reward_usd: values.rewardUsd,
      applies_to: values.appliesTo,
      status: values.status,
    },
  });

  return row;
}

export async function awardCustomerCreditForPaidOrder(order: CreditOrder, performedBy = "system") {
  if (order.paymentStatus !== "paid") return null;

  const rules = await db
    .select()
    .from(customerCreditRules)
    .where(eq(customerCreditRules.status, "active"))
    .orderBy(desc(customerCreditRules.minimumPaidUsd));

  const rule = rules.find((item) => eligiblePaidTotal(item.appliesTo, order) >= moneyToNumber(item.minimumPaidUsd));
  if (!rule) return null;
  const eligibleTotal = eligiblePaidTotal(rule.appliesTo, order);

  const previousBalance = await balanceForCustomer(order.userEmail);
  const reward = moneyToNumber(rule.rewardUsd);
  if (reward <= 0) return null;

  const [entry] = await db
    .insert(customerCreditLedger)
    .values({
      userId: order.userId ?? null,
      userEmail: order.userEmail,
      customerName: order.customerName,
      orderId: order.id,
      orderNumber: order.orderNumber,
      ruleId: rule.id,
      amountUsd: numberToMoney(reward),
      balanceAfterUsd: numberToMoney(previousBalance + reward),
      type: "bonus_credit",
      reason: `Automatic bonus credit for paid order #${order.orderNumber}`,
      createdBy: performedBy,
      metadata: {
        order_total_usd: order.totalUsd,
        eligible_order_total_usd: numberToMoney(eligibleTotal),
        rule_minimum_paid_usd: rule.minimumPaidUsd,
        rule_reward_usd: rule.rewardUsd,
      },
    })
    .onConflictDoNothing()
    .returning();

  if (!entry) return null;

  await db.insert(auditLogs).values({
    action: "customer_bonus_credit_awarded",
    category: "finance",
    severity: "info",
    entityType: "customer_credit_ledger",
    entityId: entry.id,
    performedBy,
    details: `Awarded ${numberToMoney(reward)} store credit to ${order.userEmail}`,
    metadata: {
      order_id: order.id,
      order_number: order.orderNumber,
      rule_id: rule.id,
    },
  });

  await sendCustomerCreditAwardedEmail({
    to: order.userEmail,
    customerName: order.customerName,
    amountUsd: entry.amountUsd,
    balanceUsd: entry.balanceAfterUsd ?? numberToMoney(previousBalance + reward),
    orderNumber: order.orderNumber,
  });

  return entry;
}

export async function getCustomerCreditBalance(userEmail: string) {
  return balanceForCustomer(userEmail);
}

export async function spendCustomerCreditForOrder(payload: {
  userEmail: string;
  userId?: string | null;
  customerName?: string | null;
  orderId: string;
  orderNumber: string;
  amountUsd: number;
  performedBy?: string;
}) {
  const amount = Number(payload.amountUsd.toFixed(2));
  if (amount <= 0) return null;
  const previousBalance = await balanceForCustomer(payload.userEmail);
  if (amount > previousBalance) throw new Error("Customer credit balance is insufficient");
  const [entry] = await db.insert(customerCreditLedger).values({
    userId: payload.userId ?? null,
    userEmail: payload.userEmail,
    customerName: payload.customerName ?? null,
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    amountUsd: numberToMoney(-amount),
    balanceAfterUsd: numberToMoney(previousBalance - amount),
    type: "credit_used",
    reason: `Company credit used for order #${payload.orderNumber}`,
    createdBy: payload.performedBy ?? "checkout",
    metadata: { eligible_section: "Other" },
  }).returning();
  return entry ?? null;
}

export async function restoreCustomerCreditForOrder(order: CreditOrder, performedBy = "system") {
  const usedRows = await db.select().from(customerCreditLedger).where(eq(customerCreditLedger.orderId, order.id));
  const used = usedRows.find((entry) => entry.type === "credit_used" && moneyToNumber(entry.amountUsd) < 0);
  if (!used) return null;
  const alreadyRestored = usedRows.some((entry) => entry.type === "bonus_credit" && entry.metadata?.credit_refund === true);
  if (alreadyRestored) return null;
  const amount = Math.abs(moneyToNumber(used.amountUsd));
  const previousBalance = await balanceForCustomer(order.userEmail);
  const [entry] = await db.insert(customerCreditLedger).values({
    userId: order.userId ?? null,
    userEmail: order.userEmail,
    customerName: order.customerName,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amountUsd: numberToMoney(amount),
    balanceAfterUsd: numberToMoney(previousBalance + amount),
    type: "bonus_credit",
    reason: `Company credit restored after order #${order.orderNumber} ${order.paymentStatus}`,
    createdBy: performedBy,
    metadata: { credit_refund: true, restored_from_entry_id: used.id },
  }).returning();
  return entry ?? null;
}
