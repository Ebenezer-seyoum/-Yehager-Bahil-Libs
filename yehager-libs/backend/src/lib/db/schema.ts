import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 255 }),
    role: varchar("role", { length: 32 }).default("customer").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    region: text("region").notNull(),
    subcategory: text("subcategory"),
    category: text("category"),
    priceUsd: numeric("price_usd", { precision: 12, scale: 2 }).notNull(),
    groomPriceUsd: numeric("groom_price_usd", { precision: 12, scale: 2 }),
    isCouple: boolean("is_couple").default(false).notNull(),
    familyRoles: jsonb("family_roles").$type<
      Array<{ label: string; icon?: string; price: number; gender: "male" | "female" | "unisex" }>
    >(),
    images: jsonb("images").$type<string[]>().default([]).notNull(),
    fabricType: text("fabric_type"),
    embroideryStyle: text("embroidery_style"),
    gender: text("gender").notNull(),
    uniqueId: text("unique_id"),
    tailoringDays: integer("tailoring_days").default(30).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    ...timestamps,
  },
  (table) => [index("products_region_idx").on(table.region), index("products_active_idx").on(table.isActive)],
);

export const measurements = pgTable(
  "measurements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    userEmail: varchar("user_email", { length: 320 }),
    gender: text("gender").notNull(),
    chest: numeric("chest", { precision: 10, scale: 2 }).notNull(),
    waist: numeric("waist", { precision: 10, scale: 2 }).notNull(),
    hips: numeric("hips", { precision: 10, scale: 2 }).notNull(),
    shoulderWidth: numeric("shoulder_width", { precision: 10, scale: 2 }).notNull(),
    armLength: numeric("arm_length", { precision: 10, scale: 2 }).notNull(),
    torsoLength: numeric("torso_length", { precision: 10, scale: 2 }).notNull(),
    inseam: numeric("inseam", { precision: 10, scale: 2 }),
    neck: numeric("neck", { precision: 10, scale: 2 }),
    label: text("label").default("My Measurements").notNull(),
    ...timestamps,
  },
  (table) => [index("measurements_user_idx").on(table.userId)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    ownerEmail: varchar("owner_email", { length: 320 }).notNull(),
    ownerName: text("owner_name").notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name"),
    eventCode: text("event_code").notNull(),
    shippingAddress: jsonb("shipping_address").$type<Record<string, unknown>>(),
    eventDate: timestamp("event_date", { withTimezone: false }),
    message: text("message"),
    isActive: boolean("is_active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("events_event_code_unique").on(table.eventCode)],
);

export const familyGroups = pgTable("family_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupName: text("group_name").notNull(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  eventName: text("event_name"),
  leadEmail: varchar("lead_email", { length: 320 }).notNull(),
  leadName: text("lead_name").notNull(),
  ...timestamps,
});

