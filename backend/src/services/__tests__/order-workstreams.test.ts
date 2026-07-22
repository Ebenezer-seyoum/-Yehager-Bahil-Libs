import { describe, expect, it } from "vitest";
import {
  canTransitionWorkstreamStatus,
  canTransitionDeliveryStatus,
  classifyOrderLine,
  inferOrderType,
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

  it("uses independent adjacent status transitions", () => {
    expect(canTransitionWorkstreamStatus("catalog", "pending", "picking")).toBe(true);
    expect(canTransitionWorkstreamStatus("catalog", "pending", "ready")).toBe(false);
    expect(canTransitionWorkstreamStatus("custom", "measurements_confirmed", "tailoring")).toBe(true);
    expect(canTransitionWorkstreamStatus("custom", "design_review", "ready")).toBe(false);
  });

  it("rolls workstream progress into the shared order status", () => {
    expect(rollUpOrderStatus([
      { type: "catalog", status: "pending" },
      { type: "custom", status: "design_review" },
    ])).toBe("pending");
    expect(rollUpOrderStatus([
      { type: "catalog", status: "ready" },
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
    expect(canTransitionDeliveryStatus("mail", "not_started", "packing")).toBe(true);
    expect(canTransitionDeliveryStatus("mail", "packed", "in_transit")).toBe(false);
    expect(canTransitionDeliveryStatus("mail", "handed_to_ems", "in_transit")).toBe(true);
    expect(canTransitionDeliveryStatus("mail", "failed_attempt", "returned")).toBe(true);
  });

  it("supports the pickup delivery lifecycle", () => {
    expect(canTransitionDeliveryStatus("pickup", "packed", "moved_to_pickup_desk")).toBe(true);
    expect(canTransitionDeliveryStatus("pickup", "moved_to_pickup_desk", "ready_for_pickup")).toBe(true);
    expect(canTransitionDeliveryStatus("pickup", "ready_for_pickup", "picked_up")).toBe(true);
    expect(canTransitionDeliveryStatus("pickup", "packed", "delivered")).toBe(false);
  });
});
