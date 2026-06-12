import { relations } from "drizzle-orm";
import {
  boolean,
  check,
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
import { sql } from "drizzle-orm";
import type { UserRole } from "../auth/roles.js";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 50 }),
    icon: varchar("icon", { length: 50 }),
    isSystem: boolean("is_system").default(false).notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("roles_key_unique").on(table.key)],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 255 }),
    passwordHash: text("password_hash"),
    role: varchar("role", { length: 32 }).$type<UserRole>().default("customer").notNull(),
    status: varchar("status", { length: 32 }).default("active").notNull(),
    phone: text("phone"),
    department: text("department"),
    jobTitle: text("job_title"),
    accountStatus: varchar("account_status", { length: 32 }).default("active").notNull(),
    roleStatus: varchar("role_status", { length: 32 }).default("assigned").notNull(),
    assignedRoleId: uuid("assigned_role_id").references(() => roles.id, { onDelete: "set null" }),
    avatarUrl: text("avatar_url"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    mustChangePassword: boolean("must_change_password").default(false).notNull(),
    passwordStatus: varchar("password_status", { length: 40 }).default("never_reset").notNull(),
    lastPasswordResetRequestedAt: timestamp("last_password_reset_requested_at", { withTimezone: true }),
    lastPasswordResetAt: timestamp("last_password_reset_at", { withTimezone: true }),
    lastPasswordResetMethod: varchar("last_password_reset_method", { length: 40 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    check("users_role_check", sql`${table.role} in ('admin', 'customer', 'employee')`),
    check("users_status_check", sql`${table.status} in ('active', 'inactive', 'suspended')`),
    check("users_account_status_check", sql`${table.accountStatus} in ('active', 'invited', 'pending')`),
    check("users_role_status_check", sql`${table.roleStatus} in ('unassigned', 'assigned')`),
  ],
);

export const passwordResetRequests = pgTable(
  "password_reset_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("password_reset_requests_user_id_idx").on(table.userId), index("password_reset_requests_expires_at_idx").on(table.expiresAt)],
);

export const employeeProfiles = pgTable(
  "employee_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    fatherName: varchar("father_name", { length: 120 }).notNull(),
    grandfatherName: varchar("grandfather_name", { length: 120 }),
    gender: varchar("gender", { length: 20 }).notNull(),
    dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
    maritalStatus: varchar("marital_status", { length: 30 }),
    country: varchar("country", { length: 120 }),
    city: varchar("city", { length: 120 }),
    address: text("address"),
    employmentType: varchar("employment_type", { length: 30 }),
    startDate: timestamp("start_date", { withTimezone: true }),
    inviteStatus: varchar("invite_status", { length: 30 }).default("none").notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [index("employee_profiles_user_id_idx").on(table.userId)],
);

export const permissions = pgTable("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 150 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [uniqueIndex("permissions_key_unique").on(table.key)]);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("role_permissions_unique").on(table.roleId, table.permissionId)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_roles_unique").on(table.userId, table.roleId)],
);

