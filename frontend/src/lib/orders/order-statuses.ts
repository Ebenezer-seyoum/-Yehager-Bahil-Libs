export const PRODUCTION_ORDER_STATUSES = [
  "pending",
  "processing",
  "tailoring",
  "quality_check",
  "fulfilled",
  "cancelled",
] as const;

export const CUSTOMER_ORDER_STATUSES = [
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

export type ProductionOrderStatus = (typeof PRODUCTION_ORDER_STATUSES)[number];
export type CustomerOrderStatus = (typeof CUSTOMER_ORDER_STATUSES)[number];
export type MailDeliveryStatus = (typeof MAIL_DELIVERY_STATUSES)[number];
export type PickupDeliveryStatus = (typeof PICKUP_DELIVERY_STATUSES)[number];

const LEGACY_PRODUCTION_STATUS_MAP: Record<string, ProductionOrderStatus> = {
  pending: "pending",
  design_review: "pending",
  processing: "processing",
  picking: "processing",
  measurements_confirmed: "processing",
  tailoring: "tailoring",
  quality_check: "quality_check",
  ready: "fulfilled",
  fulfilled: "fulfilled",
  cancelled: "cancelled",
};

const CUSTOMER_STATUS_RANK: Record<CustomerOrderStatus, number> = {
  pending: 0,
  processing: 1,
  tailoring: 2,
  quality_check: 3,
  fulfilled: 4,
  shipped: 5,
  ready_for_pickup: 5,
  delivered: 6,
  cancelled: 7,
};

export function normalizeProductionStatus(value?: string | null): ProductionOrderStatus {
  return LEGACY_PRODUCTION_STATUS_MAP[String(value ?? "pending").toLowerCase()] ?? "pending";
}

export function customerStatusForItem({
  productionStatus,
  deliveryStatus,
  fulfillmentType,
}: {
  productionStatus?: string | null;
  deliveryStatus?: string | null;
  fulfillmentType?: string | null;
}): CustomerOrderStatus {
  const production = normalizeProductionStatus(productionStatus);
  if (production !== "fulfilled") return production;

  const delivery = String(deliveryStatus ?? "not_started").toLowerCase();
  if (fulfillmentType === "pickup") {
    if (delivery === "cancelled_pickup") return "cancelled";
    if (delivery === "picked_up" || delivery === "delivered") return "delivered";
    if (["ready_for_pickup", "customer_notified", "waiting_customer"].includes(delivery)) {
      return "ready_for_pickup";
    }
    return "fulfilled";
  }

  if (delivery === "returned") return "cancelled";
  if (delivery === "delivered") return "delivered";
  if (
    [
      "assigned_to_ems",
      "handed_to_ems",
      "in_transit",
      "at_hub",
      "out_for_delivery",
      "failed_attempt",
    ].includes(delivery)
  ) {
    return "shipped";
  }
  return "fulfilled";
}

export function rollUpCustomerStatus(statuses: CustomerOrderStatus[]): CustomerOrderStatus {
  if (!statuses.length) return "pending";
  const active = statuses.filter((status) => status !== "cancelled");
  if (!active.length) return "cancelled";
  return active.reduce((slowest, status) =>
    CUSTOMER_STATUS_RANK[status] < CUSTOMER_STATUS_RANK[slowest] ? status : slowest,
  );
}

export function isProductionComplete(status?: string | null) {
  const normalized = normalizeProductionStatus(status);
  return normalized === "fulfilled" || normalized === "cancelled";
}
