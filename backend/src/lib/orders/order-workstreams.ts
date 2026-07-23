export const ORDER_WORKSTREAM_TYPES = ["catalog", "custom"] as const;

export type OrderWorkstreamType = (typeof ORDER_WORKSTREAM_TYPES)[number];
export type MixedOrderType = "catalog_order" | "custom_order" | "mixed_order";

export const PRODUCTION_STATUSES = [
  "pending",
  "processing",
  "tailoring",
  "quality_check",
  "fulfilled",
  "cancelled",
] as const;

export const CUSTOMER_MAIN_STATUSES = [
  "pending",
  "processing",
  "tailoring",
  "quality_check",
  "fulfilled",
  "shipped",
  "ready_for_pickup",
  "delivered",
  "cancelled",
] as const;

// Kept as aliases because callers previously imported the type-specific names.
export const CATALOG_WORKSTREAM_STATUSES = PRODUCTION_STATUSES;
export const CUSTOM_WORKSTREAM_STATUSES = PRODUCTION_STATUSES;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];
export type CustomerMainStatus = (typeof CUSTOMER_MAIN_STATUSES)[number];
export type CatalogWorkstreamStatus = ProductionStatus;
export type CustomWorkstreamStatus = ProductionStatus;
export type OrderWorkstreamStatus = ProductionStatus;

export const MAIL_DELIVERY_STATUSES = [
  "not_started",
  "packing",
  "packed",
  "assigned_to_ems",
  "handed_to_ems",
  "in_transit",
  "at_hub",
  "out_for_delivery",
  "delivered",
  "failed_attempt",
  "returned",
] as const;

export const PICKUP_DELIVERY_STATUSES = [
  "not_started",
  "packing",
  "packed",
  "moved_to_pickup_desk",
  "ready_for_pickup",
  "customer_notified",
  "waiting_customer",
  "picked_up",
  "delivered",
  "cancelled_pickup",
] as const;

export type DeliveryStatus = (typeof MAIL_DELIVERY_STATUSES)[number] | (typeof PICKUP_DELIVERY_STATUSES)[number];

const MAIL_DELIVERY_TRANSITIONS: Record<string, readonly string[]> = {
  not_started: ["packing"],
  packing: ["not_started", "packed"],
  packed: ["packing", "assigned_to_ems"],
  assigned_to_ems: ["packed", "handed_to_ems"],
  handed_to_ems: ["assigned_to_ems", "in_transit"],
  in_transit: ["handed_to_ems", "at_hub", "out_for_delivery", "failed_attempt"],
  at_hub: ["in_transit", "out_for_delivery", "failed_attempt"],
  out_for_delivery: ["in_transit", "delivered", "failed_attempt"],
  delivered: [],
  failed_attempt: ["out_for_delivery", "returned"],
  returned: [],
};

const PICKUP_DELIVERY_TRANSITIONS: Record<string, readonly string[]> = {
  not_started: ["packing"],
  packing: ["not_started", "packed"],
  packed: ["packing", "moved_to_pickup_desk"],
  moved_to_pickup_desk: ["packed", "ready_for_pickup"],
  ready_for_pickup: ["customer_notified", "waiting_customer", "picked_up", "delivered", "cancelled_pickup"],
  customer_notified: ["waiting_customer", "picked_up", "delivered", "cancelled_pickup"],
  waiting_customer: ["picked_up", "delivered", "cancelled_pickup"],
  picked_up: ["delivered"],
  delivered: [],
  cancelled_pickup: ["packed"],
};

export function deliveryStatuses(isPickup = false) {
  return isPickup ? PICKUP_DELIVERY_STATUSES : MAIL_DELIVERY_STATUSES;
}

export function isDeliveryStatus(value: string, isPickup = false): value is DeliveryStatus {
  return deliveryStatuses(isPickup).includes(value as never);
}

export function canTransitionDeliveryStatus(type: string, currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return true;
  const transitions = type === "pickup" ? PICKUP_DELIVERY_TRANSITIONS : MAIL_DELIVERY_TRANSITIONS;
  return Boolean(transitions[currentStatus]?.includes(nextStatus));
}

type OrderLineLike = {
  itemType?: string | null;
  item_type?: string | null;
  uploadedDesignId?: string | null;
  uploaded_design_id?: string | null;
  itemMetadata?: unknown;
  item_metadata?: unknown;
  type?: unknown;
};

function normalizedItemType(line: OrderLineLike) {
  const metadata = line.itemMetadata ?? line.item_metadata;
  const metadataType = metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>).type
    : undefined;
  return String(line.itemType ?? line.item_type ?? line.type ?? metadataType ?? "").trim().toLowerCase();
}

export function classifyOrderLine(line: OrderLineLike): OrderWorkstreamType {
  const uploadedDesignId = line.uploadedDesignId ?? line.uploaded_design_id;
  const itemType = normalizedItemType(line);
  return uploadedDesignId || ["custom", "custom_design", "custom-design", "uploaded_design"].includes(itemType)
    ? "custom"
    : "catalog";
}

export function inferOrderType(lines: OrderLineLike[]): MixedOrderType {
  const types = new Set(lines.map(classifyOrderLine));
  if (types.has("catalog") && types.has("custom")) return "mixed_order";
  return types.has("custom") ? "custom_order" : "catalog_order";
}

