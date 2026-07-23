export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "awaiting_verification";
export type OrderStatus =
  | "pending"
  | "processing"
  | "tailoring"
  | "quality_check"
  | "fulfilled"
  | "shipped"
  | "delivered"
  | "ready_for_pickup"
  | "cancelled";

const allowedPaymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["paid", "failed", "awaiting_verification"],
  paid: ["refunded"],
  failed: [],
  refunded: [],
  awaiting_verification: ["paid", "failed"],
};

export function canTransitionPaymentStatus(currentStatus: string, nextStatus: PaymentStatus) {
  const current = currentStatus as PaymentStatus;
  return (allowedPaymentTransitions[current] ?? []).includes(nextStatus);
}

export function deriveOrderStatusOnPayment(orderStatus: string, nextPaymentStatus: PaymentStatus): OrderStatus | undefined {
  const currentOrderStatus = orderStatus as OrderStatus;
  if (nextPaymentStatus === "paid") {
    return currentOrderStatus === "pending" ? "pending" : currentOrderStatus;
  }
  return undefined;
}
