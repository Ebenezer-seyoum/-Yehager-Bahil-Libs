"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  ImageIcon,
  Ruler,
  ShoppingBag,
  StickyNote,
  Truck,
  UserRound,
  Users,
  BadgePercent,
  Trash2,
} from "lucide-react";
import { AdminDetailLayout, AdminDetailHeader } from "@/components/admin/admin-detail-layout";
import { measurementDisplayGroups, normalizeMeasurementRecord } from "@/lib/measurement-fields";
import { can } from "@/lib/permissions";
import { dashboardConfirm, dashboardSuccess, dashboardError } from "@/lib/dashboard-swal";
import { cn } from "@/lib/utils";

type OrderItem = {
  id?: string | null;
  productId?: string | null;
  product_id?: string | null;
  productName?: string | null;
  product_name?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  productImage?: string | null;
  product_image?: string | null;
  frontImageUrl?: string | null;
  front_image_url?: string | null;
  images?: unknown;
  imageUrls?: unknown;
  image_urls?: unknown;
  productImages?: unknown;
  product_images?: unknown;
  customDesignImages?: unknown;
  custom_design_images?: unknown;
  quantity?: number | string | null;
  price?: number | string | null;
  priceUsd?: number | string | null;
  unit_price_usd?: number | string | null;
  line_total_usd?: number | string | null;
  original_price_usd?: number | string | null;
  discount_amount_usd?: number | string | null;
  discount_label?: string | null;
  item_metadata?: Record<string, unknown> | null;
  itemMetadata?: Record<string, unknown> | null;
  measurements?: Record<string, unknown> | null;
  measurementDetails?: Record<string, unknown> | null;
  measurement_details?: Record<string, unknown> | null;
  measurementSnapshot?: Record<string, unknown> | null;
  measurement_snapshot?: Record<string, unknown> | null;
  gender?: string | null;
  relation?: string | null;
  age?: string | number | null;
  childAge?: string | number | null;
  child_age?: string | number | null;
};

type ShippingAddress = {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  house?: string | null;
  subcity?: string | null;
};

type OrderMember = {
  id?: string | null;
  familyGroupId?: string | null;
  family_group_id?: string | null;
  name?: string | null;
  customerName?: string | null;
  gender?: string | null;
  relation?: string | null;
  age?: string | number | null;
  childAge?: string | number | null;
  child_age?: string | number | null;
  measurements?: Record<string, unknown> | null;
  measurementSnapshot?: Record<string, unknown> | null;
  measurement_snapshot?: Record<string, unknown> | null;
};

export type OrderDetailData = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  gender?: string | null;
  customerGender?: string | null;
  customer_gender?: string | null;
  userEmail?: string | null;
  totalUsd?: number | string | null;
  subtotalUsd?: number | string | null;
  subtotal_usd?: number | string | null;
  discountAmountUsd?: number | string | null;
  discount_amount_usd?: number | string | null;
  couponCode?: string | null;
  coupon_code?: string | null;
  totalEtb?: number | string | null;
  totalAmount?: number | string | null;
  shippingCostUsd?: number | string | null;
  orderType?: string | null;
  orderMode?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
  paymentProofUrl?: string | null;
  paymentProofUploadedAt?: string | null;
  fulfillmentType?: string | null;
  carrier?: string | null;
  deliveryStatus?: string | null;
  delivery_status?: string | null;
  deliveryStatusChangedBy?: string | null;
  delivery_status_changed_by?: string | null;
  deliveryStatusChangedAt?: string | null;
  delivery_status_changed_at?: string | null;
  trackingNumber?: string | null;
  tracking_number?: string | null;
  pickupLocation?: string | null;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
  pickupIdUrl?: string | null;
  pickupSignedDocUrl?: string | null;
  pickupProofUrl?: string | null;
  shippingDocumentUrl?: string | null;
  shippingDocuments?: Array<{ url: string; label?: string | null; uploadedAt?: string | null }> | null;
  shippingAddress?: string | ShippingAddress | null;
  items?: OrderItem[] | null;
  phoneNumber?: string | null;
  phone_number?: string | null;
  paymentReference?: string | null;
  payment_reference?: string | null;
  members?: OrderMember[] | null;
  remarks?: string | null;
  measurements?: Record<string, unknown> | null;
  measurementSnapshot?: Record<string, unknown> | null;
  measurement_snapshot?: Record<string, unknown> | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

const MAIN_STATUSES = ["pending", "processing", "tailoring", "quality_check", "fulfilled", "shipped", "ready_for_pickup", "delivered", "cancelled"] as const;
const PAYMENT_STATUSES = ["pending", "awaiting_verification", "paid", "failed", "refunded", "unpaid"] as const;
const DELIVERY_WINDOW_DAYS = 40;
type MainStatus = (typeof MAIN_STATUSES)[number];
type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
type OrderDetailSection = "summary" | "items" | "discounts" | "customer" | "measurements" | "shipping" | "timeline" | "attachments" | "notes";
type MeasurementPerson = {
  id: string;
  name: string;
  groupId?: string | null;
  groupName?: string | null;
  gender?: string | null;
  relation?: string | null;
  age?: string | number | null;
  productName?: string | null;
  productImage?: string | null;
  measurements: Record<string, unknown>;
};
type MeasurementGroup = {
  id: string;
  name: string;
  productName?: string | null;
  productImage?: string | null;
  eventName?: string | null;
  people: MeasurementPerson[];
};
type MeasurementDisplayRow = { label: string; values: Record<string, unknown>; updatedAt?: string | number | Date | null; meta?: string };
type NoteType = "customer" | "admin" | "tailor" | "delivery";
type OrderNote = {
  id: string;
  orderId?: string;
  order_id?: string;
  noteType?: NoteType;
  note_type?: NoteType;
  note: string;
  createdByUserId?: string | null;
  created_by_user_id?: string | null;
  createdByName?: string | null;
  created_by_name?: string | null;
  createdByEmail?: string | null;
  created_by_email?: string | null;
  createdByRole?: string | null;
  created_by_role?: string | null;
  createdAt?: string | number | Date;
  created_at?: string | number | Date;
  editedAt?: string | number | Date | null;
  edited_at?: string | number | Date | null;
};

const MEASUREMENT_META_KEYS = new Set([
  "name",
  "customerName",
  "customer_name",
  "memberName",
  "member_name",
  "gender",
  "relation",
  "age",
  "childAge",
  "child_age",
  "productName",
  "product_name",
]);
const NOTE_MIN_LENGTH = 3;
const NOTE_MAX_LENGTH = 1000;
const NOTE_EDIT_WINDOW_MS = 15 * 60 * 1000;
const NOTE_CONFIG: Array<{
  type: NoteType;
  title: string;
  placeholder: string;
  helper: string;
  button: string;
}> = [
  {
    type: "customer",
    title: "Customer Notes",
    placeholder: "Customer checkout note appears here.",
    helper: "Read-only notes from the customer order request.",
    button: "",
  },
  {
    type: "admin",
    title: "Admin Notes",
    placeholder: "Add payment, customer request, priority, or order handling note...",
    helper: "Visible to internal team only. Add clear, short notes for future reference.",
    button: "Add Admin Note",
  },
  {
    type: "tailor",
    title: "Tailor Notes",
    placeholder: "Add production instruction, fitting concern, measurement issue, or tailoring update...",
    helper: "Visible to admin and production team. Use for fitting, cutting, sewing, or measurement issues.",
    button: "Add Tailor Note",
  },
  {
    type: "delivery",
    title: "Delivery Notes",
    placeholder: "Add pickup, EMS tracking, address, handover, or delivery instruction...",
    helper: "Visible to admin and delivery team. Use for pickup, EMS, address, or handover updates.",
    button: "Add Delivery Note",
  },
];

