import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { db, pgPool } from "../lib/db/drizzle.js";
import {
  auditLogs,
  cartItems,
  eventParticipants,
  events,
  exchangeRates,
  familyGroups,
  familyMembers,
  measurements,
  orders,
  products,
  systemAlerts,
  users,
} from "../lib/db/schema.js";
import { logger } from "../lib/logger.js";

type UnknownRecord = Record<string, unknown>;
type FamilyRole = { label: string; icon?: string; price: number; gender: "male" | "female" | "unisex" };

const isDryRun = process.argv.includes("--dry-run");
const baseExportDir = process.env.BASE44_EXPORT_DIR ?? path.resolve(process.cwd(), "data-sync/base44-export");

function toNumberString(value: unknown, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toString() : fallback;
}

function toDate(value: unknown): Date | undefined {
  if (!value || typeof value !== "string") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function asUuid(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 10 ? value : undefined;
}

function parseFamilyRoles(value: unknown): FamilyRole[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed: FamilyRole[] = [];

  for (const entry of value) {
    const row = entry as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label : undefined;
    const price = Number(row.price);
    const gender = row.gender;
    if (!label || !Number.isFinite(price)) continue;
    if (gender !== "male" && gender !== "female" && gender !== "unisex") continue;

    parsed.push({
      label,
      icon: typeof row.icon === "string" ? row.icon : undefined,
      price,
      gender,
    });
  }

  return parsed.length ? parsed : undefined;
}

function stripJsonComments(content: string) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

async function loadRecords(fileName: string): Promise<UnknownRecord[]> {
  const fullPath = path.join(baseExportDir, fileName);
  try {
    const raw = await readFile(fullPath, "utf8");
    const json = JSON.parse(stripJsonComments(raw));
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.data)) return json.data;
    return [];
  } catch {
    logger.warn({ fileName }, "Export file not found or invalid JSON, skipping");
    return [];
  }
}