export function workstreamTypesForLines(lines: OrderLineLike[]) {
  const types = new Set(lines.map(classifyOrderLine));
  return ORDER_WORKSTREAM_TYPES.filter((type) => types.has(type));
}

export function initialWorkstreamStatus(type: OrderWorkstreamType): OrderWorkstreamStatus {
  void type;
  return "pending";
}

export function workstreamStatuses(type: OrderWorkstreamType): readonly OrderWorkstreamStatus[] {
  void type;
  return PRODUCTION_STATUSES;
}

export function isWorkstreamStatus(type: OrderWorkstreamType, status: string): status is OrderWorkstreamStatus {
  return workstreamStatuses(type).includes(status as OrderWorkstreamStatus);
}

export function canTransitionWorkstreamStatus(
  type: OrderWorkstreamType,
  currentStatus: string,
  nextStatus: string,
) {
  void type;
  if (currentStatus === nextStatus) return true;
  const current = normalizeProductionStatus(currentStatus);
  if (!current || !isWorkstreamStatus(type, nextStatus)) return false;
  return current !== "fulfilled" && current !== "cancelled";
}

export function workstreamTrackingReference(orderNumber: string, type: OrderWorkstreamType) {
  return `${orderNumber}-${type === "custom" ? "CUS" : "CAT"}`;
}

const LEGACY_PRODUCTION_STATUS_MAP: Record<string, ProductionStatus> = {
  design_review: "pending",
  measurements_confirmed: "processing",
  picking: "processing",
  ready: "fulfilled",
};

const PRODUCTION_STATUS_RANK: Record<Exclude<ProductionStatus, "cancelled">, number> = {
  pending: 0,
  processing: 1,
  tailoring: 2,
  quality_check: 3,
  fulfilled: 4,
};

export function normalizeProductionStatus(value: string | null | undefined): ProductionStatus | undefined {
  const status = String(value ?? "").trim().toLowerCase();
  if ((PRODUCTION_STATUSES as readonly string[]).includes(status)) return status as ProductionStatus;
  return LEGACY_PRODUCTION_STATUS_MAP[status];
}

export function rollUpLineItemStatus(
  lineItems: Array<{ status: string }>,
): ProductionStatus {
  if (!lineItems.length) return "pending";
  const normalized = lineItems.map((line) => normalizeProductionStatus(line.status) ?? "pending");
  const active = normalized.filter((status) => status !== "cancelled");
  if (!active.length) return "cancelled";
  return active.reduce((slowest, status) =>
    PRODUCTION_STATUS_RANK[status] < PRODUCTION_STATUS_RANK[slowest] ? status : slowest,
  );
}

export function allActiveLineItemsFulfilled(lineItems: Array<{ status: string }>) {
  const active = lineItems
    .map((line) => normalizeProductionStatus(line.status))
    .filter((status): status is ProductionStatus => Boolean(status) && status !== "cancelled");
  return active.length > 0 && active.every((status) => status === "fulfilled");
}

export function rollUpOrderStatus(
  workstreams: Array<{ type: OrderWorkstreamType; status: string }>,
): ProductionStatus {
  if (!workstreams.length) return "pending";

  const normalized = workstreams.map((workstream) => ({
    ...workstream,
    status: normalizeProductionStatus(workstream.status) ?? "pending",
  }));
  const active = normalized.filter((workstream) => workstream.status !== "cancelled");
  if (!active.length) return "cancelled";
  return active.reduce<Exclude<ProductionStatus, "cancelled">>(
    (slowest, workstream) =>
      PRODUCTION_STATUS_RANK[workstream.status as Exclude<ProductionStatus, "cancelled">] <
        PRODUCTION_STATUS_RANK[slowest]
        ? workstream.status as Exclude<ProductionStatus, "cancelled">
        : slowest,
    "fulfilled",
  );
}

const SHIPPED_DELIVERY_STATUSES = new Set([
  "assigned_to_ems",
  "handed_to_ems",
  "in_transit",
  "at_hub",
  "out_for_delivery",
  "failed_attempt",
]);
const PICKUP_READY_DELIVERY_STATUSES = new Set([
  "ready_for_pickup",
  "customer_notified",
  "waiting_customer",
]);

function customerDeliveryStage(
  fulfillmentType: string,
  deliveryStatus: string,
): "fulfilled" | "shipped" | "ready_for_pickup" | "delivered" | "cancelled" {
  const status = deliveryStatus.trim().toLowerCase();
  if (status === "returned" || status === "cancelled_pickup") return "cancelled";
  if (status === "delivered" || status === "picked_up") return "delivered";
  if (fulfillmentType === "pickup" && PICKUP_READY_DELIVERY_STATUSES.has(status)) return "ready_for_pickup";
  if (fulfillmentType !== "pickup" && SHIPPED_DELIVERY_STATUSES.has(status)) return "shipped";
  return "fulfilled";
}

export function deriveCustomerMainStatus(params: {
  fulfillmentType?: string | null;
  productionStatus: ProductionStatus;
  deliveryStatus?: string | null;
}): CustomerMainStatus {
  if (params.productionStatus !== "fulfilled") return params.productionStatus;
  const fulfillmentType = String(params.fulfillmentType ?? "mail").toLowerCase();
  return customerDeliveryStage(
    fulfillmentType,
    String(params.deliveryStatus ?? "not_started"),
  );
}

export function workstreamLabel(type: OrderWorkstreamType) {
  return type === "custom" ? "Custom" : "Catalog";
}
