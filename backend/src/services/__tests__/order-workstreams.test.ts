import { describe, expect, it } from "vitest";
import {
  canTransitionWorkstreamStatus,
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
});
