"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, FileText, MapPin, Package, Send, Truck, UserRound } from "lucide-react";
import { AdminDetailHeader, AdminDetailLayout } from "@/components/admin/admin-detail-layout";
import { dashboardConfirm, dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";
import { cn } from "@/lib/utils";

type Order = Record<string, unknown> & {
  id?: string;
  orderNumber?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  status?: string | null;
  totalUsd?: string | number | null;
  totalAmount?: string | number | null;
  shippingCostUsd?: string | number | null;
  shipping_cost_usd?: string | number | null;
  fulfillmentType?: string | null;
  fulfillment_type?: string | null;
  carrier?: string | null;
  deliveryStatus?: string | null;
  delivery_status?: string | null;
  deliveryStatusChangedBy?: string | null;
  delivery_status_changed_by?: string | null;
  deliveryStatusChangedAt?: string | number | Date | null;
  delivery_status_changed_at?: string | number | Date | null;
  deliveryTimeline?: Array<Record<string, unknown>> | null;
  delivery_timeline?: Array<Record<string, unknown>> | null;
  trackingNumber?: string | null;
  tracking_number?: string | null;
  pickupLocation?: string | null;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
  pickupIdUrl?: string | null;
  pickupProofUrl?: string | null;
  pickupSignedDocUrl?: string | null;
  pickup_signed_doc_url?: string | null;
  shippingDocumentUrl?: string | null;
  shipping_document_url?: string | null;
  phoneNumber?: string | null;
  phone_number?: string | null;
  shippingAddress?: Record<string, unknown> | string | null;
  shipping_address?: Record<string, unknown> | string | null;
  updatedAt?: string | number | Date | null;
  items?: Array<Record<string, unknown>> | null;
  workstreams?: Array<Record<string, unknown>> | null;
  shippingDocuments?: Array<{ url: string; label: string; uploadedAt?: string }> | null;
  shipping_documents?: Array<{ url: string; label: string; uploadedAt?: string }> | null;
};

type OrderNote = {
  id?: string;
  noteType?: string;
  note_type?: string;
  note?: string;
  userEmail?: string | null;
  user_email?: string | null;
  createdAt?: string | number | Date | null;
  created_at?: string | number | Date | null;
};

const MAIL_STATES = ["not_started", "packing", "packed", "assigned_to_ems", "handed_to_ems", "in_transit", "at_hub", "out_for_delivery", "delivered", "failed_attempt", "returned"] as const;
const PICKUP_STATES = ["not_started", "packing", "packed", "moved_to_pickup_desk", "ready_for_pickup", "customer_notified", "waiting_customer", "picked_up", "delivered", "cancelled_pickup"] as const;

function norm(value: unknown) {
  return String(value ?? "").toLowerCase().trim();
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function money(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function dateTime(value: unknown) {
  if (!value) return "Pending";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function isPickup(order: Order) {
  return norm(order.fulfillmentType ?? order.fulfillment_type ?? order.carrier) === "pickup";
}

function addressText(order: Order) {
  const address = order.shippingAddress ?? order.shipping_address;
  if (typeof address === "string") return address;
  if (address && typeof address === "object") {
    return [address.street, address.house, address.subcity, address.city, address.state, address.postalCode ?? address.zip, address.country]
      .filter(Boolean)
      .join(", ") || "Address pending";
  }
  return "Address pending";
}

function firstImage(order: Order) {
  for (const item of order.items ?? []) {
    const image = item.imageUrl ?? item.image_url ?? item.productImage ?? item.product_image ?? item.frontImageUrl ?? item.front_image_url;
    if (typeof image === "string" && image.trim()) return image;
  }
  return null;
}

function derivedFulfillmentStatus(order: Order) {
  const explicit = norm(order.deliveryStatus ?? order.delivery_status ?? order.shippingStatus ?? order.shipping_status ?? order.pickupStatus ?? order.pickup_status);
  if (explicit) return explicit;
  const status = norm(order.status);
  if (status === "delivered" || status === "picked_up") return "delivered";
  if (status === "ready_for_pickup") return "ready_for_pickup";
  if (status === "shipped") return "shipped";
  if (status === "fulfilled") return isPickup(order) ? "packed" : "assigned_to_ems";
  return "not_started";
}

function mainStatusForDelivery(deliveryStatus: string, pickup: boolean) {
  if (pickup) {
    if (deliveryStatus === "ready_for_pickup") return "ready_for_pickup";
    if (deliveryStatus === "picked_up" || deliveryStatus === "delivered") return "delivered";
    return undefined;
  }
  if (deliveryStatus === "assigned_to_ems") return "fulfilled";
  if (["handed_to_ems", "in_transit", "at_hub", "out_for_delivery"].includes(deliveryStatus)) return "shipped";
  if (deliveryStatus === "delivered") return "delivered";
  return undefined;
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950">{String(value ?? "").trim() || "Not provided"}</p>
    </div>
  );
}

export function AdminShippingDeliveryDetailWorkspace({
  initialOrder,
  scope,
  canEdit,
  canViewDocuments,
  canViewNotes,
  canAddDeliveryNote,
}: {
  initialOrder: Order;
  scope?: "catalog" | "custom";
  canEdit: boolean;
  canViewDocuments: boolean;
  canViewNotes: boolean;
  canAddDeliveryNote: boolean;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const pickup = isPickup(order);
  const activeWorkstream = scope ? (order.workstreams ?? []).find((row) => row.type === scope) : null;
  const deliveryRecord = activeWorkstream ?? order;
  const [activeSection, setActiveSection] = useState("summary");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState(String(order.carrier ?? "Ethiopian Mail Service"));
  const [packageWeight, setPackageWeight] = useState("1");
  const [fulfillmentStatus, setFulfillmentStatus] = useState(derivedFulfillmentStatus(deliveryRecord as Order));
  const [trackingNumber, setTrackingNumber] = useState(String((deliveryRecord as Order).trackingNumber ?? (deliveryRecord as Order).tracking_number ?? (deliveryRecord as Record<string, unknown>).deliveryTrackingNumber ?? ""));
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState<OrderNote[]>([]);
  const [error, setError] = useState("");
  const image = firstImage(order);

  useEffect(() => {
    const orderId = String(order.id ?? "");
    if (!orderId) return;
    window.dispatchEvent(new CustomEvent("admin-shipping-delivery-viewed", { detail: orderId }));
    fetch(`/api/backend/orders/admin/${orderId}`).catch((error) => {
      console.error("Could not resolve shipping delivery notification:", error);
    });
  }, [order.id]);

  useEffect(() => {
    if (!canViewNotes) return;
    const orderId = String(order.id ?? "");
    if (!orderId) return;
    fetch(`/api/backend/orders/${orderId}/notes`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const rows = Array.isArray(json?.data) ? json.data : [];
        setDeliveryNotes(rows.filter((note: OrderNote) => norm(note.noteType ?? note.note_type) === "delivery"));
      })
      .catch((error) => console.error("Could not load delivery notes:", error));
  }, [canViewNotes, order.id]);

  async function createDeliveryNote(note: string) {
    if (!canAddDeliveryNote) return;
    const trimmed = note.trim();
    if (trimmed.length < 3) return;
    const res = await fetch(`/api/backend/orders/${order.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteType: "delivery", note: trimmed }),
    });
    if (!res.ok) return;
    const json = await res.json().catch(() => null);
    if (json?.data) setDeliveryNotes((current) => [json.data, ...current]);
  }

  async function updateDeliveryStatus(next: string, note?: string) {
    if (!canEdit) return;
    setBusy(true);
    setError("");
    try {
      const nextMainStatus = mainStatusForDelivery(next, pickup);
      const endpoint = scope
        ? `/api/backend/orders/${order.id}/workstreams/${scope}`
        : `/api/backend/orders/${order.id}/admin-state`;
      const body = scope
        ? {
            deliveryStatus: next,
            deliveryCarrier: pickup ? "pickup" : provider,
            deliveryTrackingNumber: trackingNumber.trim() || undefined,
            deliveryNote: note ?? (deliveryNote.trim() || undefined),
          }
        : {
            status: nextMainStatus,
            carrier: pickup ? "pickup" : provider,
            deliveryStatus: next,
            trackingNumber: trackingNumber.trim() || undefined,
            deliveryNote: note ?? (deliveryNote.trim() || undefined),
          };
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || payload?.message || "Delivery update failed");
      }
      const json = await res.json();
      const noteToSave = note ?? deliveryNote.trim();
      await createDeliveryNote(noteToSave || `${titleCase(next)} updated for ${pickup ? "store pickup" : "EMS delivery"}.`);
      if (scope && json.data?.workstream) {
        setOrder((current) => ({ ...current, workstreams: (current.workstreams ?? []).map((row) => row.type === scope ? { ...row, ...json.data.workstream } : row) }));
      } else {
        setOrder((current) => ({ ...current, ...(json.data ?? { deliveryStatus: next, status: nextMainStatus ?? current.status }) }));
      }
      setFulfillmentStatus(next);
      setDeliveryNote("");
      await dashboardSuccess("Delivery Updated", `${titleCase(next)} saved successfully.`);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Delivery update failed";
      setError(message);
      await dashboardError("Delivery Update Failed", message);
    } finally {
      setBusy(false);
    }
  }

  async function changeFulfillmentStatus(next: string, actionLabel = titleCase(next)) {
    if (!canEdit) return;
    const confirmed = await dashboardConfirm({
      title: actionLabel,
      text: `This will update fulfillment status to ${titleCase(next)} and add a delivery note to this order.`,
      confirmButtonText: "Yes, update",
      cancelButtonText: "No, cancel",
      tone: next === "delivered" || next === "picked_up" ? "success" : "primary",
      icon: "warning",
    });
    if (!confirmed) return;
    await updateDeliveryStatus(next);
  }

  async function sendToProvider() {
    if (!canEdit) return;
    const confirmed = await dashboardConfirm({
      title: "Request EMS",
      text: `This will assign the order to ${provider} and save an EMS delivery note.`,
      confirmButtonText: "Yes, request EMS",
      cancelButtonText: "No, cancel",
      tone: "primary",
      icon: "warning",
    });
    if (!confirmed) return;
    await updateDeliveryStatus("assigned_to_ems", `EMS request created with ${provider}.`);
  }

  const sections = [
    { id: "summary", label: "Fulfillment Summary", icon: Package },
    { id: "recipient", label: pickup ? "Pickup Details" : "Recipient Details", icon: pickup ? MapPin : UserRound },
    { id: "assignment", label: pickup ? "Pickup Actions" : "Provider Assignment", icon: Send },
    { id: "progress", label: "Fulfillment Progress", icon: Truck },
    ...(canViewDocuments ? [{ id: "documents", label: "Documents", icon: FileText }] : []),
    { id: "timeline", label: "Fulfillment Timeline", icon: ClipboardList },
  ];

  const shippingDocuments = (order.shippingDocuments ?? order.shipping_documents ?? []) as Array<{ url: string; label: string; uploadedAt?: string }>;
  const uploadedByLabel = (label: string) => shippingDocuments.find((doc) => doc.label?.toLowerCase() === label.toLowerCase());
  const documents = pickup
    ? [
        { label: "Pickup QR / Order ID", url: order.pickupIdUrl },
        { label: "Pickup Proof", url: order.pickupProofUrl ?? order.pickupSignedDocUrl ?? order.pickup_signed_doc_url },
        { label: "Package Photo", url: uploadedByLabel("Package Photo")?.url },
        { label: "Delivery Proof", url: uploadedByLabel("Delivery Proof")?.url },
      ]
    : [
        { label: "Shipping Label", url: uploadedByLabel("Shipping Label")?.url ?? order.shippingDocumentUrl ?? order.shipping_document_url },
        { label: "Courier Receipt", url: uploadedByLabel("Courier Receipt")?.url },
        { label: "Package Photo", url: uploadedByLabel("Package Photo")?.url },
        { label: "Delivery Proof", url: uploadedByLabel("Delivery Proof")?.url },
      ];

  const timeline = [
    ...((Array.isArray(order.deliveryTimeline ?? order.delivery_timeline) ? order.deliveryTimeline ?? order.delivery_timeline : []) as Array<Record<string, unknown>>).map((row, index) => ({
      event: index === 0 ? "Delivery Started" : "Delivery Updated",
      status: titleCase(String(row.status ?? "not_started")),
      by: String(row.changedBy ?? "Admin"),
      time: row.changedAt,
      note: row.note,
    })),
    ...((order.deliveryTimeline ?? order.delivery_timeline)?.length ? [] : [
      { event: "Delivery Not Started", status: titleCase(fulfillmentStatus), by: "System", time: order.updatedAt, note: pickup ? "Office pickup flow selected." : "EMS delivery flow selected." },
    ]),
  ];

  return (
    <AdminDetailLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      sections={sections}
      topHeader={
        <AdminDetailHeader
          icon={Truck}
          iconTheme="bg-orange-50 text-orange-600 border-orange-100"
          category="Shipping & Delivery"
          title={`Fulfillment #${order.orderNumber ?? String(order.id).slice(0, 8)}`}
          subtitle={canEdit ? "Manage packing, provider assignment, store pickup, and final delivery state." : "View packing, provider assignment, store pickup, and delivery progress."}
          onRefresh={() => router.refresh()}
          onBack={() => router.push("/admin/orders/shipping-delivery")}
          backLabel="Back to Shipping"
        />
      }
      profileCard={
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {image ? <img src={image} alt="Package preview" className="h-full w-full object-cover" /> : <Package className="h-14 w-14 text-orange-500" />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-950">#{order.orderNumber ?? order.id}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{order.customerName ?? "Customer"} - {pickup ? "Store Pickup" : "Mail Delivery"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge label={titleCase(fulfillmentStatus)} tone={fulfillmentStatus === "delivered" ? "green" : "blue"} />
                <Badge label={pickup ? "Pickup Desk" : provider} tone="slate" />
                <Badge label={titleCase(order.status ?? "pending")} tone="yellow" />
              </div>
              <p className="mt-4 text-3xl font-black text-slate-950">{money(order.totalUsd ?? order.totalAmount)}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:w-[360px]">
            {!canEdit ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-800">
                View-only access. Shipping updates require the <span className="font-mono">shipping.edit</span> permission.
              </div>
            ) : pickup ? (
              <>
                <button disabled={busy} onClick={() => void changeFulfillmentStatus("packed", "Mark Packed")} className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-60">Mark Packed</button>
                <button disabled={busy} onClick={() => void changeFulfillmentStatus("ready_for_pickup", "Ready For Pickup")} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-60">Ready For Pickup</button>
                <button disabled={busy} onClick={() => void changeFulfillmentStatus("picked_up", "Verify Pickup")} className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-60">Verify Pickup</button>
              </>
            ) : (
              <>
                <button disabled={busy} onClick={() => void changeFulfillmentStatus("packed", "Mark Packed")} className="h-11 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-60">Mark Packed</button>
                <button disabled={busy} onClick={() => void sendToProvider()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black text-white disabled:opacity-60"><Send className="h-4 w-4" /> Request EMS</button>
                <button disabled={busy} onClick={() => void changeFulfillmentStatus("handed_to_ems", "Tracking / Handed to EMS")} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-60">Tracking / Handed to EMS</button>
              </>
            )}
            {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p> : null}
          </div>
        </div>
      }
    >
      {activeSection === "summary" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <DetailField label="Order Number" value={order.orderNumber} />
          <DetailField label="Customer" value={order.customerName} />
          <DetailField label="Delivery Method" value={pickup ? "Store Pickup" : "Mail Delivery"} />
          <DetailField label="Provider" value={pickup ? "Pickup Desk - 3rd Floor Office" : provider} />
          <DetailField label="Fulfillment Status" value={titleCase(fulfillmentStatus)} />
          <DetailField label="Main Order Status" value={titleCase(order.status ?? "pending")} />
          <DetailField label="Tracking Number" value={trackingNumber || "Pending EMS tracking"} />
          <DetailField label="Changed By" value={order.deliveryStatusChangedBy ?? order.delivery_status_changed_by ?? "Not updated yet"} />
          <DetailField label="Changed Time" value={dateTime(order.deliveryStatusChangedAt ?? order.delivery_status_changed_at)} />
          <DetailField label="Shipping Cost" value={money(order.shippingCostUsd ?? order.shipping_cost_usd)} />
          <DetailField label="Package Weight" value={`${packageWeight} kg`} />
        </div>
      ) : null}

      {activeSection === "recipient" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <DetailField label={pickup ? "Pickup Person" : "Recipient Name"} value={pickup ? order.pickupPersonName ?? order.customerName : order.customerName} />
          <DetailField label="Phone" value={pickup ? order.pickupPersonPhone : order.phoneNumber ?? order.phone_number} />
          <DetailField label={pickup ? "Pickup Location" : "Delivery Address"} value={pickup ? order.pickupLocation ?? "3rd Floor Office" : addressText(order)} />
          <DetailField label={pickup ? "Verification" : "Delivery Type"} value={pickup ? "Staff verifies order ID / QR" : "Mail delivery - provider controlled after handoff"} />
        </div>
      ) : null}

      {activeSection === "assignment" ? (
        <div className="space-y-5">
          {pickup ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-black text-slate-950">Store Pickup Actions</h3>
              <p className="mt-2 text-sm font-semibold text-slate-600">Move packed order to the 3rd floor pickup desk, then verify customer order ID or QR before handover.</p>
            </div>
          ) : canEdit ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Provider</span>
                <select value={provider} onChange={(event) => setProvider(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black">
                  <option value="Ethiopian Mail Service">EMS</option>
                  <option value="DHL">DHL</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Package Weight</span>
                <input value={packageWeight} onChange={(event) => setPackageWeight(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black" />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tracking Number</span>
                <input value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} placeholder="EMS tracking number" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black" />
              </label>
              <div className="flex items-end">
                <button disabled={busy} onClick={() => void sendToProvider()} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black text-white disabled:opacity-60">
                  <Send className="h-4 w-4" /> Request EMS
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <DetailField label="Provider" value={provider} />
              <DetailField label="Package Weight" value={`${packageWeight} kg`} />
              <DetailField label="Tracking Number" value={trackingNumber || "Pending EMS tracking"} />
            </div>
          )}
          {canEdit ? <label className="block space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Delivery Internal Note</span>
            <textarea
              value={deliveryNote}
              onChange={(event) => setDeliveryNote(event.target.value)}
              rows={3}
              placeholder={pickup ? "Pickup verification note" : "EMS request or tracking note"}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900"
            />
          </label> : null}
          {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
            Mail flow: Request EMS sets main status to fulfilled. Tracking or EMS handoff sets main status to shipped. Delivered closes the order. Pickup flow is staff verified at the office.
          </div>
          {canViewNotes ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-950">Delivery Notes</p>
            <div className="mt-3 space-y-2">
              {deliveryNotes.length ? deliveryNotes.map((note) => (
                <div key={note.id ?? `${note.createdAt ?? note.created_at}-${note.note}`} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-800">{note.note}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">{dateTime(note.createdAt ?? note.created_at)} - {note.userEmail ?? note.user_email ?? "Admin"}</p>
                </div>
              )) : <p className="text-sm font-semibold text-slate-500">No delivery notes recorded yet.</p>}
            </div>
          </div> : null}
        </div>
      ) : null}

      {activeSection === "progress" ? (
        <div className="space-y-4">
          <HorizontalSteps steps={pickup ? PICKUP_STATES : MAIL_STATES} current={fulfillmentStatus} interactive={canEdit} onSelect={(step) => void changeFulfillmentStatus(step)} />
          <div className="grid gap-3 sm:grid-cols-3">
            <DetailField label="Current Progress" value={titleCase(fulfillmentStatus)} />
            <DetailField label="Last Updated" value={dateTime(order.deliveryStatusChangedAt ?? order.delivery_status_changed_at ?? order.updatedAt)} />
            <DetailField label="Flow" value={pickup ? "Store pickup progress" : "EMS shipping progress"} />
          </div>
        </div>
      ) : null}

      {activeSection === "documents" ? (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-black text-slate-950">{doc.label}</p>
                <p className="text-xs font-semibold text-slate-500">{doc.url ? "Available" : "Not uploaded"}</p>
              </div>
              {doc.url ? <a href={doc.url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black">Preview</a> : <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">Pending</span>}
            </div>
          ))}
        </div>
      ) : null}

      {activeSection === "timeline" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-600">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Updated By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-slate-50">
              {timeline.map((row) => (
                <tr key={row.event}>
                  <td className="px-4 py-4 font-black text-slate-950">{row.event}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{dateTime(row.time)}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{row.by}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{row.status}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{String(row.note ?? "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminDetailLayout>
  );
}

function Badge({ label, tone }: { label: string; tone: "green" | "blue" | "yellow" | "slate" }) {
  return (
    <span className={cn("rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-wide", tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-700", tone === "blue" && "border-blue-200 bg-blue-50 text-blue-700", tone === "yellow" && "border-amber-200 bg-amber-50 text-amber-700", tone === "slate" && "border-slate-200 bg-slate-50 text-slate-600")}>
      {label}
    </span>
  );
}

function HorizontalSteps<T extends readonly string[]>({ steps, current, interactive, onSelect }: { steps: T; current: string; interactive: boolean; onSelect: (step: T[number]) => void }) {
  const currentIdx = Math.max(steps.findIndex((step) => step === current), 0);
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex min-w-max items-start gap-3">
        {steps.map((step, idx) => {
          const done = idx <= currentIdx;
          return (
            <button key={step} type="button" disabled={!interactive} onClick={() => onSelect(step)} className="flex w-36 flex-col items-center gap-2 text-center disabled:cursor-default">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-black", done ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-400", current === step && "ring-4 ring-emerald-100")}>
                {done ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
              </span>
              <span className={cn("text-[10px] font-black uppercase leading-tight tracking-wide", done ? "text-emerald-700" : "text-slate-400")}>{titleCase(step)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