export const userPermissions = pgTable(
  "user_permissions",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("user_permissions_unique").on(table.userId, table.permissionId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    rememberMe: boolean("remember_me").default(false).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
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

export type HomepageCollection = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
};

export const homepageSections = pgTable(
  "homepage_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    collections: jsonb("collections").$type<HomepageCollection[]>().default([]).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("homepage_sections_slug_unique").on(table.slug),
    index("homepage_sections_active_idx").on(table.isActive),
    index("homepage_sections_sort_idx").on(table.sortOrder),
  ],
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
    selectionType: text("selection_type"),
    uploadedDesignId: uuid("uploaded_design_id"),
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
    .references(() => events.id, { onDelete: "cascade" }),
  eventName: text("event_name"),
  groupType: text("group_type").default("family_group").notNull(),
  selectionType: text("selection_type"),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: text("product_name"),
  productImage: text("product_image"),
  uploadedDesignId: uuid("uploaded_design_id"),
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
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    relation: text("relation"),
    gender: text("gender").notNull(),
    measurements: jsonb("measurements").$type<Record<string, unknown>>(),
    measurementId: uuid("measurement_id").references(() => measurements.id, { onDelete: "set null" }),
    selectionType: text("selection_type"),
    uploadedDesignId: uuid("uploaded_design_id"),
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
    itemType: text("item_type").default("product").notNull(),
    uploadedDesignId: uuid("uploaded_design_id"),
    itemMetadata: jsonb("item_metadata").$type<Record<string, unknown>>(),
    measurementId: uuid("measurement_id").references(() => measurements.id, { onDelete: "set null" }),
    measurementSnapshot: jsonb("measurement_snapshot").$type<Record<string, unknown>>(),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    eventName: text("event_name"),
    ...timestamps,
  },
  (table) => [
    index("cart_items_user_email_idx").on(table.userEmail),
    uniqueIndex("cart_items_unique_direct_custom_design_idx")
      .on(table.uploadedDesignId)
      .where(sql`${table.uploadedDesignId} is not null and ${table.itemType} = 'custom_design'`),
  ],
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
    orderType: text("order_type").default("catalog_order").notNull(),
    orderMode: text("order_mode").default("individual").notNull(),
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
    remarks: text("remarks"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("orders_order_number_unique").on(table.orderNumber),
    index("orders_user_email_idx").on(table.userEmail),
    index("orders_order_type_idx").on(table.orderType),
  ],
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

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketNumber: varchar("ticket_number", { length: 50 }).notNull(),
    customerId: uuid("customer_id").references(() => users.id, { onDelete: "set null" }),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    customerEmail: varchar("customer_email", { length: 320 }).notNull(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    subject: text("subject").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    priority: varchar("priority", { length: 50 }).default("medium").notNull(),
    status: varchar("status", { length: 50 }).default("open").notNull(),
    assignedAdminId: uuid("assigned_admin_id").references(() => users.id, { onDelete: "set null" }),
    unreadByAdmin: boolean("unread_by_admin").default(true).notNull(),
    unreadByCustomer: boolean("unread_by_customer").default(false).notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("support_tickets_ticket_number_unique").on(table.ticketNumber),
    index("support_tickets_customer_email_idx").on(table.customerEmail),
  ]
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    senderType: varchar("sender_type", { length: 50 }).notNull(), // customer/admin/system
    senderName: varchar("sender_name", { length: 255 }).notNull(),
    senderEmail: varchar("sender_email", { length: 320 }).notNull(),
    messageBody: text("message_body").notNull(),
    attachments: jsonb("attachments").$type<string[]>(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("support_messages_ticket_id_idx").on(table.ticketId),
  ]
);

export const supportAttachments = pgTable(
  "support_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => supportMessages.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileType: varchar("file_type", { length: 100 }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("support_attachments_ticket_id_idx").on(table.ticketId),
    index("support_attachments_message_id_idx").on(table.messageId),
  ]
);

export const adminNotifications = pgTable(
  "admin_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: varchar("type", { length: 100 }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    relatedTicketId: uuid("related_ticket_id").references(() => supportTickets.id, { onDelete: "cascade" }),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("admin_notifications_is_read_idx").on(table.isRead),
  ]
);

export const uploadedDesigns = pgTable(
  "uploaded_designs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    submissionNumber: text("submission_number").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    userEmail: varchar("user_email", { length: 320 }).notNull(),
    customerName: text("customer_name").notNull(),
    designTitle: text("design_title").notNull(),
    inspirationNote: text("inspiration_note"),
    frontImageUrl: text("front_image_url").notNull(),
    sideImageUrl: text("side_image_url"),
    backImageUrl: text("back_image_url"),
    detailImageUrl: text("detail_image_url"),
    fabricType: text("fabric_type"),
    embroideryStyle: text("embroidery_style"),
    colorPreference: text("color_preference"),
    measurementSnapshot: jsonb("measurement_snapshot").$type<Record<string, unknown>>().default({}).notNull(),
    contactPhone: text("contact_phone"),
    contactTelegram: text("contact_telegram"),
    contactAddress: jsonb("contact_address").$type<Record<string, unknown>>(),
    status: varchar("status", { length: 32 }).default("submitted").notNull(),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewReason: text("review_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedOrderId: uuid("approved_order_id").references(() => orders.id, { onDelete: "set null" }),
    approvedCartItemId: uuid("approved_cart_item_id"),
    quotedPriceUsd: numeric("quoted_price_usd", { precision: 12, scale: 2 }),
    familyGroupId: uuid("family_group_id").references(() => familyGroups.id, { onDelete: "set null" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    estimatedDeliveryLabel: text("estimated_delivery_label"),
    estimatedDeliveryDaysMin: integer("estimated_delivery_days_min"),
    estimatedDeliveryDaysMax: integer("estimated_delivery_days_max"),
    emailPlaceholderStatus: varchar("email_placeholder_status", { length: 40 }),
    emailPlaceholderNote: text("email_placeholder_note"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("uploaded_designs_submission_number_unique").on(table.submissionNumber),
    index("uploaded_designs_user_email_idx").on(table.userEmail),
    index("uploaded_designs_status_idx").on(table.status),
    index("uploaded_designs_created_at_idx").on(table.createdAt),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  cartItems: many(cartItems),
  orders: many(orders),
  measurements: many(measurements),
  uploadedDesigns: many(uploadedDesigns),
}));