const PICKUP_STATES = [
  "not_started",
  "packing",
  "packed",
  "moved_to_pickup_desk",
  "ready_for_pickup",
  "customer_notified",
  "waiting_customer",
  "picked_up",
  "delivered",
] as const;

const SHIPPING_STATES = ["not_started", "packing", "packed", "assigned_to_ems", "handed_to_ems", "in_transit", "at_hub", "out_for_delivery", "delivered"] as const;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  processing: "bg-sky-50 text-sky-800 border-sky-200",
  tailoring: "bg-blue-50 text-blue-800 border-blue-200",
  quality_check: "bg-violet-50 text-violet-800 border-violet-200",
  fulfilled: "bg-emerald-50 text-emerald-800 border-emerald-200",
  ready_for_pickup: "bg-emerald-50 text-emerald-800 border-emerald-200",
  shipped: "bg-cyan-50 text-cyan-800 border-cyan-200",
  delivered: "bg-green-50 text-green-800 border-green-200",
  picked_up: "bg-green-50 text-green-800 border-green-200",
  cancelled: "bg-rose-50 text-rose-800 border-rose-200",
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  awaiting_verification: "bg-orange-50 text-orange-800 border-orange-200",
  paid: "bg-green-50 text-green-800 border-green-200",
  failed: "bg-rose-50 text-rose-800 border-rose-200",
  refunded: "bg-slate-50 text-slate-700 border-slate-200",
  unpaid: "bg-orange-50 text-orange-800 border-orange-200",
};

function prettyLabel(value?: string | null) {
  return (value ?? "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function money(value?: number | string | null) {
  const n = Number(value);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00";
}

function dateTime(value?: string | number | Date | null) {
  if (!value) return "Not provided";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not provided";
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function dateOnly(value?: string | number | Date | null) {
  if (!value) return "Not provided";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Not provided";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  const display = value == null || String(value).trim() === "" ? "Not provided" : String(value);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950">{display}</p>
    </div>
  );
}

function itemName(item: OrderItem, index: number) {
  return item.productName ?? item.product_name ?? item.name ?? `Order Item ${index + 1}`;
}

function itemImage(item: OrderItem) {
  return item.imageUrl ?? item.image_url ?? item.productImage ?? item.product_image ?? item.frontImageUrl ?? item.front_image_url ?? null;
}

function collectImageValues(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (typeof entry === "string") return entry.trim() ? [entry] : [];
      if (entry && typeof entry === "object") {
        const row = entry as Record<string, unknown>;
        return collectImageValues(row.url ?? row.imageUrl ?? row.image_url ?? row.src ?? row.path);
      }
      return [];
    });
  }
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    return collectImageValues(row.url ?? row.imageUrl ?? row.image_url ?? row.src ?? row.path);
  }
  return [];
}

function itemImages(item: OrderItem) {
  const metadata = item.itemMetadata ?? item.item_metadata ?? {};
  const images = [
    ...collectImageValues(item.customDesignImages),
    ...collectImageValues(item.custom_design_images),
    ...collectImageValues(metadata.customDesignImages),
    ...collectImageValues(metadata.custom_design_images),
    ...collectImageValues(metadata.frontImageUrl),
    ...collectImageValues(metadata.front_image_url),
    ...collectImageValues(metadata.sideImageUrl),
    ...collectImageValues(metadata.side_image_url),
    ...collectImageValues(metadata.backImageUrl),
    ...collectImageValues(metadata.back_image_url),
    ...collectImageValues(metadata.detailImageUrl),
    ...collectImageValues(metadata.detail_image_url),
    itemImage(item),
    ...collectImageValues(item.images),
    ...collectImageValues(item.imageUrls),
    ...collectImageValues(item.image_urls),
    ...collectImageValues(item.productImages),
    ...collectImageValues(item.product_images),
    ...collectImageValues(metadata.images),
    ...collectImageValues(metadata.imageUrls),
    ...collectImageValues(metadata.image_urls),
    ...collectImageValues(metadata.productImages),
    ...collectImageValues(metadata.product_images),
    ...collectImageValues(metadata.designImages),
    ...collectImageValues(metadata.design_images),
    ...collectImageValues(metadata.gallery),
  ].filter((image): image is string => Boolean(image && image.trim()));

  return Array.from(new Set(images));
}

function itemPrice(item: OrderItem) {
  return item.line_total_usd ?? item.priceUsd ?? item.unit_price_usd ?? item.price ?? null;
}

function itemUnitPrice(item: OrderItem) {
  return item.unit_price_usd ?? item.priceUsd ?? item.price ?? null;
}

function itemOriginalPrice(item: OrderItem) {
  const metadata = item.itemMetadata ?? item.item_metadata ?? {};
  return item.original_price_usd ?? metadata.original_price_usd ?? metadata.originalPriceUsd ?? null;
}

function itemDiscountLabel(item: OrderItem) {
  const metadata = item.itemMetadata ?? item.item_metadata ?? {};
  return item.discount_label ?? metadata.discount_label ?? metadata.discountLabel ?? null;
}

function itemMeasurements(item: OrderItem) {
  const metadata = item.itemMetadata ?? item.item_metadata ?? {};
  return item.measurements
    ?? item.measurementDetails
    ?? item.measurement_details
    ?? item.measurementSnapshot
    ?? item.measurement_snapshot
    ?? (metadata.measurements as Record<string, unknown> | undefined)
    ?? (metadata.measurementDetails as Record<string, unknown> | undefined)
    ?? (metadata.measurementSnapshot as Record<string, unknown> | undefined)
    ?? (metadata.measurement_snapshot as Record<string, unknown> | undefined)
    ?? {};
}

function firstOrderImage(order: OrderDetailData) {
  for (const item of order.items ?? []) {
    const image = itemImages(item)[0];
    if (image) return image;
  }
  return null;
}

function isCustomOrder(order: OrderDetailData) {
  if (order.orderType === "custom_order" || order.orderType === "custom_design_order") return true;
  return Boolean((order.items ?? []).some((item) => {
    const row = item as Record<string, unknown>;
    return row.uploaded_design_id || row.uploadedDesignId || row.item_type === "custom_design" || row.itemType === "custom_design";
  }));
}

function statusPill(value?: string | null, styles = STATUS_STYLES) {
  const status = value ?? "pending";
  return (
    <span className={cn("inline-flex rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-wider", styles[status] ?? styles.pending)}>
      {prettyLabel(status)}
    </span>
  );
}

function hasMeasurementValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function measurementEntries(measurements: Record<string, unknown>) {
  return Object.entries(measurements ?? {}).filter(([key, value]) => !MEASUREMENT_META_KEYS.has(key) && hasMeasurementValue(value));
}

function measurementText(value: unknown) {
  return hasMeasurementValue(value) ? String(value) : null;
}

function measurementGender(measurements: Record<string, unknown>, fallback?: string | null) {
  return measurementText(fallback) ?? measurementText(measurements.gender) ?? measurementText(measurements.customerGender) ?? measurementText(measurements.customer_gender);
}

function measurementAge(person: Pick<MeasurementPerson, "age">) {
  return hasMeasurementValue(person.age) ? `Age ${person.age}` : null;
}

function metadataValue(metadata: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (hasMeasurementValue(value)) return String(value);
  }
  return null;
}

function groupedMeasurementsFromPeople(people: MeasurementPerson[], fallbackName: string): MeasurementGroup[] {
  const groups = new Map<string, MeasurementGroup>();
  people.forEach((person) => {
    const id = person.groupId || "group-order";
    const current = groups.get(id) ?? {
      id,
      name: person.groupName || fallbackName,
      productName: person.productName,
      productImage: person.productImage,
      people: [],
    };
    if (!current.productImage && person.productImage) current.productImage = person.productImage;
    current.people.push(person);
    groups.set(id, current);
  });
  return Array.from(groups.values());
}

