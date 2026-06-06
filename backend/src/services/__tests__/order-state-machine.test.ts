import { describe, expect, it } from "vitest";
import { canTransitionPaymentStatus, deriveOrderStatusOnPayment } from "../order-state-machine.js";

describe("order-state-machine", () => {
  it("allows pending -> paid transition", () => {
    expect(canTransitionPaymentStatus("pending", "paid")).toBe(true);
  });

  it("rejects paid -> pending transition", () => {
    expect(canTransitionPaymentStatus("paid", "pending")).toBe(false);
  });

  it("keeps pending order status when payment is paid", () => {
    expect(deriveOrderStatusOnPayment("pending", "paid")).toBe("pending");
  });
});
