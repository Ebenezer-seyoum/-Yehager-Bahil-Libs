import type { AdminPageId } from "./types";

/** Column keys per page/tab — extend as tables migrate to shared DataTable */
export const TABLE_COLUMNS: Partial<
  Record<AdminPageId, Record<string, string[]>>
> = {
  orders: {
    all: ["orderId", "customer", "clothingItems", "measurementStatus", "paymentStatus", "orderStatus", "deliveryStatus", "total", "currency", "date", "actions"],
    pending: ["orderId", "customer", "clothingItems", "measurementStatus", "paymentStatus", "total", "date", "actions"],
  },
  products: {
    all: ["image", "name", "category", "stock", "price", "status", "sold", "actions"],
    "low-stock": ["image", "name", "category", "stock", "price", "status", "actions"],
  },
  payments: {
    all: ["paymentId", "orderId", "customer", "method", "currency", "amount", "status", "date", "actions"],
  },
};

export function columnsForTab(pageId: AdminPageId, tabId: string) {
  return TABLE_COLUMNS[pageId]?.[tabId] ?? TABLE_COLUMNS[pageId]?.all ?? [];
}
