"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileText,
  ImageIcon,
  Ruler,
  Scissors,
  ShoppingBag,
  StickyNote,
  Truck,
  UserRound,
  BadgePercent,
} from "lucide-react";
import { AdminDetailLayout, AdminDetailHeader } from "@/components/admin/admin-detail-layout";
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
  measurements?: Record<string, string | number | null> | null;
  measurementDetails?: Record<string, string | number | null> | null;
  measurement_details?: Record<string, string | number | null> | null;
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

export type OrderDetailData = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
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
  members?: any[] | null;
  remarks?: string | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

const MAIN_STATUSES = ["pending", "processing", "tailoring", "quality_check", "fulfilled", "delivered", "cancelled"] as const;
const PAYMENT_STATUSES = ["pending", "awaiting_verification", "paid", "failed", "refunded", "unpaid"] as const;

const PRODUCTION_STEPS = [
  "measurements_confirmed",
  "fabric_selected",
  "fabric_prepared",
  "cutting_started",
  "cutting_completed",
  "sewing_started",
  "sewing_completed",
  "embroidery_design_work",
  "finishing_ironing",
  "quality_inspection",
  "completed",
] as const;

const PICKUP_STATES = [
  "pending",
  "packed",
  "ready_for_pickup",
  "arrived_at_pickup_location",
  "waiting_customer",
  "picked_up",
  "delivered",
] as const;

const SHIPPING_STATES = ["pending", "packed", "shipping_assigned", "shipped", "in_transit", "out_for_delivery", "delivered"] as const;

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
  return item.measurements ?? item.measurementDetails ?? item.measurement_details ?? {};
}