function isDeliveryStageOrder(order: Pick<OrderDetailData, "status" | "deliveryStatus" | "delivery_status">) {
  const mainStatus = String(order.status ?? "").toLowerCase();
  const deliveryStatus = String(order.deliveryStatus ?? order.delivery_status ?? "not_started").toLowerCase();
  return ["fulfilled", "shipped", "ready_for_pickup", "delivered"].includes(mainStatus) || deliveryStatus !== "not_started";
}

function noteType(note: OrderNote): NoteType {
  return note.noteType ?? note.note_type ?? "admin";
}

function noteAuthorId(note: OrderNote) {
  return note.createdByUserId ?? note.created_by_user_id ?? null;
}

function noteAuthorName(note: OrderNote) {
  return note.createdByName ?? note.created_by_name ?? note.createdByEmail ?? note.created_by_email ?? "Team member";
}

function noteAuthorRole(note: OrderNote) {
  return note.createdByRole ?? note.created_by_role ?? "Team";
}

function noteCreatedAt(note: OrderNote) {
  return note.createdAt ?? note.created_at ?? null;
}

function noteEditedAt(note: OrderNote) {
  return note.editedAt ?? note.edited_at ?? null;
}

function noteCanEdit(note: OrderNote, currentUserId?: string | null, isManager = false) {
  if (isManager) return true;
  if (!currentUserId || noteAuthorId(note) !== currentUserId) return false;
  const createdAt = noteCreatedAt(note);
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= NOTE_EDIT_WINDOW_MS;
}

function noteValidation(value: string) {
  const length = value.trim().length;
  if (length === 0) return null;
  if (length < NOTE_MIN_LENGTH) return `Note must be at least ${NOTE_MIN_LENGTH} characters.`;
  if (length > NOTE_MAX_LENGTH) return `Note cannot exceed ${NOTE_MAX_LENGTH} characters.`;
  return null;
}

function deadlineToneClass(tone: "green" | "blue" | "amber" | "rose") {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-800";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function deliveryDeadline(createdAt: string | number | Date, now: Date, completed: boolean) {
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) {
    return {
      dueDate: null as Date | null,
      elapsedDays: 0,
      remainingDays: DELIVERY_WINDOW_DAYS,
      progress: 0,
      label: "Not scheduled",
      note: "Order date is not available.",
      tone: "blue" as const,
    };
  }

  const dueDate = new Date(start);
  dueDate.setDate(dueDate.getDate() + DELIVERY_WINDOW_DAYS);
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
  const remainingDays = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
  const progress = completed ? 100 : Math.min(Math.max(Math.round((elapsedDays / DELIVERY_WINDOW_DAYS) * 100), 0), 100);

  if (completed) {
    return {
      dueDate,
      elapsedDays: Math.min(elapsedDays, DELIVERY_WINDOW_DAYS),
      remainingDays: Math.max(remainingDays, 0),
      progress,
      label: "Completed",
      note: `Order completed within the ${DELIVERY_WINDOW_DAYS}-day delivery window.`,
      tone: "green" as const,
    };
  }
  if (remainingDays < 0) {
    return {
      dueDate,
      elapsedDays,
      remainingDays,
      progress: 100,
      label: "Overdue",
      note: `${Math.abs(remainingDays)} day${Math.abs(remainingDays) === 1 ? "" : "s"} overdue from the ${DELIVERY_WINDOW_DAYS}-day delivery window.`,
      tone: "rose" as const,
    };
  }
  if (progress >= 80) {
    return {
      dueDate,
      elapsedDays,
      remainingDays,
      progress,
      label: "Due Soon",
      note: `${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining from the ${DELIVERY_WINDOW_DAYS}-day delivery window.`,
      tone: "amber" as const,
    };
  }
  if (progress >= 50) {
    return {
      dueDate,
      elapsedDays,
      remainingDays,
      progress,
      label: "Monitor",
      note: `${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining from the ${DELIVERY_WINDOW_DAYS}-day delivery window.`,
      tone: "blue" as const,
    };
  }
  return {
    dueDate,
    elapsedDays,
    remainingDays,
    progress,
    label: "On Track",
    note: `${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining from the ${DELIVERY_WINDOW_DAYS}-day delivery window.`,
    tone: "green" as const,
  };
}

function addressText(address: OrderDetailData["shippingAddress"]) {
  if (typeof address === "string") return address;
  if (!address) return "Not provided";
  return [
    address.street,
    address.house,
    address.subcity,
    address.city,
    address.state,
    address.postalCode ?? address.zip,
    address.country,
  ].filter(Boolean).join(", ") || "Not provided";
}

function stageIndex<T extends readonly string[]>(steps: T, current: string) {
  const idx = steps.findIndex((step) => step === current);
  return idx < 0 ? 0 : idx;
}