async function run() {
  logger.info({ isDryRun, baseExportDir }, "Starting staged Base44 sync");
  await mkdir(baseExportDir, { recursive: true });

  const productsData = await loadRecords("Product.json");
  const usersData = await loadRecords("User.json");
  const eventsData = await loadRecords("Event.json");
  const measurementsData = await loadRecords("Measurement.json");
  const ordersData = await loadRecords("Order.json");
  const cartData = await loadRecords("CartItem.json");
  const participantsData = await loadRecords("EventParticipant.json");
  const familyGroupsData = await loadRecords("FamilyGroup.json");
  const familyMembersData = await loadRecords("FamilyMember.json");
  const exchangeRatesData = await loadRecords("ExchangeRate.json");
  const auditLogsData = await loadRecords("AuditLog.json");
  const alertsData = await loadRecords("SystemAlert.json");

  logger.info(
    {
      products: productsData.length,
      users: usersData.length,
      events: eventsData.length,
      measurements: measurementsData.length,
      orders: ordersData.length,
      cartItems: cartData.length,
      participants: participantsData.length,
      familyGroups: familyGroupsData.length,
      familyMembers: familyMembersData.length,
      exchangeRates: exchangeRatesData.length,
      auditLogs: auditLogsData.length,
      systemAlerts: alertsData.length,
    },
    "Loaded export batches",
  );

  if (isDryRun) {
    logger.info("Dry run completed successfully");
    await pgPool.end();
    return;
  }

  if (usersData.length) {
    await db
      .insert(users)
      .values(
        usersData
          .map((row) => ({
            id: asUuid(row.id),
            email: typeof row.email === "string" ? row.email : undefined,
            name: typeof row.full_name === "string" ? row.full_name : typeof row.name === "string" ? row.name : undefined,
            role: typeof row.role === "string" ? row.role : "customer",
          }))
          .filter((row) => row.email) as Array<(typeof users.$inferInsert)>,
      )
      .onConflictDoNothing();
  }

  if (productsData.length) {
    await db
      .insert(products)
      .values(
        productsData.map((row) => ({
          id: asUuid(row.id),
          name: String(row.name ?? ""),
          description: typeof row.description === "string" ? row.description : undefined,
          region: String(row.region ?? "Unspecified"),
          subcategory: typeof row.subcategory === "string" ? row.subcategory : undefined,
          category: typeof row.category === "string" ? row.category : undefined,
          priceUsd: toNumberString(row.price),
          groomPriceUsd: row.groom_price !== undefined ? toNumberString(row.groom_price) : undefined,
          isCouple: Boolean(row.is_couple),
          familyRoles: parseFamilyRoles(row.family_roles),
          images: Array.isArray(row.images) ? (row.images as string[]) : [],
          fabricType: typeof row.fabric_type === "string" ? row.fabric_type : undefined,
          embroideryStyle: typeof row.embroidery_style === "string" ? row.embroidery_style : undefined,
          gender: String(row.gender ?? "unisex"),
          uniqueId: typeof row.unique_id === "string" ? row.unique_id : undefined,
          tailoringDays: Number(row.tailoring_days ?? 30),
          isActive: row.is_active === undefined ? true : Boolean(row.is_active),
          isFeatured: Boolean(row.is_featured),
        })),
      )
      .onConflictDoNothing();
  }

  if (eventsData.length) {
    await db
      .insert(events)
      .values(
        eventsData.map((row) => ({
          id: asUuid(row.id),
          name: String(row.name ?? ""),
          ownerEmail: String(row.owner_email ?? ""),
          ownerName: String(row.owner_name ?? ""),
          productId: asUuid(row.product_id),
          productName: typeof row.product_name === "string" ? row.product_name : undefined,
          eventCode: String(row.event_code ?? ""),
          shippingAddress: (row.shipping_address as Record<string, unknown>) ?? undefined,
          eventDate: toDate(row.event_date),
          message: typeof row.message === "string" ? row.message : undefined,
          isActive: row.is_active === undefined ? true : Boolean(row.is_active),
        })),
      )
      .onConflictDoNothing();
  }

  if (measurementsData.length) {
    await db
      .insert(measurements)
      .values(
        measurementsData.map((row) => ({
          id: asUuid(row.id),
          userEmail: typeof row.user_email === "string" ? row.user_email : undefined,
          gender: String(row.gender ?? "male"),
          chest: toNumberString(row.chest),
          waist: toNumberString(row.waist),
          hips: toNumberString(row.hips),
          shoulderWidth: toNumberString(row.shoulder_width),
          armLength: toNumberString(row.arm_length),
          torsoLength: toNumberString(row.torso_length),
          inseam: row.inseam !== undefined ? toNumberString(row.inseam) : undefined,
          neck: row.neck !== undefined ? toNumberString(row.neck) : undefined,
          label: typeof row.label === "string" ? row.label : "My Measurements",
        })),
      )
      .onConflictDoNothing();
  }

  if (ordersData.length) {
    await db
      .insert(orders)
      .values(
        ordersData.map((row) => ({
          id: asUuid(row.id),
          orderNumber: String(row.order_number ?? ""),
          userEmail: String(row.user_email ?? ""),
          customerName: String(row.customer_name ?? ""),
          items: Array.isArray(row.items) ? (row.items as Array<Record<string, unknown>>) : [],
          totalUsd: toNumberString(row.total),
          shippingCostUsd: toNumberString(row.shipping_cost, "0"),
          status: String(row.status ?? "pending"),
          paymentStatus: String(row.payment_status ?? "pending"),
          paymentMethod: String(row.payment_method ?? "stripe_usd"),
          paymentCurrency: String(row.payment_currency ?? "USD"),
          totalEtb: row.total_etb !== undefined ? toNumberString(row.total_etb) : undefined,
          etbExchangeRate: row.etb_exchange_rate !== undefined ? toNumberString(row.etb_exchange_rate) : undefined,
          paymentProofUrl: typeof row.payment_proof_url === "string" ? row.payment_proof_url : undefined,
          paymentProofUploadedAt: toDate(row.payment_proof_uploaded_at),
          fulfillmentType: String(row.fulfillment_type ?? "mail"),
          carrier: typeof row.carrier === "string" ? row.carrier : undefined,
          pickupLocation: typeof row.pickup_location === "string" ? row.pickup_location : undefined,
          pickupPersonName: typeof row.pickup_person_name === "string" ? row.pickup_person_name : undefined,
          pickupPersonPhone: typeof row.pickup_person_phone === "string" ? row.pickup_person_phone : undefined,
          pickupIdUrl: typeof row.pickup_id_url === "string" ? row.pickup_id_url : undefined,
          pickupIdUploadedAt: toDate(row.pickup_id_uploaded_at),
          pickupSignedDocUrl: typeof row.pickup_signed_doc_url === "string" ? row.pickup_signed_doc_url : undefined,
          pickupSignedDocUploadedAt: toDate(row.pickup_signed_doc_uploaded_at),
          pickupProofUrl: typeof row.pickup_proof_url === "string" ? row.pickup_proof_url : undefined,
          pickupProofUploadedAt: toDate(row.pickup_proof_uploaded_at),
          pickupCompletedAt: toDate(row.pickup_completed_at),
          shippingDocumentUrl: typeof row.shipping_document_url === "string" ? row.shipping_document_url : undefined,
          shippingDocUploadedAt: toDate(row.shipping_doc_uploaded_at),
          shippingDocuments: Array.isArray(row.shipping_documents)
            ? (row.shipping_documents as Array<{ url: string; label: string; uploaded_at: string }>).map((d) => ({
                url: d.url,
                label: d.label,
                uploadedAt: d.uploaded_at,
              }))
            : undefined,
          eventId: asUuid(row.event_id),
          eventName: typeof row.event_name === "string" ? row.event_name : undefined,
          shippingAddress: (row.shipping_address as Record<string, unknown>) ?? undefined,
          useEventOwnerAddress: Boolean(row.use_event_owner_address),
          measurementId: asUuid(row.measurement_id),
        })),
      )
      .onConflictDoNothing();
  }

  if (cartData.length) {
    await db
      .insert(cartItems)
      .values(
        cartData.map((row) => ({
          id: asUuid(row.id),
          userEmail: String(row.user_email ?? ""),
          productId: asUuid(row.product_id),
          productName: String(row.product_name ?? ""),
          productImage: typeof row.product_image === "string" ? row.product_image : undefined,
          priceUsd: toNumberString(row.price),
          quantity: Number(row.quantity ?? 1),
          measurementId: asUuid(row.measurement_id),
          measurementSnapshot: (row.measurement_snapshot as Record<string, unknown>) ?? undefined,
          eventId: asUuid(row.event_id),
          eventName: typeof row.event_name === "string" ? row.event_name : undefined,
        })),
      )
      .onConflictDoNothing();
  }

  if (participantsData.length) {
    await db
      .insert(eventParticipants)
      .values(
        participantsData.map((row) => ({
          id: asUuid(row.id),
          eventId: asUuid(row.event_id) ?? "",
          eventName: typeof row.event_name === "string" ? row.event_name : undefined,
          participantEmail: String(row.participant_email ?? ""),
          participantName: String(row.participant_name ?? ""),
          orderId: asUuid(row.order_id),
          orderStatus: String(row.order_status ?? "browsing"),
          paymentStatus: String(row.payment_status ?? "unpaid"),
        })),
      )
      .onConflictDoNothing();
  }

  if (familyGroupsData.length) {
    await db
      .insert(familyGroups)
      .values(
        familyGroupsData.map((row) => ({
          id: asUuid(row.id),
          groupName: String(row.group_name ?? ""),
          eventId: asUuid(row.event_id) ?? "",
          eventName: typeof row.event_name === "string" ? row.event_name : undefined,
          leadEmail: String(row.lead_email ?? ""),
          leadName: String(row.lead_name ?? ""),
        })),
      )
      .onConflictDoNothing();
  }

  if (familyMembersData.length) {
    await db
      .insert(familyMembers)
      .values(
        familyMembersData.map((row) => ({
          id: asUuid(row.id),
          familyGroupId: asUuid(row.family_group_id) ?? "",
          eventId: asUuid(row.event_id) ?? "",
          name: String(row.name ?? ""),
          relation: typeof row.relation === "string" ? row.relation : undefined,
          gender: String(row.gender ?? "male"),
          measurements: (row.measurements as Record<string, unknown>) ?? undefined,
          productId: asUuid(row.product_id),
          productName: typeof row.product_name === "string" ? row.product_name : undefined,
          productImage: typeof row.product_image === "string" ? row.product_image : undefined,
          priceUsd: row.price !== undefined ? toNumberString(row.price) : undefined,
        })),
      )
      .onConflictDoNothing();
  }

  if (exchangeRatesData.length) {
    await db
      .insert(exchangeRates)
      .values(
        exchangeRatesData.map((row) => ({
          id: asUuid(row.id),
          currencyPair: String(row.currency_pair ?? "USD_ETB"),
          rate: toNumberString(row.rate, "1"),
          source: typeof row.source === "string" ? row.source : undefined,
          lastUpdated: toDate(row.last_updated),
        })),
      )
      .onConflictDoNothing();
  }

  if (auditLogsData.length) {
    await db
      .insert(auditLogs)
      .values(
        auditLogsData.map((row) => ({
          id: asUuid(row.id),
          action: String(row.action ?? "unknown_action"),
          entityType: typeof row.entity_type === "string" ? row.entity_type : undefined,
          entityId: typeof row.entity_id === "string" ? row.entity_id : undefined,
          performedBy: typeof row.performed_by === "string" ? row.performed_by : undefined,
          details: typeof row.details === "string" ? row.details : undefined,
          category: String(row.category ?? "system"),
          severity: String(row.severity ?? "info"),
          metadata: (row.metadata as Record<string, unknown>) ?? undefined,
        })),
      )
      .onConflictDoNothing();
  }

  if (alertsData.length) {
    await db
      .insert(systemAlerts)
      .values(
        alertsData.map((row) => ({
          id: asUuid(row.id),
          title: String(row.title ?? ""),
          message: String(row.message ?? ""),
          type: String(row.type ?? "system_error"),
          severity: String(row.severity ?? "warning"),
          entityId: typeof row.entity_id === "string" ? row.entity_id : undefined,
          isResolved: Boolean(row.is_resolved),
          resolvedBy: typeof row.resolved_by === "string" ? row.resolved_by : undefined,
        })),
      )
      .onConflictDoNothing();
  }

  logger.info("Staged sync completed");
  await pgPool.end();
}

run().catch(async (error) => {
  logger.error({ error }, "Staged sync failed");
  await pgPool.end();
  process.exit(1);
});