function firstOrderImage(order: OrderDetailData) {
  for (const item of order.items ?? []) {
    const image = itemImage(item);
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

function mapProductionToMain(step: string | null, fulfillmentType?: string | null) {
  if (!step) return "pending";
  if (["measurements_confirmed", "fabric_selected", "fabric_prepared"].includes(step)) return "processing";
  if (["cutting_started", "cutting_completed", "sewing_started", "sewing_completed", "embroidery_design_work", "finishing_ironing"].includes(step)) return "tailoring";
  if (step === "quality_inspection") return "quality_check";
  if (step === "completed") return fulfillmentType === "pickup" ? "ready_for_pickup" : "fulfilled";
  return "pending";
}

function deriveProductionStep(status?: string | null) {
  if (status === "processing") return "measurements_confirmed";
  if (status === "tailoring") return "cutting_started";
  if (status === "quality_check") return "quality_inspection";
  if (status === "fulfilled" || status === "ready_for_pickup" || status === "shipped" || status === "delivered") return "completed";
  return null;
}

function statusPill(value?: string | null, styles = STATUS_STYLES) {
  const status = value ?? "pending";
  return (
    <span className={cn("inline-flex rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-wider", styles[status] ?? styles.pending)}>
      {prettyLabel(status)}
    </span>
  );
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
  const [order, setOrder] = useState<OrderDetailData>(initialOrder);
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<"summary" | "items" | "discounts" | "customer" | "measurements" | "production" | "shipping" | "timeline" | "attachments" | "notes">("summary");
  const [activeMemberIdx, setActiveMemberIdx] = useState(0);
  const [productionStep, setProductionStep] = useState<string | null>(() => deriveProductionStep(initialOrder.status));

  const isGroup = order.orderMode === "group" || order.orderType === "group_order" || Boolean(order.members?.length);
  const orderKind = `${isGroup ? "Group" : "Individual"} ${isCustomOrder(order) ? "Custom" : "Catalog"} Order`;
  const orderImage = firstOrderImage(order);
  const isPickup = order.fulfillmentType === "pickup" || order.carrier === "pickup";
  const fulfillmentStatus = order.status === "delivered" || order.status === "picked_up"
    ? "delivered"
    : isPickup
      ? order.status === "ready_for_pickup" ? "ready_for_pickup" : "pending"
      : order.status === "shipped" ? "shipped" : order.status === "fulfilled" ? "shipping_assigned" : "pending";
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

  const memberMeasurements = (order.members ?? []).map((member: any, idx: number) => ({
    name: member.name ?? member.customerName ?? `Member ${idx + 1}`,
    measurements: member.measurements ?? member.measurementSnapshot ?? {},
  }));

  const itemMeasurementGroups = (order.items ?? [])
    .map((item, idx) => ({ title: itemName(item, idx), measurements: itemMeasurements(item) }))
    .filter((group) => Object.entries(group.measurements ?? {}).some(([, value]) => value != null && String(value).trim() !== ""));

  const sections = [
    { id: "summary", label: "Order Summary", hint: "Core status and totals", icon: ShoppingBag },
    { id: "items", label: "Order Items", hint: "Products and design previews", icon: ImageIcon },
    { id: "discounts", label: "Promotions", hint: "Sale pricing and coupon impact", icon: BadgePercent },
    { id: "customer", label: "Customer Details", hint: "Contact and address", icon: UserRound },
    { id: "measurements", label: "Measurements", hint: "Individual or group sizing", icon: Ruler },
    { id: "production", label: "Production Tracking", hint: "Inner workflow control", icon: Scissors },
    { id: "shipping", label: "Shipping & Delivery", hint: "Pickup or mail flow", icon: Truck },
    { id: "timeline", label: "Order Timeline", hint: "Lifecycle history", icon: ClipboardList },
    { id: "attachments", label: "Document Attachments", hint: "Required and optional files", icon: FileText },
    { id: "notes", label: "Internal Notes", hint: "Team and customer notes", icon: StickyNote },
  ] as const;

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

  async function changeProductionStep(step: string) {
    setProductionStep(step);
    const nextMain = mapProductionToMain(step, order.fulfillmentType);
    await updateOrder({ status: nextMain as any });
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
    { event: "Production Status", time: order.updatedAt, by: "Admin", status: productionStep ? prettyLabel(productionStep) : "Not started", notes: "Inner production status is managed by admin in Production Tracking." },
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
          subtitle="Manage order summary, production, fulfillment, documents, and internal team context."
          onRefresh={() => router.refresh()}
          onBack={() => router.push(backUrl)}
          backLabel={backUrl.includes("custom-orders") ? "Back to Custom Orders" : backUrl.includes("catalog-orders") ? "Back to Catalog Orders" : "Back to Orders"}
        />
      }
      profileCard={
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {orderImage ? <img src={orderImage} alt="Order preview" className="h-full w-full object-cover" /> : <ShoppingBag className="h-14 w-14 text-blue-500" />}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">ORDER #{order.orderNumber}</h2>
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
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Main Status</span>
              <select
                disabled={busy}
                value={order.status ?? "pending"}
                onChange={(event) => void updateOrder({ status: event.target.value as any })}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase text-slate-900"
              >
                {MAIN_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment Status</span>
              <select
                disabled={busy}
                value={order.paymentStatus ?? "pending"}
                onChange={(event) => void updateOrder({ paymentStatus: event.target.value as any })}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black uppercase text-slate-900"
              >
                {PAYMENT_STATUSES.map((status) => <option key={status} value={status}>{prettyLabel(status)}</option>)}
              </select>
            </label>
          </div>
        </div>
      }
      sections={[...sections]}
      activeSection={section}
      onSectionChange={(id) => setSection(id as any)}
    >
      {section === "summary" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailField label="Order Number" value={order.orderNumber} />
          <DetailField label="Order Type" value={orderKind} />
          <DetailField label="Delivery Method" value={isPickup ? "Pickup" : "Mail"} />
          <DetailField label="Shipping Provider" value={isPickup ? "None - Local Pickup" : order.carrier || "EMS / DHL not assigned"} />
          <DetailField label="Main Status" value={prettyLabel(order.status)} />
          <DetailField label="Inner Production Status" value={productionStep ? prettyLabel(productionStep) : "Not started"} />
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(order.items ?? []).slice(0, 4).map((item, index) => (
              <div key={`${item.id ?? index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="aspect-square bg-white">
                  {itemImage(item) ? <img src={itemImage(item)!} alt={itemName(item, index)} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><ImageIcon className="h-12 w-12" /></div>}
                </div>
                <div className="space-y-2 p-4">
                  <p className="line-clamp-2 text-sm font-black text-slate-950">{itemName(item, index)}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">Qty {item.quantity ?? 1}</span>
                    <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">{money(itemPrice(item))}</span>
                    <span className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">{isGroup ? "Group" : "Individual"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          {isGroup && memberMeasurements.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {memberMeasurements.map((member, idx) => (
                  <button
                    key={`${member.name}-${idx}`}
                    type="button"
                    onClick={() => setActiveMemberIdx(idx)}
                    className={cn("rounded-xl border px-4 py-2 text-sm font-black", activeMemberIdx === idx ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700")}
                  >
                    {member.name}
                  </button>
                ))}
              </div>
              <MeasurementGrid title={memberMeasurements[activeMemberIdx]?.name ?? "Member"} measurements={memberMeasurements[activeMemberIdx]?.measurements ?? {}} />
            </>
          ) : itemMeasurementGroups.length > 0 ? (
            <div className="space-y-4">
              {itemMeasurementGroups.map((group) => <MeasurementGrid key={group.title} title={group.title} measurements={group.measurements ?? {}} />)}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Ruler className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-500">No measurements recorded</p>
            </div>
          )}
        </div>
      ) : null}

      {section === "production" ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Production Tracking</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">{productionStep ? prettyLabel(productionStep) : "No work started"}</h3>
              </div>
              <select
                value={productionStep ?? ""}
                onChange={(event) => void changeProductionStep(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-900"
              >
                <option value="">No work started</option>
                {PRODUCTION_STEPS.map((step) => <option key={step} value={step}>{prettyLabel(step)}</option>)}
              </select>
            </div>
          </div>
          <HorizontalSteps steps={PRODUCTION_STEPS} current={productionStep ?? ""} onSelect={(step) => void changeProductionStep(step)} />
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
            Main status updates automatically from the selected inner production step. Customers only see the simplified main status.
          </div>
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
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Updated By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-slate-50">
              {timelineRows.map((row) => (
                <tr key={row.event}>
                  <td className="px-4 py-4 font-black text-slate-950">{row.event}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{row.time ? dateTime(row.time) : "Pending"}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{row.by}</td>
                  <td className="px-4 py-4">{statusPill(row.status.toLowerCase().replaceAll(" ", "_"))}</td>
                  <td className="px-4 py-4 font-medium text-slate-600">{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <div className="grid gap-4 md:grid-cols-2">
          <NoteCard title="Customer Note" author={order.customerName || "Customer"} value={order.remarks || "No customer note was submitted with this order."} />
          <NoteCard title="Admin Note" author="Admin Team" value="No internal admin note recorded yet." />
          <NoteCard title="Tailor Note" author="Tailoring Team" value="No tailoring note recorded yet." />
          <NoteCard title="Delivery Note" author={isPickup ? "Pickup Team" : "Delivery Team"} value="No delivery note recorded yet." />
        </div>
      ) : null}
    </AdminDetailLayout>
  );
}

function MeasurementGrid({ title, measurements }: { title: string; measurements: Record<string, unknown> }) {
  const entries = Object.entries(measurements ?? {}).filter(([, value]) => value != null && String(value).trim() !== "");
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-slate-100 px-5 py-3">
        <p className="text-sm font-black uppercase tracking-widest text-slate-700">{title}</p>
      </div>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {entries.map(([key, value]) => (
          <DetailField key={key} label={prettyLabel(key)} value={String(value)} />
        ))}
      </div>
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

function NoteCard({ title, author, value }: { title: string; author: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-950">{title}</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">{author}</span>
      </div>
      <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-600">{value}</p>
    </div>
  );
}