export function OrderDetailPage({
  initialOrder,
  backUrl = "/admin/orders",
}: {
  initialOrder: OrderDetailData;
  backUrl?: string;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [order, setOrder] = useState<OrderDetailData>(initialOrder);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<OrderDetailSection>("summary");
  const [activeMemberIdx, setActiveMemberIdx] = useState(0);
  const [expandedMeasurementGroupId, setExpandedMeasurementGroupId] = useState<string | null>(null);
  const [expandedMeasurementMemberId, setExpandedMeasurementMemberId] = useState<string | null>(null);
  const [expandedNoteType, setExpandedNoteType] = useState<NoteType | null>("customer");
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesBusy, setNotesBusy] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<NoteType, string>>({ customer: "", admin: "", tailor: "", delivery: "" });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [timelineNow] = useState(() => new Date());

  const isGroup = order.orderMode === "group" || order.orderType === "group_order" || Boolean(order.members?.length);
  const orderKind = `${isGroup ? "Group" : "Individual"} ${isCustomOrder(order) ? "Custom" : "Catalog"} Order`;
  const orderImage = firstOrderImage(order);
  const isPickup = order.fulfillmentType === "pickup" || order.carrier === "pickup";
  const deliveryStage = isDeliveryStageOrder(order);
  const sessionUser = session?.user as { id?: string | null; role?: string | null; permissions?: string[] | null } | undefined;
  const userPermissions = sessionUser?.permissions ?? [];
  const canDeleteOrder = can(userPermissions, "orders.delete");

  async function handleDeleteOrder() {
    const confirmed = await dashboardConfirm({
      title: "Delete Order?",
      text: `Are you sure you want to delete order #${order.orderNumber}? This will permanently remove the order, notes, and activity history. This action cannot be undone.`,
      confirmButtonText: "Yes, Delete Order",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/orders/${order.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not delete order");
      }
      await dashboardSuccess(
        "Deleted!",
        `Order #${order.orderNumber} has been successfully deleted.`,
      );
      router.push(backUrl);
      router.refresh();
    } catch (error) {
      await dashboardError(
        "Error",
        error instanceof Error ? error.message : "Failed to delete order",
      );
    } finally {
      setBusy(false);
    }
  }

  const isNoteManager = sessionUser?.role === "admin" || sessionUser?.role === "manager" || can(userPermissions, "order_notes.manage");
  const canAddNote: Record<NoteType, boolean> = {
    customer: false,
    admin: isNoteManager || can(userPermissions, "order_notes.admin.create") || can(userPermissions, "orders.edit"),
    tailor: isNoteManager || can(userPermissions, "order_notes.tailor.create"),
    delivery: isNoteManager || can(userPermissions, "order_notes.delivery.create") || can(userPermissions, "shipping.edit"),
  };
  const fulfillmentStatus = order.deliveryStatus ?? order.delivery_status ?? (order.status === "delivered" || order.status === "picked_up"
    ? "delivered"
    : isPickup
      ? order.status === "ready_for_pickup" ? "ready_for_pickup" : "pending"
      : order.status === "shipped" ? "handed_to_ems" : order.status === "fulfilled" ? "assigned_to_ems" : "not_started");
  const subtotalBeforeCoupon = order.subtotalUsd ?? order.subtotal_usd ?? (() => {
    const total = Number(order.totalUsd ?? order.totalAmount ?? 0);
    const shipping = Number(order.shippingCostUsd ?? 0);
    const discount = Number(order.discountAmountUsd ?? order.discount_amount_usd ?? 0);
    const computed = total - shipping + discount;
    return Number.isFinite(computed) && computed >= 0 ? computed : 0;
  })();
  const couponDiscount = Number(order.discountAmountUsd ?? order.discount_amount_usd ?? 0);
  const couponCode = order.couponCode ?? order.coupon_code ?? null;
  const finalTotal = Number(order.totalUsd ?? order.totalAmount ?? 0);
  const deadline = deliveryDeadline(order.createdAt, timelineNow, order.status === "delivered" || order.status === "picked_up");
  const groupMetaById = new Map<string, { name?: string | null; productName?: string | null; productImage?: string | null; eventName?: string | null }>();
  (order.items ?? []).forEach((item, idx) => {
    const metadata = item.itemMetadata ?? item.item_metadata ?? {};
    const groupId = metadataValue(metadata, "group_id", "groupId");
    if (!groupId) return;
    groupMetaById.set(groupId, {
      name: metadataValue(metadata, "group_name", "groupName"),
      productName: itemName(item, idx),
      productImage: itemImage(item),
      eventName: metadataValue(metadata, "event_name", "eventName"),
    });
  });

  const groupMeasurementPeople: MeasurementPerson[] = (order.members ?? []).map((member, idx) => {
    const measurements = member.measurements ?? member.measurementSnapshot ?? member.measurement_snapshot ?? {};
    const groupId = member.familyGroupId ?? member.family_group_id ?? "group-order";
    const groupMeta = groupMetaById.get(groupId);
    return {
      id: member.id ?? `member-${idx}`,
      groupId,
      groupName: groupMeta?.name ?? "Group Order",
      name: member.name ?? member.customerName ?? `Member ${idx + 1}`,
      gender: measurementGender(measurements, member.gender),
      relation: member.relation ?? null,
      age: member.age ?? member.childAge ?? member.child_age ?? null,
      productName: groupMeta?.productName,
      productImage: groupMeta?.productImage,
      measurements: normalizeMeasurementRecord(measurements),
    };
  });
  const itemMeasurementPeople: MeasurementPerson[] = (order.items ?? [])
    .map((item, idx) => {
      const measurements = itemMeasurements(item);
      const metadata = item.itemMetadata ?? item.item_metadata ?? {};
      return {
        id: item.id ?? `item-${idx}`,
        groupId: metadataValue(metadata, "group_id", "groupId"),
        groupName: metadataValue(metadata, "group_name", "groupName"),
        name: metadataValue(metadata, "member_name", "memberName") ?? measurementText(measurements.name) ?? measurementText(measurements.customerName) ?? order.customerName ?? "Customer",
        gender: measurementGender(measurements, item.gender ?? (metadataValue(metadata, "member_gender", "memberGender", "gender") as string | null) ?? null),
        relation: item.relation ?? (metadataValue(metadata, "member_relation", "memberRelation", "relation") as string | null) ?? null,
        age: item.age ?? item.childAge ?? item.child_age ?? metadataValue(metadata, "member_age", "memberAge", "age"),
        productName: itemName(item, idx),
        productImage: itemImage(item),
        measurements: normalizeMeasurementRecord(measurements),
      };
    })
    .filter((person) => measurementEntries(person.measurements).length > 0 || hasMeasurementValue(person.gender));
  const orderMeasurements = order.measurements ?? order.measurementSnapshot ?? order.measurement_snapshot ?? {};
  const orderMeasurementPeople: MeasurementPerson[] = measurementEntries(orderMeasurements).length > 0 || hasMeasurementValue(orderMeasurements.gender)
    ? [{
        id: "order-measurement",
        name: order.customerName ?? "Customer",
        gender: measurementGender(orderMeasurements, order.gender ?? order.customerGender ?? order.customer_gender ?? null),
        measurements: normalizeMeasurementRecord(orderMeasurements),
      }]
    : [];
  const singleMeasurementPeople = itemMeasurementPeople.length > 0 ? itemMeasurementPeople : orderMeasurementPeople;
  const measurementPeople = isGroup && groupMeasurementPeople.length > 0 ? groupMeasurementPeople : singleMeasurementPeople;
  const groupMeasurementGroups = groupedMeasurementsFromPeople(
    groupMeasurementPeople.length > 0 ? groupMeasurementPeople : itemMeasurementPeople.filter((person) => person.groupId || person.groupName),
    "Group Order",
  );
  const activeMeasurementPerson = measurementPeople[Math.min(activeMemberIdx, Math.max(measurementPeople.length - 1, 0))];
  const customerGender = order.gender ?? order.customerGender ?? order.customer_gender ?? activeMeasurementPerson?.gender ?? singleMeasurementPeople[0]?.gender ?? null;

  const sections = [
    { id: "summary", label: "Order Summary", hint: "Core status and totals", icon: ShoppingBag },
    { id: "items", label: "Order Items", hint: "Products and design previews", icon: ImageIcon },
    { id: "discounts", label: "Promotions", hint: "Sale pricing and coupon impact", icon: BadgePercent },
    { id: "customer", label: "Customer Details", hint: "Contact and address", icon: UserRound },
    { id: "measurements", label: "Measurements", hint: "Individual or group sizing", icon: Ruler },
    { id: "shipping", label: "Shipping & Delivery", hint: "Pickup or mail flow", icon: Truck },
    { id: "timeline", label: "Order Timeline", hint: "Lifecycle history", icon: ClipboardList },
    { id: "attachments", label: "Document Attachments", hint: "Required and optional files", icon: FileText },
    { id: "notes", label: "Internal Notes", hint: "Team and customer notes", icon: StickyNote },
  ] as const;

  useEffect(() => {
    if (section !== "notes" || notesLoaded) return;
    let cancelled = false;
    async function loadNotes() {
      setNotesBusy("load");
      setNotesError(null);
      try {
        const res = await fetch(`/api/backend/orders/${order.id}/notes`);
        if (!res.ok) {
          const payload = await res.json().catch(() => null) as { error?: string } | null;
          throw new Error(payload?.error ?? "Could not load notes");
        }
        const payload = await res.json() as { data?: OrderNote[] };
        if (!cancelled) {
          setNotes(payload.data ?? []);
          setNotesLoaded(true);
        }
      } catch (error) {
        if (!cancelled) setNotesError(error instanceof Error ? error.message : "Could not load notes");
      } finally {
        if (!cancelled) setNotesBusy(null);
      }
    }
    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [notesLoaded, order.id, section]);

  async function addNote(type: NoteType) {
    const note = noteDrafts[type]?.trim() ?? "";
    const validation = noteValidation(note);
    if (validation || !canAddNote[type]) return;
    setNotesBusy(`add-${type}`);
    setNotesError(null);
    try {
      const res = await fetch(`/api/backend/orders/${order.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteType: type, note }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not add note");
      }
      const payload = await res.json() as { data?: OrderNote };
      if (payload.data) setNotes((current) => [...current, payload.data!]);
      setNoteDrafts((current) => ({ ...current, [type]: "" }));
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : "Could not add note");
    } finally {
      setNotesBusy(null);
    }
  }

  async function saveEditedNote(noteId: string) {
    const note = editingNoteText.trim();
    const validation = noteValidation(note);
    if (validation) return;
    setNotesBusy(`edit-${noteId}`);
    setNotesError(null);
    try {
      const res = await fetch(`/api/backend/orders/${order.id}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not update note");
      }
      const payload = await res.json() as { data?: OrderNote };
      if (payload.data) setNotes((current) => current.map((item) => item.id === noteId ? payload.data! : item));
      setEditingNoteId(null);
      setEditingNoteText("");
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : "Could not update note");
    } finally {
      setNotesBusy(null);
    }
  }

  async function deleteNote(noteId: string) {
    const confirmed = await dashboardConfirm({
      title: "Are you sure?",
      text: "This order note will be deleted. This action cannot be undone.",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return;
    setNotesBusy(`delete-${noteId}`);
    setNotesError(null);
    try {
      const res = await fetch(`/api/backend/orders/${order.id}/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not delete note");
      }
      setNotes((current) => current.filter((item) => item.id !== noteId));
    } catch (error) {
      setNotesError(error instanceof Error ? error.message : "Could not delete note");
    } finally {
      setNotesBusy(null);
    }
  }

  async function updateOrder(patch: Partial<Pick<OrderDetailData, "status" | "paymentStatus">>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/orders/${order.id}/admin-state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Update failed");
      const payload = await res.json();
      setOrder((prev) => ({ ...prev, ...(payload.data ?? patch) }));
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  const documents = [
    { label: "Customer Design Image", required: true, url: firstOrderImage(order), type: "Design" },
    { label: "Measurement Sheet", required: true, url: null, type: "Measurements" },
    { label: "Invoice", required: true, url: order.shippingDocumentUrl ?? null, type: "Finance" },
    { label: "Payment Proof", required: false, url: order.paymentProofUrl ?? null, type: "Payment" },
    { label: "Pickup ID", required: false, url: order.pickupIdUrl ?? null, type: "Pickup" },
    { label: "Pickup Proof", required: false, url: order.pickupProofUrl ?? null, type: "Pickup" },
    ...(order.shippingDocuments ?? []).map((doc, idx) => ({
      label: doc.label || `Delivery Document ${idx + 1}`,
      required: false,
      url: doc.url,
      type: "Delivery",
    })),
  ];

  const timelineRows = [
    { event: "Order Created", time: order.createdAt, by: "System", status: "Completed", notes: `Order #${order.orderNumber} was created.` },
    { event: "Payment Status", time: order.updatedAt, by: "Payment System", status: prettyLabel(order.paymentStatus), notes: order.paymentReference ?? order.payment_reference ?? "No payment reference recorded." },
    { event: "Order Status", time: order.updatedAt, by: "Admin", status: prettyLabel(order.status), notes: "Production is managed with the simplified main order status." },
    { event: "Delivery Deadline", time: deadline.dueDate, by: "System", status: deadline.label, notes: deadline.note },
    { event: "Fulfillment Status", time: order.updatedAt, by: isPickup ? "Pickup Team" : "Shipping Team", status: prettyLabel(fulfillmentStatus), notes: isPickup ? "Pickup flow selected." : `${order.carrier || "EMS/DHL"} delivery flow selected.` },
    { event: "Order Closed", time: order.status === "delivered" || order.status === "picked_up" ? order.updatedAt : null, by: "System", status: order.status === "delivered" || order.status === "picked_up" ? "Closed" : "Open", notes: "Order closes after pickup or delivery is completed." },
  ];

  return (
    <AdminDetailLayout
      topHeader={
        <AdminDetailHeader
          icon={ShoppingBag}
          iconTheme="bg-blue-50 text-blue-600 border-blue-100"
          category="Order Detail Workspace"
          title={`Order #${order.orderNumber}`}
          subtitle="Manage order summary, main status, fulfillment, documents, and internal team context."
          onRefresh={() => router.refresh()}
          onBack={() => router.push(backUrl)}
          backLabel={backUrl.includes("custom-orders") ? "Back to Custom Orders" : backUrl.includes("catalog-orders") ? "Back to Catalog Orders" : "Back to Orders"}
        />
      }
      profileCard={
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div>
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {orderImage ? <img src={orderImage} alt="Order item preview" className="h-full w-full object-cover" /> : <ShoppingBag className="h-7 w-7 text-blue-500" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Order ID</p>
                  <h2 className="break-words text-2xl font-black tracking-tight text-slate-950">ORDER #{order.orderNumber}</h2>
                </div>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {order.customerName || order.userEmail || "Customer"} - {dateTime(order.createdAt)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {statusPill(order.status)}
                {statusPill(order.paymentStatus, PAYMENT_STYLES)}
                <span className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">{orderKind}</span>
                <span className="inline-flex rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">{isPickup ? "Pickup" : "Mail"} Flow</span>
              </div>
              <p className="mt-4 text-3xl font-black text-slate-950">{money(order.totalUsd ?? order.totalAmount)}</p>
            </div>
          </div>
          <div className="grid w-full gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:w-[420px]">
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Main Status</span>
              {deliveryStage ? (
                <div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3">
                  {statusPill(order.status)}
                </div>
              ) : (
                <select
                  disabled={busy}
                  value={order.status ?? "pending"}
                  onChange={(event) => void updateOrder({ status: event.target.value as MainStatus })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase text-slate-900"
                >
                  {MAIN_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
                </select>
              )}
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Status</span>
              {deliveryStage ? (
                <div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3">
                  {statusPill(order.paymentStatus, PAYMENT_STYLES)}
                </div>
              ) : (
                <select
                  disabled={busy}
                  value={order.paymentStatus ?? "pending"}
                  onChange={(event) => void updateOrder({ paymentStatus: event.target.value as PaymentStatus })}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase text-slate-900"
                >
                  {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
                </select>
              )}
            </div>
            {deliveryStage ? (
              <p className="text-xs font-bold text-slate-500 sm:col-span-2">
                Delivery-stage orders are view only here. Manage EMS or office pickup progress in Shipping & Delivery.
              </p>
            ) : null}
            {canDeleteOrder && (
              <button
                type="button"
                disabled={busy}
                onClick={handleDeleteOrder}
                className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-red-50 text-xs font-black uppercase tracking-wider text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-all sm:col-span-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Order
              </button>
            )}
          </div>
        </div>
      }
      sections={[...sections]}
      activeSection={section}
      onSectionChange={(id) => setSection(id as OrderDetailSection)}
    >
      {section === "summary" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailField label="Order Number" value={order.orderNumber} />
          <DetailField label="Order Type" value={orderKind} />
          <DetailField label="Delivery Method" value={isPickup ? "Pickup" : "Mail"} />
          <DetailField label="Shipping Provider" value={isPickup ? "None - Local Pickup" : order.carrier || "EMS / DHL not assigned"} />
          <DetailField label="Main Status" value={prettyLabel(order.status)} />
          <DetailField label="Fulfillment Status" value={prettyLabel(fulfillmentStatus)} />
          <DetailField label="Payment Status" value={prettyLabel(order.paymentStatus)} />
          <DetailField label="Total Amount" value={money(order.totalUsd ?? order.totalAmount)} />
          <DetailField label="Shipping Cost" value={money(order.shippingCostUsd)} />
          <DetailField label="Created" value={dateTime(order.createdAt)} />
          <DetailField label="Updated" value={dateTime(order.updatedAt)} />
        </div>
      ) : null}

      {section === "items" ? (
        <div className="space-y-5">
          {(order.items ?? []).map((item, index) => {
            const images = itemImages(item);
            return (
              <div key={`${item.id ?? index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {images[0] ? <img src={images[0]} alt={itemName(item, index)} className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Item {index + 1}</p>
                        <h3 className="mt-1 break-words text-lg font-black text-slate-950">{itemName(item, index)}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                        <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">Qty {item.quantity ?? 1}</span>
                        <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">{money(itemPrice(item))}</span>
                        <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">{isGroup ? "Group" : "Individual"}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Images</p>
                      {images.length ? (
                        <div className="flex flex-wrap gap-3">
                          {images.map((image, imageIndex) => (
                            <a
                              key={`${image}-${imageIndex}`}
                              href={image}
                              target="_blank"
                              rel="noreferrer"
                              className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300"
                              title={`Open ${itemName(item, index)} image ${imageIndex + 1}`}
                            >
                              <img src={image} alt={`${itemName(item, index)} image ${imageIndex + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                              <span className="absolute bottom-1 right-1 rounded-md bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-black text-white">
                                {imageIndex + 1}
                              </span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm font-bold text-slate-400">
                          No item images available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {(order.items ?? []).length === 0 ? <DetailField label="Order Items" value="No order items were found." /> : null}
        </div>
      ) : null}

      {section === "discounts" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailField label="Subtotal Before Coupon" value={money(subtotalBeforeCoupon)} />
            <DetailField label="Coupon Code" value={couponCode || "No coupon used"} />
            <DetailField label="Coupon Discount" value={couponDiscount > 0 ? `-${money(couponDiscount)}` : "$0.00"} />
            <DetailField label="Final Order Total" value={money(finalTotal)} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Original Price</th>
                  <th className="px-4 py-3">Charged Price</th>
                  <th className="px-4 py-3">Product Discount</th>
                  <th className="px-4 py-3">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-slate-50">
                {(order.items ?? []).map((item, index) => {
                  const original = itemOriginalPrice(item);
                  const charged = itemUnitPrice(item);
                  const originalNum = Number(original ?? charged ?? 0);
                  const chargedNum = Number(charged ?? 0);
                  const hasItemDiscount = Number.isFinite(originalNum) && Number.isFinite(chargedNum) && originalNum > chargedNum;
                  return (
                    <tr key={`${item.id ?? index}-discount`}>
                      <td className="px-4 py-4 font-black text-slate-950">{itemName(item, index)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-600">
                        {hasItemDiscount ? <span className="line-through">{money(originalNum)}</span> : "Included in item price"}
                      </td>
                      <td className="px-4 py-4 font-black text-emerald-700">{money(charged)}</td>
                      <td className="px-4 py-4">
                        {hasItemDiscount ? (
                          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                            {String(itemDiscountLabel(item) ?? `${Math.round(((originalNum - chargedNum) / originalNum) * 100)}% OFF`)}
                          </span>
                        ) : (
                          <span className="text-sm font-semibold text-slate-400">No visible product discount</span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-600">{item.quantity ?? 1}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm font-semibold text-blue-950">
            Product discounts are item-level sale prices. Coupon discounts are order-level reductions applied after subtotal and before the final payable total.
          </div>
        </div>
      ) : null}

      {section === "customer" ? (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <UserRound className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-950">{order.customerName || "Anonymous Customer"}</h3>
                <p className="text-sm font-semibold text-slate-500">{order.userEmail || "No email recorded"}</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Customer Name" value={order.customerName} />
            <DetailField label="Gender" value={customerGender ?? "Not provided"} />
            <DetailField label="Email" value={order.userEmail} />
            <DetailField label="Phone" value={order.phoneNumber ?? order.phone_number ?? (typeof order.shippingAddress === "object" ? order.shippingAddress?.phone : null)} />
            <DetailField label="Order Placed By" value={order.userEmail} />
            <DetailField label="Delivery Method" value={isPickup ? "Pickup" : "Mail"} />
            <DetailField label={isPickup ? "Pickup Location" : "Delivery Address"} value={isPickup ? order.pickupLocation : addressText(order.shippingAddress)} />
          </div>
        </div>
      ) : null}

      {section === "measurements" ? (
        <div className="space-y-5">
          {isGroup && groupMeasurementGroups.length > 0 ? (
            <div className="space-y-4">
              {groupMeasurementGroups.map((group) => {
                const expanded = expandedMeasurementGroupId === group.id;
                const readyCount = group.people.filter((person) => measurementEntries(person.measurements).length > 0).length;
                return (
                  <div key={group.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setExpandedMeasurementGroupId(expanded ? null : group.id)}
                      className="flex w-full items-center justify-between gap-4 bg-white px-4 py-4 text-left transition hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        {group.productImage ? (
                          <img src={group.productImage} alt="" className="h-16 w-14 rounded-xl object-cover" />
                        ) : (
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                            <Users className="h-6 w-6" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-950">{group.name}</p>
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">Group Measurements</span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {[group.productName || "No outfit selected", group.eventName, `${group.people.length} members`, `${readyCount} ready`].filter(Boolean).join(" - ")}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </span>
                    </button>
                    {expanded ? (
                      <div className="border-t border-slate-200 p-4">
                        <div className="grid gap-3 md:grid-cols-4">
                          <CompactInfoField label="Selection" value={group.productName || "Not selected"} />
                          <CompactInfoField label="Members" value={`${group.people.length}`} />
                          <CompactInfoField label="Ready" value={`${readyCount} / ${group.people.length}`} />
                          <CompactInfoField label="Order Type" value={orderKind} />
                        </div>
                        <div className="mt-4 space-y-3">
                          {group.people.map((person) => {
                            const memberExpanded = expandedMeasurementMemberId === person.id;
                            const entries = measurementEntries(person.measurements);
                            return (
                              <div key={person.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <button
                                  type="button"
                                  onClick={() => setExpandedMeasurementMemberId(memberExpanded ? null : person.id)}
                                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                                >
                                  <div>
                                    <p className="font-bold text-slate-950">{person.name}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                      {[person.relation, measurementAge(person), person.gender, `${entries.length} measurements`].filter(Boolean).join(" - ")}
                                    </p>
                                  </div>
                                  {memberExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                                {memberExpanded ? (
                                  <div className="border-t border-slate-200 p-4">
                                    <OrderMeasurementDisplayCard
                                      compact
                                      row={{
                                        label: person.name,
                                        meta: [person.relation, measurementAge(person), person.gender].filter(Boolean).join(" - "),
                                        values: person.measurements,
                                      }}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : measurementPeople.length > 0 ? (
            <div className="space-y-5">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-black text-slate-950">{isGroup ? "Group Measurement Sheets" : "Measurement Sheet"}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {[orderKind, `${measurementPeople.length} ${measurementPeople.length === 1 ? "person" : "people"}`].join(" - ")}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {measurementPeople.map((person, idx) => {
                    const entries = measurementEntries(person.measurements);
                    const meta = [person.productName, person.relation, measurementAge(person), person.gender ? `Gender: ${person.gender}` : "Gender: Not provided"].filter(Boolean).join(" - ");
                    const active = activeMeasurementPerson?.id === person.id;
                    return (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => setActiveMemberIdx(idx)}
                        className={cn(
                          "grid w-full gap-2 px-4 py-3 text-left text-sm transition md:grid-cols-[1.4fr_1fr_auto] md:items-center",
                          active ? "bg-blue-50" : "bg-white hover:bg-slate-50",
                        )}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">{person.name}</p>
                          <p className="mt-1 truncate text-xs font-semibold text-slate-500">{meta}</p>
                        </div>
                        <p className="text-xs font-bold text-slate-500">{entries.length} measurement values</p>
                        <span className={cn(
                          "inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                          entries.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
                        )}>
                          {entries.length ? "Ready" : "Missing"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {activeMeasurementPerson ? (
                <OrderMeasurementDisplayCard
                  row={{
                    label: activeMeasurementPerson.name,
                    meta: [activeMeasurementPerson.productName, activeMeasurementPerson.relation, measurementAge(activeMeasurementPerson), activeMeasurementPerson.gender].filter(Boolean).join(" - "),
                    values: activeMeasurementPerson.measurements,
                  }}
                />
              ) : null}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Ruler className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-500">No measurements recorded</p>
            </div>
          )}
        </div>
      ) : null}

      {section === "shipping" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DetailField label="Delivery Method" value={isPickup ? "Pickup - Free Local" : "Mail / Courier"} />
            <DetailField label="Shipping Provider" value={isPickup ? "Not required" : order.carrier || "EMS / DHL not selected"} />
            <DetailField label="Fulfillment Status" value={prettyLabel(fulfillmentStatus)} />
            <DetailField label="Recipient" value={isPickup ? order.pickupPersonName || order.customerName : order.customerName} />
            <DetailField label="Phone" value={isPickup ? order.pickupPersonPhone : order.phoneNumber ?? order.phone_number} />
            <DetailField label="Estimated Delivery" value="Not scheduled" />
            <div className="sm:col-span-2 xl:col-span-3">
              <DetailField label={isPickup ? "Pickup Location" : "Delivery Address"} value={isPickup ? order.pickupLocation : addressText(order.shippingAddress)} />
            </div>
          </div>
          <HorizontalSteps steps={isPickup ? PICKUP_STATES : SHIPPING_STATES} current={fulfillmentStatus} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{isPickup ? "Pickup Rule" : "Shipping Rule"}</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {isPickup
                ? "Pickup orders are local and free. Admin manages packing, pickup readiness, customer waiting, and pickup completion."
                : "Before courier pickup, admin controls packing and shipment creation. After pickup, EMS/DHL controls movement and this system mirrors provider tracking."}
            </p>
          </div>
        </div>
      ) : null}

      {section === "timeline" ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Delivery Deadline Progress</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  Day {Math.min(deadline.elapsedDays, DELIVERY_WINDOW_DAYS)} of {DELIVERY_WINDOW_DAYS}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Placed {dateOnly(order.createdAt)} - Expected by {dateOnly(deadline.dueDate)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn("rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-wider", deadlineToneClass(deadline.tone))}>
                  {deadline.label}
                </span>
                <span className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                  {deadline.remainingDays < 0 ? `${Math.abs(deadline.remainingDays)} days overdue` : `${deadline.remainingDays} days remaining`}
                </span>
              </div>
            </div>
            <div className="mt-5">
              <div className="h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    deadline.tone === "green" && "bg-emerald-500",
                    deadline.tone === "blue" && "bg-blue-500",
                    deadline.tone === "amber" && "bg-amber-500",
                    deadline.tone === "rose" && "bg-rose-500",
                  )}
                  style={{ width: `${deadline.progress}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                <span>Order placed</span>
                <span>{deadline.progress}% used</span>
                <span>Delivery due</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600">
                <tr>
                  <th className="sticky top-0 z-10 min-w-[160px] bg-slate-100 px-4 py-3">Event</th>
                  <th className="sticky top-0 z-10 min-w-[170px] bg-slate-100 px-4 py-3">Time</th>
                  <th className="sticky top-0 z-10 min-w-[130px] bg-slate-100 px-4 py-3">Updated By</th>
                  <th className="sticky top-0 z-10 min-w-[140px] bg-slate-100 px-4 py-3">Status</th>
                  <th className="sticky top-0 z-10 min-w-[280px] bg-slate-100 px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-slate-50">
                {timelineRows.map((row) => (
                  <tr key={row.event} className="align-top">
                    <td className="whitespace-normal px-4 py-4 font-black leading-6 text-slate-950">{row.event}</td>
                    <td className="whitespace-normal px-4 py-4 font-semibold leading-6 text-slate-600">{row.time ? dateTime(row.time) : "Pending"}</td>
                    <td className="whitespace-normal px-4 py-4 font-semibold leading-6 text-slate-600">{row.by}</td>
                    <td className="px-4 py-4 align-top">
                      {row.event === "Delivery Deadline" ? (
                        <span className={cn("inline-flex rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-wider", deadlineToneClass(deadline.tone))}>
                          {deadline.label}
                        </span>
                      ) : (
                        statusPill(row.status.toLowerCase().replaceAll(" ", "_"))
                      )}
                    </td>
                    <td className="whitespace-normal break-words px-4 py-4 font-medium leading-6 text-slate-600">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      ) : null}

      {section === "attachments" ? (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={`${doc.label}-${doc.url ?? "missing"}`} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{doc.label}</p>
                  <div className="mt-1 flex gap-2 text-[10px] font-black uppercase tracking-wide">
                    <span className={cn("rounded-full px-2 py-0.5", doc.required ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600")}>{doc.required ? "Required" : "Optional"}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-slate-500 ring-1 ring-slate-200">{doc.type}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {doc.url ? (
                  <>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 hover:bg-slate-100"><Eye className="h-4 w-4" /> Preview</a>
                    <a href={doc.url} download className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800"><Download className="h-4 w-4" /> Download</a>
                  </>
                ) : (
                  <span className="inline-flex h-10 items-center rounded-xl border border-dashed border-slate-300 px-4 text-sm font-bold text-slate-400">Not uploaded</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {section === "notes" ? (
        <div className="space-y-5">
          {notesError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{notesError}</div> : null}
          {notesBusy === "load" ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">Loading notes...</div> : null}
          <div className="space-y-4">
            {NOTE_CONFIG.map((config) => {
              const savedNotes = notes.filter((note) => noteType(note) === config.type);
              const customerRemarkNote: OrderNote | null = config.type === "customer" && order.remarks
                ? {
                    id: "checkout-remark",
                    noteType: "customer",
                    note: order.remarks,
                    createdByName: order.customerName || "Customer",
                    createdByRole: "Customer",
                    createdAt: order.createdAt,
                  }
                : null;
              const laneNotes = customerRemarkNote ? [customerRemarkNote, ...savedNotes] : savedNotes;
              return (
                <NoteLane
                  key={config.type}
                  config={config}
                  notes={laneNotes}
                  draft={noteDrafts[config.type] ?? ""}
                  onDraftChange={(value) => setNoteDrafts((current) => ({ ...current, [config.type]: value }))}
                  onAdd={() => void addNote(config.type)}
                  canAdd={canAddNote[config.type]}
                  expanded={expandedNoteType === config.type}
                  onToggle={() => setExpandedNoteType(expandedNoteType === config.type ? null : config.type)}
                  busyKey={notesBusy}
                  currentUserId={sessionUser?.id}
                  isManager={isNoteManager}
                  editingNoteId={editingNoteId}
                  editingNoteText={editingNoteText}
                  onStartEdit={(note) => {
                    setEditingNoteId(note.id);
                    setEditingNoteText(note.note);
                  }}
                  onCancelEdit={() => {
                    setEditingNoteId(null);
                    setEditingNoteText("");
                  }}
                  onEditingTextChange={setEditingNoteText}
                  onSaveEdit={(noteId) => void saveEditedNote(noteId)}
                  onDelete={(noteId) => void deleteNote(noteId)}
                />
              );
            })}
          </div>
        </div>
      ) : null}
    </AdminDetailLayout>
  );
}

function CompactInfoField({ label, value }: { label: string; value: unknown }) {
  const display = value == null || String(value).trim() === "" ? "Not provided" : String(value);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{display}</p>
    </div>
  );
}

function MeasurementInputBox({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-900">{label}</p>
      <div className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-bold text-slate-950 shadow-sm">
        {String(value)}
      </div>
    </div>
  );
}

function OrderMeasurementDisplayCard({ row, compact = false }: { row: MeasurementDisplayRow; compact?: boolean }) {
  const groups = measurementDisplayGroups(row.values);
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-slate-50", compact ? "p-4" : "p-5")}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-950">{row.label}</h3>
          {row.meta ? <p className="mt-1 text-xs font-semibold text-slate-500">{row.meta}</p> : null}
        </div>
        {row.updatedAt ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">Updated {dateTime(row.updatedAt)}</span> : null}
      </div>
      {groups.length ? (
        <div className="mt-4 space-y-4">
          {groups.map((group) => (
            <div key={group.title}>
              <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">{group.title}</div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.fields.map(([key, value]) => (
                  <MeasurementInputBox key={`${group.title}-${key}`} label={key} value={value} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-slate-500">No measurement values recorded.</p>
      )}
    </div>
  );
}

function HorizontalSteps<T extends readonly string[]>({ steps, current, onSelect }: { steps: T; current: string; onSelect?: (step: T[number]) => void }) {
  const currentIdx = stageIndex(steps, current);
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex min-w-max items-start gap-3">
        {steps.map((step, idx) => {
          const done = current && idx <= currentIdx;
          const active = current === step;
          return (
            <button
              key={step}
              type="button"
              disabled={!onSelect}
              onClick={() => onSelect?.(step)}
              className="group flex w-36 flex-col items-center gap-2 text-center disabled:cursor-default"
            >
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black transition", done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-400", active && "ring-4 ring-emerald-100")}>
                {done ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
              </span>
              <span className={cn("text-[10px] font-black uppercase leading-tight tracking-wide", done ? "text-emerald-700" : "text-slate-400")}>{prettyLabel(step)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NoteLane({
  config,
  notes,
  draft,
  onDraftChange,
  onAdd,
  canAdd,
  expanded,
  onToggle,
  busyKey,
  currentUserId,
  isManager,
  editingNoteId,
  editingNoteText,
  onStartEdit,
  onCancelEdit,
  onEditingTextChange,
  onSaveEdit,
  onDelete,
}: {
  config: (typeof NOTE_CONFIG)[number];
  notes: OrderNote[];
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  canAdd: boolean;
  expanded: boolean;
  onToggle: () => void;
  busyKey: string | null;
  currentUserId?: string | null;
  isManager: boolean;
  editingNoteId: string | null;
  editingNoteText: string;
  onStartEdit: (note: OrderNote) => void;
  onCancelEdit: () => void;
  onEditingTextChange: (value: string) => void;
  onSaveEdit: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}) {
  const validation = noteValidation(draft);
  const trimmedLength = draft.trim().length;
  const canSubmit = canAdd && !validation && trimmedLength >= NOTE_MIN_LENGTH && trimmedLength <= NOTE_MAX_LENGTH && !busyKey;
  const editable = config.type !== "customer";
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-left hover:bg-slate-50"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-slate-950">{config.title}</h3>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              {notes.length} note{notes.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-1 break-words text-xs font-semibold text-slate-500">{config.helper}</p>
        </div>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-slate-200 p-5">
          <div className="space-y-3">
            {notes.length ? notes.map((note) => (
              <NoteTimelineCard
                key={note.id}
                note={note}
                readonly={note.id === "checkout-remark"}
                currentUserId={currentUserId}
                isManager={isManager}
                busyKey={busyKey}
                editing={editingNoteId === note.id}
                editingText={editingNoteText}
                onStartEdit={() => onStartEdit(note)}
                onCancelEdit={onCancelEdit}
                onEditingTextChange={onEditingTextChange}
                onSaveEdit={() => onSaveEdit(note.id)}
                onDelete={() => onDelete(note.id)}
              />
            )) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500">
                No {config.title.toLowerCase()} yet.
              </div>
            )}
          </div>

          {editable ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                maxLength={NOTE_MAX_LENGTH + 100}
                rows={4}
                placeholder={config.placeholder}
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={cn("text-xs font-bold", validation ? "text-rose-600" : "text-slate-500")}>
                    {validation ?? "Editable for 15 minutes after posting."}
                  </p>
                  {!canAdd ? <p className="mt-1 text-xs font-bold text-amber-700">You do not have permission to add this note type.</p> : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-black", trimmedLength > NOTE_MAX_LENGTH ? "text-rose-600" : "text-slate-500")}>{trimmedLength} / {NOTE_MAX_LENGTH}</span>
                  <button
                    type="button"
                    onClick={onAdd}
                    disabled={!canSubmit}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-800 px-4 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyKey === `add-${config.type}` ? "Saving..." : config.button.replace(/^Add\s+/i, "")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs font-bold text-slate-500">{config.placeholder}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function NoteTimelineCard({
  note,
  readonly,
  currentUserId,
  isManager,
  busyKey,
  editing,
  editingText,
  onStartEdit,
  onCancelEdit,
  onEditingTextChange,
  onSaveEdit,
  onDelete,
}: {
  note: OrderNote;
  readonly?: boolean;
  currentUserId?: string | null;
  isManager: boolean;
  busyKey: string | null;
  editing: boolean;
  editingText: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditingTextChange: (value: string) => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}) {
  const canEdit = !readonly && noteCanEdit(note, currentUserId, isManager);
  const canDelete = !readonly && isManager;
  const validation = noteValidation(editingText);
  const length = editingText.trim().length;
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-slate-950">{noteAuthorName(note)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {[prettyLabel(noteAuthorRole(note)), noteCreatedAt(note) ? dateTime(noteCreatedAt(note)) : null].filter(Boolean).join(" - ")}
          </p>
          {noteEditedAt(note) ? <p className="mt-1 text-xs font-bold text-blue-700">Edited {dateTime(noteEditedAt(note))}</p> : null}
        </div>
        {(canEdit || canDelete) && !editing ? (
          <div className="flex flex-wrap gap-2">
            {canEdit ? <button type="button" onClick={onStartEdit} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">Edit</button> : null}
            {canDelete ? <button type="button" onClick={onDelete} disabled={busyKey === `delete-${note.id}`} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50">Delete</button> : null}
          </div>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-3">
          <textarea
            value={editingText}
            onChange={(event) => onEditingTextChange(event.target.value)}
            maxLength={NOTE_MAX_LENGTH + 100}
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className={cn("text-xs font-bold", validation ? "text-rose-600" : "text-slate-500")}>{validation ?? "Editable for 15 minutes after posting."}</p>
            <div className="flex items-center gap-3">
              <span className={cn("text-xs font-black", length > NOTE_MAX_LENGTH ? "text-rose-600" : "text-slate-500")}>{length} / {NOTE_MAX_LENGTH}</span>
              <button type="button" onClick={onCancelEdit} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">Cancel</button>
              <button
                type="button"
                onClick={onSaveEdit}
                disabled={Boolean(validation) || length < NOTE_MIN_LENGTH || length > NOTE_MAX_LENGTH || busyKey === `edit-${note.id}`}
                className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busyKey === `edit-${note.id}` ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-slate-700">{note.note}</p>
          {!readonly && !canEdit && noteAuthorId(note) === currentUserId ? (
            <p className="mt-3 text-xs font-bold text-slate-500">Edit time expired. Add a correction note if needed.</p>
          ) : null}
        </>
      )}
    </article>
  );
}
