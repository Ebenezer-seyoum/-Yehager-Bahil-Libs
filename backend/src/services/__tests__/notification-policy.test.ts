import { describe, expect, it } from "vitest";
import { canReceiveNotification, notificationRuleForType } from "../../lib/auth/notification-policy.js";

describe("notification permission policy", () => {
  it("routes order notifications only to employees who can view orders", () => {
    expect(canReceiveNotification("new_catalog_order", ["orders.view"])).toBe(true);
    expect(canReceiveNotification("new_catalog_order", ["payments.view"])).toBe(false);
  });

  it("routes payment notifications independently from orders", () => {
    expect(canReceiveNotification("payment_received", ["payments.view"])).toBe(true);
    expect(canReceiveNotification("payment_received", ["payments.verify"])).toBe(true);
    expect(canReceiveNotification("payment_received", ["orders.view"])).toBe(false);
  });

  it("routes custom requests to uploaded-design permission holders", () => {
    expect(notificationRuleForType("design_review").category).toBe("custom_designs");
    expect(canReceiveNotification("design_review", ["uploaded_designs.view"])).toBe(true);
    expect(canReceiveNotification("design_review", ["orders.view"])).toBe(false);
  });

  it("allows administrators to receive every alert type", () => {
    expect(canReceiveNotification("unknown_system_event", [], true)).toBe(true);
  });
});
