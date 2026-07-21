export const ORDER_WORKSTREAM_TYPES = ["catalog", "custom"] as const;

export type OrderWorkstreamType = (typeof ORDER_WORKSTREAM_TYPES)[number];
export type MixedOrderType = "catalog_order" | "custom_order" | "mixed_order";

export const CATALOG_WORKSTREAM_STATUSES = [
  "pending",
  "picking",
  "quality_check",
  "ready",
  "cancelled",
] as const;

export const CUSTOM_WORKSTREAM_STATUSES = [
  "design_review",
  "measurements_confirmed",
  "tailoring",
  "quality_check",
  "ready",
  "cancelled",
] as const;

export type CatalogWorkstreamStatus = (typeof CATALOG_WORKSTREAM_STATUSES)[number];
export type CustomWorkstreamStatus = (typeof CUSTOM_WORKSTREAM_STATUSES)[number];
export type OrderWorkstreamStatus = CatalogWorkstreamStatus | CustomWorkstreamStatus;

type OrderLineLike = {
  itemType?: string | null;
  item_type?: string | null;
  uploadedDesignId?: string | null;
  uploaded_design_id?: string | null;
  itemMetadata?: unknown;
  item_metadata?: unknown;
  type?: unknown;
};

const CATALOG_TRANSITIONS: Record<CatalogWorkstreamStatus, readonly CatalogWorkstreamStatus[]> = {
  pending: ["picking", "cancelled"],
  picking: ["pending", "quality_check", "cancelled"],
  quality_check: ["picking", "ready", "cancelled"],
  ready: ["quality_check", "cancelled"],
  cancelled: ["pending"],
};

const CUSTOM_TRANSITIONS: Record<CustomWorkstreamStatus, readonly CustomWorkstreamStatus[]> = {
  design_review: ["measurements_confirmed", "cancelled"],
  measurements_confirmed: ["design_review", "tailoring", "cancelled"],
  tailoring: ["measurements_confirmed", "quality_check", "cancelled"],
  quality_check: ["tailoring", "ready", "cancelled"],
  ready: ["quality_check", "cancelled"],
  cancelled: ["design_review"],
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
  return type === "custom" ? "design_review" : "pending";
}

export function workstreamStatuses(type: OrderWorkstreamType): readonly OrderWorkstreamStatus[] {
  return type === "custom" ? CUSTOM_WORKSTREAM_STATUSES : CATALOG_WORKSTREAM_STATUSES;
}

export function isWorkstreamStatus(type: OrderWorkstreamType, status: string): status is OrderWorkstreamStatus {
  return workstreamStatuses(type).includes(status as OrderWorkstreamStatus);
}

export function canTransitionWorkstreamStatus(
  type: OrderWorkstreamType,
  currentStatus: string,
  nextStatus: string,
) {
  if (currentStatus === nextStatus) return true;
  if (!isWorkstreamStatus(type, currentStatus) || !isWorkstreamStatus(type, nextStatus)) return false;
  if (type === "custom") {
    return CUSTOM_TRANSITIONS[currentStatus as CustomWorkstreamStatus].includes(nextStatus as CustomWorkstreamStatus);
  }
  return CATALOG_TRANSITIONS[currentStatus as CatalogWorkstreamStatus].includes(nextStatus as CatalogWorkstreamStatus);
}

export function workstreamTrackingReference(orderNumber: string, type: OrderWorkstreamType) {
  return `${orderNumber}-${type === "custom" ? "CUS" : "CAT"}`;
}

export function rollUpOrderStatus(
  workstreams: Array<{ type: OrderWorkstreamType; status: string }>,
): "pending" | "processing" | "tailoring" | "quality_check" | "fulfilled" | "cancelled" {
  if (!workstreams.length) return "pending";

  const active = workstreams.filter((workstream) => workstream.status !== "cancelled");
  if (!active.length) return "cancelled";
  if (active.every((workstream) => workstream.status === "ready")) return "fulfilled";
  if (active.some((workstream) => workstream.status === "tailoring")) return "tailoring";
  if (active.some((workstream) => workstream.status === "quality_check")) return "quality_check";

  const hasProgress = active.some((workstream) => {
    const initial = initialWorkstreamStatus(workstream.type);
    return workstream.status !== initial;
  });
  return hasProgress ? "processing" : "pending";
}

export function workstreamLabel(type: OrderWorkstreamType) {
  return type === "custom" ? "Custom" : "Catalog";
}