export const familyMembers = pgTable(
  "family_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyGroupId: uuid("family_group_id")
      .notNull()
      .references(() => familyGroups.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    relation: text("relation"),
    gender: text("gender").notNull(),
    measurements: jsonb("measurements").$type<Record<string, unknown>>(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name"),
    productImage: text("product_image"),
    priceUsd: numeric("price_usd", { precision: 12, scale: 2 }),
    ...timestamps,
  },
  (table) => [index("family_members_group_idx").on(table.familyGroupId)],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    userEmail: varchar("user_email", { length: 320 }).notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    productImage: text("product_image"),
    priceUsd: numeric("price_usd", { precision: 12, scale: 2 }).notNull(),
    quantity: integer("quantity").default(1).notNull(),
    measurementId: uuid("measurement_id").references(() => measurements.id, { onDelete: "set null" }),
    measurementSnapshot: jsonb("measurement_snapshot").$type<Record<string, unknown>>(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    eventName: text("event_name"),
    ...timestamps,
  },
  (table) => [index("cart_items_user_email_idx").on(table.userEmail)],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: text("order_number").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    userEmail: varchar("user_email", { length: 320 }).notNull(),
    customerName: text("customer_name").notNull(),
    items: jsonb("items").$type<Array<Record<string, unknown>>>().notNull(),
    totalUsd: numeric("total_usd", { precision: 12, scale: 2 }).notNull(),
    shippingCostUsd: numeric("shipping_cost_usd", { precision: 12, scale: 2 }).default("0").notNull(),
    status: text("status").default("pending").notNull(),
    paymentStatus: text("payment_status").default("pending").notNull(),
    paymentMethod: text("payment_method").default("stripe_usd").notNull(),
    paymentCurrency: text("payment_currency").default("USD").notNull(),
    stripeSessionId: text("stripe_session_id"),
    totalEtb: numeric("total_etb", { precision: 14, scale: 2 }),
    etbExchangeRate: numeric("etb_exchange_rate", { precision: 12, scale: 4 }),
    paymentProofUrl: text("payment_proof_url"),
    paymentProofUploadedAt: timestamp("payment_proof_uploaded_at", { withTimezone: true }),
    fulfillmentType: text("fulfillment_type").default("mail").notNull(),
    carrier: text("carrier"),
    pickupLocation: text("pickup_location"),
    pickupPersonName: text("pickup_person_name"),
    pickupPersonPhone: text("pickup_person_phone"),
    pickupIdUrl: text("pickup_id_url"),
    pickupIdUploadedAt: timestamp("pickup_id_uploaded_at", { withTimezone: true }),
    pickupSignedDocUrl: text("pickup_signed_doc_url"),
    pickupSignedDocUploadedAt: timestamp("pickup_signed_doc_uploaded_at", { withTimezone: true }),
    pickupProofUrl: text("pickup_proof_url"),
    pickupProofUploadedAt: timestamp("pickup_proof_uploaded_at", { withTimezone: true }),
    pickupCompletedAt: timestamp("pickup_completed_at", { withTimezone: true }),
    shippingDocumentUrl: text("shipping_document_url"),
    shippingDocUploadedAt: timestamp("shipping_doc_uploaded_at", { withTimezone: true }),
    shippingDocuments: jsonb("shipping_documents").$type<
      Array<{ url: string; label: string; uploadedAt: string }>
    >(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    eventName: text("event_name"),
    shippingAddress: jsonb("shipping_address").$type<Record<string, unknown>>(),
    useEventOwnerAddress: boolean("use_event_owner_address").default(false).notNull(),
    measurementId: uuid("measurement_id").references(() => measurements.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [uniqueIndex("orders_order_number_unique").on(table.orderNumber), index("orders_user_email_idx").on(table.userEmail)],
);

export const stripeWebhookEvents = pgTable(
  "stripe_webhook_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    status: text("status").default("processed").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("stripe_webhook_events_event_id_unique").on(table.eventId)],
);

export const eventParticipants = pgTable(
  "event_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    eventName: text("event_name"),
    participantEmail: varchar("participant_email", { length: 320 }).notNull(),
    participantName: text("participant_name").notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    orderStatus: text("order_status").default("browsing").notNull(),
    paymentStatus: text("payment_status").default("unpaid").notNull(),
    ...timestamps,
  },
  (table) => [index("event_participants_event_idx").on(table.eventId)],
);

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    currencyPair: text("currency_pair").default("USD_ETB").notNull(),
    rate: numeric("rate", { precision: 14, scale: 6 }).notNull(),
    source: text("source"),
    lastUpdated: timestamp("last_updated", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("exchange_rates_currency_pair_unique").on(table.currencyPair)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    performedBy: text("performed_by"),
    details: text("details"),
    category: text("category").notNull(),
    severity: text("severity").default("info").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => [index("audit_logs_category_idx").on(table.category), index("audit_logs_created_at_idx").on(table.createdAt)],
);

export const systemAlerts = pgTable(
  "system_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").default("system_error").notNull(),
    severity: text("severity").default("warning").notNull(),
    entityId: text("entity_id"),
    isResolved: boolean("is_resolved").default(false).notNull(),
    resolvedBy: text("resolved_by"),
    ...timestamps,
  },
  (table) => [index("system_alerts_resolved_idx").on(table.isResolved)],
);

export const usersRelations = relations(users, ({ many }) => ({
  cartItems: many(cartItems),
  orders: many(orders),
  measurements: many(measurements),
}));
