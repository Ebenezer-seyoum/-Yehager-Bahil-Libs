import { describe, expect, it } from "vitest";
import {
  allActiveLineItemsFulfilled,
  canTransitionWorkstreamStatus,
  canTransitionDeliveryStatus,
  classifyOrderLine,
  CUSTOMER_MAIN_STATUSES,
  deriveCustomerMainStatus,
  inferOrderType,
  MAIL_DELIVERY_STATUSES,
  PICKUP_DELIVERY_STATUSES,
  PRODUCTION_STATUSES,
  rollUpLineItemStatus,
  rollUpOrderStatus,
  workstreamTrackingReference,
} from "../../lib/orders/order-workstreams.js";

describe("order workstreams", () => {
  it("classifies uploaded designs as custom and normal products as catalog", () => {
    expect(classifyOrderLine({ item_type: "product" })).toBe("catalog");
    expect(classifyOrderLine({ uploaded_design_id: "design-id" })).toBe("custom");
    expect(classifyOrderLine({ itemType: "custom_design" })).toBe("custom");
  });

  it("marks a basket containing both item types as one mixed order", () => {
    expect(inferOrderType([{ itemType: "product" }, { itemType: "custom_design" }])).toBe("mixed_order");
    expect(inferOrderType([{ itemType: "product" }])).toBe("catalog_order");
    expect(inferOrderType([{ uploadedDesignId: "design-id" }])).toBe("custom_order");
  });

  it("uses the exact shared production and customer status vocabularies", () => {
    expect(PRODUCTION_STATUSES).toEqual([
      "pending",
      "processing",
      "tailoring",
      "quality_check",
      "fulfilled",
      "cancelled",
    ]);
    expect(CUSTOMER_MAIN_STATUSES).toEqual([
      "pending",
      "processing",
      "tailoring",
      "quality_check",
      "fulfilled",
      "shipped",
      "ready_for_pickup",
      "delivered",
      "cancelled",
    ]);
  });

  it("allows non-terminal production changes and locks terminal states", () => {
    expect(canTransitionWorkstreamStatus("catalog", "pending", "quality_check")).toBe(true);
    expect(canTransitionWorkstreamStatus("custom", "processing", "tailoring")).toBe(true);
    expect(canTransitionWorkstreamStatus("custom", "fulfilled", "quality_check")).toBe(false);
    expect(canTransitionWorkstreamStatus("catalog", "cancelled", "pending")).toBe(false);
  });

  it("rolls the slowest active line and workstream into shared production status", () => {
    expect(rollUpLineItemStatus([
      { status: "fulfilled" },
      { status: "processing" },
      { status: "cancelled" },
    ])).toBe("processing");
    expect(rollUpLineItemStatus([
      { status: "cancelled" },
      { status: "cancelled" },
    ])).toBe("cancelled");
    expect(allActiveLineItemsFulfilled([
      { status: "fulfilled" },
      { status: "cancelled" },
    ])).toBe(true);
    expect(allActiveLineItemsFulfilled([
      { status: "fulfilled" },
      { status: "quality_check" },
    ])).toBe(false);
    expect(allActiveLineItemsFulfilled([
      { status: "cancelled" },
    ])).toBe(false);
    expect(rollUpOrderStatus([
      { type: "catalog", status: "pending" },
      { type: "custom", status: "design_review" },
    ])).toBe("pending");
    expect(rollUpOrderStatus([
      { type: "catalog", status: "fulfilled" },
      { type: "custom", status: "tailoring" },
    ])).toBe("tailoring");
    expect(rollUpOrderStatus([
      { type: "catalog", status: "ready" },
      { type: "custom", status: "ready" },
    ])).toBe("fulfilled");
  });

  it("creates stable child tracking references", () => {
    expect(workstreamTrackingReference("YH-20260720-1234", "catalog")).toBe("YH-20260720-1234-CAT");
    expect(workstreamTrackingReference("YH-20260720-1234", "custom")).toBe("YH-20260720-1234-CUS");
  });

  it("keeps mail delivery transitions separate from production", () => {
    expect(MAIL_DELIVERY_STATUSES).toEqual([
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
    ]);
    expect(canTransitionDeliveryStatus("mail", "not_started", "packing")).toBe(true);
    expect(canTransitionDeliveryStatus("mail", "packed", "in_transit")).toBe(false);
    expect(canTransitionDeliveryStatus("mail", "handed_to_ems", "in_transit")).toBe(true);
    expect(canTransitionDeliveryStatus("mail", "failed_attempt", "returned")).toBe(true);
  });

  it("supports the pickup delivery lifecycle", () => {
    expect(PICKUP_DELIVERY_STATUSES).toEqual([
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
    ]);
    expect(canTransitionDeliveryStatus("pickup", "packed", "moved_to_pickup_desk")).toBe(true);
    expect(canTransitionDeliveryStatus("pickup", "moved_to_pickup_desk", "ready_for_pickup")).toBe(true);
    expect(canTransitionDeliveryStatus("pickup", "ready_for_pickup", "picked_up")).toBe(true);
    expect(canTransitionDeliveryStatus("pickup", "picked_up", "delivered")).toBe(true);
    expect(canTransitionDeliveryStatus("pickup", "packed", "delivered")).toBe(false);
  });

  it("derives exact parent customer statuses from parent-level fulfillment", () => {
    expect(deriveCustomerMainStatus({
      productionStatus: "tailoring",
      fulfillmentType: "mail",
      deliveryStatus: "in_transit",
    })).toBe("tailoring");
    expect(deriveCustomerMainStatus({
      productionStatus: "fulfilled",
      fulfillmentType: "mail",
      deliveryStatus: "failed_attempt",
    })).toBe("shipped");
    expect(deriveCustomerMainStatus({
      productionStatus: "fulfilled",
      fulfillmentType: "mail",
      deliveryStatus: "returned",
    })).toBe("cancelled");
    expect(deriveCustomerMainStatus({
      productionStatus: "fulfilled",
      fulfillmentType: "pickup",
      deliveryStatus: "waiting_customer",
    })).toBe("ready_for_pickup");
    expect(deriveCustomerMainStatus({
      productionStatus: "fulfilled",
      fulfillmentType: "pickup",
      deliveryStatus: "picked_up",
    })).toBe("delivered");
    expect(deriveCustomerMainStatus({
      productionStatus: "fulfilled",
      fulfillmentType: "pickup",
      deliveryStatus: "cancelled_pickup",
    })).toBe("cancelled");
  });
});
