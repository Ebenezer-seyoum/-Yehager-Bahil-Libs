"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, FileText, MapPin, Package, Send, Truck, UserRound } from "lucide-react";
import { AdminDetailHeader, AdminDetailLayout } from "@/components/admin/admin-detail-layout";
import { cn } from "@/lib/utils";

type Order = Record<string, any>;

const MAIL_STATES = ["pending", "packed", "shipping_assigned", "handed_to_ems", "shipped", "in_transit", "at_hub", "out_for_delivery", "delivered"] as const;
const PICKUP_STATES = ["pending", "packed", "moved_to_pickup_desk", "ready_for_pickup", "waiting_customer", "picked_up", "delivered"] as const;

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
    if (image) return image;
  }
  return null;
}

function derivedFulfillmentStatus(order: Order) {
  const explicit = norm(order.shippingStatus ?? order.shipping_status ?? order.pickupStatus ?? order.pickup_status);
  if (explicit) return explicit;
  const status = norm(order.status);
  if (status === "delivered" || status === "picked_up") return "delivered";
  if (status === "ready_for_pickup") return "ready_for_pickup";
  if (status === "shipped") return "shipped";
  if (status === "fulfilled") return "shipping_assigned";
  return "pending";
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950">{String(value ?? "").trim() || "Not provided"}</p>
    </div>
  );
}

export function AdminShippingDeliveryDetailWorkspace({ initialOrder }: { initialOrder: Order }) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [activeSection, setActiveSection] = useState("summary");
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState(String(order.carrier ?? "EMS"));
  const [packageWeight, setPackageWeight] = useState("1");
  const [fulfillmentStatus, setFulfillmentStatus] = useState(derivedFulfillmentStatus(order));
  const pickup = isPickup(order);
  const image = firstImage(order);

  async function updateMainStatus(status: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/orders/${order.id}/admin-state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Update failed");
      const json = await res.json();
      setOrder((current) => ({ ...current, ...(json.data ?? { status }) }));
    } catch (error) {
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  async function changeFulfillmentStatus(next: string) {
    setFulfillmentStatus(next);
    if (next === "ready_for_pickup") await updateMainStatus("ready_for_pickup");
    if (next === "shipping_assigned") await updateMainStatus("fulfilled");
    if (next === "shipped" || next === "handed_to_ems") await updateMainStatus("shipped");
    if (next === "picked_up" || next === "delivered") await updateMainStatus("delivered");
  }

  function sendToProvider() {
    setFulfillmentStatus("shipping_assigned");
    void updateMainStatus("fulfilled");
  }

  const sections = [
    { id: "summary", label: "Fulfillment Summary", icon: Package },
    { id: "recipient", label: pickup ? "Pickup Details" : "Recipient Details", icon: pickup ? MapPin : UserRound },
    { id: "assignment", label: pickup ? "Pickup Actions" : "Provider Assignment", icon: Send },
    { id: "progress", label: "Fulfillment Progress", icon: Truck },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "timeline", label: "Fulfillment Timeline", icon: ClipboardList },
  ];

  const documents = [
    { label: pickup ? "Pickup QR / Order ID" : "Shipping Label", url: order.shippingDocumentUrl ?? order.shipping_document_url },
    { label: pickup ? "Pickup Proof" : "Courier Receipt", url: pickup ? order.pickupProofUrl : order.shippingDocumentUrl },
    { label: "Package Photo", url: null },
    { label: "Delivery Proof", url: order.pickupSignedDocUrl ?? order.pickup_signed_doc_url },
  ];

  const timeline = [
    { event: "Production Completed", status: "Ready", by: "Production", time: order.updatedAt },
    { event: "Packing Done", status: fulfillmentStatus === "pending" ? "Pending" : "Completed", by: "Warehouse", time: order.updatedAt },
    { event: pickup ? "Moved To Pickup Desk" : "Shipment Request Created", status: titleCase(fulfillmentStatus), by: "Admin", time: order.updatedAt },
    { event: pickup ? "Customer Pickup" : "Courier Tracking", status: ["picked_up", "delivered", "in_transit", "out_for_delivery"].includes(fulfillmentStatus) ? "Active" : "Pending", by: pickup ? "Store Staff" : provider, time: order.updatedAt },
    { event: "Delivered / Closed", status: fulfillmentStatus === "delivered" ? "Closed" : "Open", by: "System", time: fulfillmentStatus === "delivered" ? order.updatedAt : null },
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
          subtitle="Manage packing, provider assignment, store pickup, and final delivery state."
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
            {pickup ? (
              <>
                <button disabled={busy} onClick={() => void changeFulfillmentStatus("packed")} className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-black text-white">Mark Packed</button>
                <button disabled={busy} onClick={() => void changeFulfillmentStatus("ready_for_pickup")} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-black text-white">Ready For Pickup</button>
                <button disabled={busy} onClick={() => void changeFulfillmentStatus("delivered")} className="h-11 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white">Verify & Deliver</button>
              </>
            ) : (
              <>
                <button disabled={busy} onClick={() => void changeFulfillmentStatus("packed")} className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-black text-white">Mark Packed</button>
                <button disabled={busy} onClick={sendToProvider} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black text-white"><Send className="h-4 w-4" /> Send to {provider}</button>
                <button disabled={busy} onClick={() => void changeFulfillmentStatus("shipped")} className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-black text-white">Handed to Courier</button>
              </>
            )}
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
          <DetailField label="Tracking Number" value={order.trackingNumber ?? order.tracking_number ?? "Generated after provider API integration"} />
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
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Provider</span>
                <select value={provider} onChange={(event) => setProvider(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black">
                  <option value="EMS">EMS</option>
                  <option value="DHL">DHL</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Package Weight</span>
                <input value={packageWeight} onChange={(event) => setPackageWeight(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black" />
              </label>
              <div className="flex items-end">
                <button onClick={sendToProvider} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-black text-white">
                  <Send className="h-4 w-4" /> Create Shipment Request
                </button>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-900">
            Mail flow sends customer name, phone, address, package weight, order ID, and delivery type to the provider API. Pickup flow does not use EMS/DHL.
          </div>
        </div>
      ) : null}

      {activeSection === "progress" ? (
        <HorizontalSteps steps={pickup ? PICKUP_STATES : MAIL_STATES} current={fulfillmentStatus} onSelect={(step) => void changeFulfillmentStatus(step)} />
      ) : null}

      {activeSection === "documents" ? (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-black text-slate-950">{doc.label}</p>
                <p className="text-xs font-semibold text-slate-500">{doc.url ? "Available" : "Not uploaded"}</p>
              </div>
              {doc.url ? <a href={doc.url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black">Preview</a> : <span className="text-sm font-black text-slate-400">Pending</span>}
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-slate-50">
              {timeline.map((row) => (
                <tr key={row.event}>
                  <td className="px-4 py-4 font-black text-slate-950">{row.event}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{dateTime(row.time)}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{row.by}</td>
                  <td className="px-4 py-4 font-semibold text-slate-600">{row.status}</td>
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

function HorizontalSteps<T extends readonly string[]>({ steps, current, onSelect }: { steps: T; current: string; onSelect: (step: T[number]) => void }) {
  const currentIdx = Math.max(steps.findIndex((step) => step === current), 0);
  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex min-w-max items-start gap-3">
        {steps.map((step, idx) => {
          const done = idx <= currentIdx;
          return (
            <button key={step} type="button" onClick={() => onSelect(step)} className="flex w-36 flex-col items-center gap-2 text-center">
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
