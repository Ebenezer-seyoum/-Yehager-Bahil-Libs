"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Eye,
  FileCheck,
  FileText,
  Package,
  Ruler,
  Scissors,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────── */
type OrderItem = {
  id?: string | null;
  productId?: string | null;
  productName?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  quantity?: number | string | null;
  price?: number | string | null;
  priceUsd?: number | string | null;
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
};

export type OrderDetailData = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  totalUsd?: number | string | null;
  totalEtb?: number | string | null;
  totalAmount?: number | string | null;
  orderType?: string | null;
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
  shippingDocuments?: Array<{ url: string; label?: string | null; uploadedAt?: string | null }> | null;
  shippingAddress?: string | ShippingAddress | null;
  items?: OrderItem[] | null;
  phoneNumber?: string | null;
  phone_number?: string | null;
  paymentReference?: string | null;
  payment_reference?: string | null;
  members?: any[] | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

/* ── Constants ───────────────────────────────────────── */
const ORDER_STATUSES = ["pending", "tailoring", "quality_check", "shipped", "delivered", "ready_for_pickup", "picked_up"];
const PAYMENT_STATUSES = ["pending", "awaiting_verification", "paid", "failed", "refunded", "unpaid"];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-900 border-yellow-200",
  tailoring: "bg-blue-100 text-blue-800 border-blue-200",
  quality_check: "bg-purple-100 text-purple-800 border-purple-200",
  shipped: "bg-cyan-100 text-cyan-800 border-cyan-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  ready_for_pickup: "bg-orange-100 text-orange-800 border-orange-200",
  picked_up: "bg-green-100 text-green-900 border-green-200",
};

const PAYMENT_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-900 border-yellow-200",
  awaiting_verification: "bg-orange-100 text-orange-800 border-orange-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-slate-100 text-slate-800 border-slate-200",
  unpaid: "bg-orange-100 text-orange-800 border-orange-200",
};

function prettyLabel(v?: string | null) {
  return (v ?? "pending").replaceAll("_", " ");
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  const display = (v: any) => {
    if (v == null || String(v).trim() === "" || v === "undefined") return "Not provided";
    return String(v);
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{display(value)}</p>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */
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
  const [section, setSection] = useState<"info" | "customer" | "measurements" | "payment" | "production" | "shipping" | "timeline" | "attachments">("info");
  const [activeMemberIdx, setActiveMemberIdx] = useState<number>(0);

  const isGroup = order.orderType === "group_order";

  const sections = [
    { id: "info", label: "Order Information", hint: "Core metadata", icon: ShoppingBag },
    { id: "customer", label: "Customer Detail", hint: "Contact & address", icon: UserRound },
    { id: "measurements", label: "Measurement Details", hint: "Sizing data", icon: Ruler },
    { id: "payment", label: "Payment Information", hint: "Transaction detail", icon: CreditCard },
    { id: "production", label: "Production Tracking", hint: "Workflow status", icon: Package },
    { id: "shipping", label: "Shipping Information", hint: "Carrier & tracking", icon: Truck },
    { id: "timeline", label: "Order Timeline", hint: "Lifecycle stages", icon: ClipboardList },
    { id: "attachments", label: "Document Attachments", hint: "Images & invoices", icon: Eye },
  ] as const;

  const timelineStages = [
    { label: "Order Created", status: "pending" },
    { label: "Payment Received", status: "paid" },
    { label: "Design Approved", status: "approved" },
    { label: "Production Started", status: "tailoring" },
    { label: "Shipped", status: "shipped" },
    { label: "Delivered", status: "delivered" },
  ];

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
      const updated = payload.data ?? { id: order.id, ...patch };
      setOrder((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const shippingAddr = typeof order.shippingAddress === "object" && order.shippingAddress !== null
    ? order.shippingAddress as ShippingAddress
    : null;
  const shippingAddrStr = typeof order.shippingAddress === "string" ? order.shippingAddress : null;

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="bg-[#0f172a] border-b border-white/10">
        <div className="mx-auto max-w-[1600px] px-8 py-6 flex items-center gap-6">
          <button
            onClick={() => router.push(backUrl)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-all group shrink-0"
          >
            <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-all">
              <ArrowLeft className="h-5 w-5" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest hidden sm:block">Back to Orders</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white tracking-tight uppercase truncate">Order Detail Workspace</h1>
            <p className="text-sm text-slate-400 font-medium mt-1">
              Comprehensive management of order lifecycle, customer relationships, and fulfillment logistics.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-8 py-10 pb-20">
        {/* ── Identity Block ───────────────────────────── */}
        <div className="mb-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl flex flex-col lg:flex-row items-center gap-10 ring-1 ring-black/[0.02]">
          <div className="h-40 w-40 shrink-0 overflow-hidden rounded-[2.5rem] border-4 border-slate-50 shadow-2xl bg-[#0f172a] flex items-center justify-center relative">
            <div className="absolute inset-0 bg-blue-600/10 animate-pulse" />
            <ShoppingBag className="h-16 w-16 text-blue-400 relative z-10" />
          </div>
          <div className="flex-1 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">ORDER #{order.orderNumber}</h2>
              <div className="bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">ID</span>
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <span className="text-xs font-black text-slate-900">{String(order.id).slice(0, 12)}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-6">
              <span className={`inline-flex rounded-xl border-2 px-4 py-1 text-xs font-black uppercase tracking-wider shadow-sm ${STATUS_STYLES[order.status ?? "pending"] ?? STATUS_STYLES.pending}`}>
                {prettyLabel(order.status)}
              </span>
              <span className={`inline-flex rounded-xl border-2 px-4 py-1 text-xs font-black uppercase tracking-wider shadow-sm ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] ?? PAYMENT_STYLES.pending}`}>
                {prettyLabel(order.paymentStatus)}
              </span>
              <span className="inline-flex rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-1 text-xs font-black uppercase tracking-wider text-slate-500 shadow-sm">
                {isGroup ? "Group Catalog Order" : "Individual Catalog Order"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[1.5rem] border-2 border-slate-100">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 pl-1">
                  <div className="h-2 w-2 rounded-full bg-blue-600" />
                  <span className="text-xs font-black uppercase text-slate-500 tracking-[0.1em]">Modify Order Status</span>
                </div>
                <select
                  disabled={busy}
                  value={order.status ?? "pending"}
                  onChange={(e) => void updateOrder({ status: e.target.value })}
                  className={`h-14 w-full rounded-2xl border-2 px-4 text-sm font-black outline-none shadow-md transition-all focus:ring-4 focus:ring-blue-500/10 cursor-pointer ${STATUS_STYLES[order.status ?? "pending"] || "bg-white border-slate-200"} hover:border-blue-400`}
                >
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{prettyLabel(s)}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 pl-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-600" />
                  <span className="text-xs font-black uppercase text-slate-500 tracking-[0.1em]">Modify Payment Status</span>
                </div>
                <select
                  disabled={busy}
                  value={order.paymentStatus ?? "pending"}
                  onChange={(e) => void updateOrder({ paymentStatus: e.target.value })}
                  className={`h-14 w-full rounded-2xl border-2 px-4 text-sm font-black outline-none shadow-md transition-all focus:ring-4 focus:ring-emerald-500/10 cursor-pointer ${PAYMENT_STYLES[order.paymentStatus ?? "pending"] || "bg-white border-slate-200"} hover:border-emerald-400`}
                >
                  {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{prettyLabel(s)}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar + Main ───────────────────────────── */}
        <div className="grid gap-10 lg:grid-cols-[340px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-6 shrink-0">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sticky top-6">
              <p className="mb-6 px-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-4">Workspace Sections</p>
              <nav className="space-y-3">
                {sections.map((item) => {
                  const Icon = item.icon;
                  const isActive = section === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSection(item.id)}
                      className={`flex w-full items-center gap-5 rounded-[1.25rem] px-5 py-4 text-left transition-all group ${isActive ? "bg-[#0f172a] text-white shadow-xl scale-[1.02]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all ${isActive ? "bg-blue-600 text-white rotate-6" : "bg-slate-100 group-hover:bg-slate-200"}`}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <div className="overflow-hidden">
                        <span className="block text-base font-black truncate tracking-tight">{item.label}</span>
                        <span className="block text-[10px] font-bold opacity-60 truncate uppercase tracking-[0.05em] mt-0.5">{item.hint}</span>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-h-[800px]">
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-12 shadow-2xl relative overflow-hidden ring-1 ring-black/[0.02]">
              <div className="flex items-center gap-4 mb-10 relative z-10">
                <div className="h-2 w-12 bg-blue-600 rounded-full" />
                <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{sections.find((s) => s.id === section)?.label}</h3>
              </div>
              
              <div className="relative z-10">
                {/* ── Order Information ─────────────────── */}
                {section === "info" && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <DetailField label="Order Number" value={order.orderNumber} />
                    <DetailField label="Order Type" value={isGroup ? "Group Catalog Order" : "Individual Catalog Order"} />
                    <DetailField label="Order Date" value={order.createdAt ? new Date(String(order.createdAt)).toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "N/A"} />
                    <DetailField label="Order Status" value={prettyLabel(order.status)} />
                    <DetailField label="Payment Status" value={prettyLabel(order.paymentStatus)} />
                    <DetailField label="Total Amount (USD)" value={order.totalUsd ? `$${Number(order.totalUsd).toFixed(2)}` : order.totalAmount ? `$${Number(order.totalAmount).toFixed(2)}` : "N/A"} />
                    <DetailField label="Currency" value={order.paymentCurrency || "USD"} />
                    <DetailField label="Fulfillment Method" value={order.fulfillmentType || "Mail / EMS"} />
                  </div>
                )}

                {/* ── Customer Detail ────────────────────── */}
                {section === "customer" && (
                  <div className="space-y-10">
                    <div className="flex items-center gap-8 p-10 rounded-[2.5rem] bg-[#f8fafc] border border-slate-100 shadow-inner">
                      <div className="h-24 w-24 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-2xl rotate-3">
                        <UserRound className="h-12 w-12" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-black text-slate-900 tracking-tight">{order.customerName || "Anonymous Customer"}</h4>
                        <p className="text-lg font-bold text-slate-500 mt-1">{order.userEmail}</p>
                      </div>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <DetailField label="Customer Name" value={order.customerName} />
                      <DetailField label="Email Address" value={order.userEmail} />
                      <DetailField label="Phone Number" value={order.phoneNumber || order.phone_number} />
                      <DetailField label="Country/Region" value={shippingAddr?.country || "Ethiopia"} />
                      <div className="sm:col-span-2">
                        <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-lg">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                            <Truck className="h-3 w-3" /> Shipping Address
                          </p>
                          <p className="text-base font-bold text-slate-800 leading-relaxed">
                            {shippingAddr
                              ? [shippingAddr.street, shippingAddr.city, shippingAddr.state, shippingAddr.postalCode, shippingAddr.country].filter(Boolean).join(", ")
                              : shippingAddrStr || "No address provided."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Measurement Details ───────────────── */}
                {section === "measurements" && (
                  <div className="space-y-10">
                    {isGroup && (order.members ?? []).length > 0 ? (
                      <div className="space-y-8">
                        <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 -mx-2 px-2">
                          {(order.members ?? []).map((member: any, idx: number) => (
                            <button
                              key={idx}
                              onClick={() => setActiveMemberIdx(idx)}
                              className={`flex flex-col items-center gap-3 shrink-0 p-4 rounded-[1.5rem] transition-all min-w-[120px] ${activeMemberIdx === idx ? "bg-[#0f172a] text-white shadow-2xl scale-110 relative z-10" : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"}`}
                            >
                              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-lg ${activeMemberIdx === idx ? "bg-blue-600" : "bg-slate-100 text-slate-400"}`}>
                                {member.name?.charAt(0) || idx + 1}
                              </div>
                              <span className="text-xs font-black uppercase tracking-tight truncate w-full text-center">{member.name || `Member ${idx + 1}`}</span>
                            </button>
                          ))}
                        </div>
                        <div className="overflow-hidden rounded-[2rem] border-2 border-slate-100 bg-white shadow-2xl">
                          <div className="bg-[#0f172a] px-8 py-4 flex items-center justify-between text-white">
                            <span className="text-sm font-black uppercase tracking-widest text-blue-400">Snapshot: {(order.members ?? [])[activeMemberIdx]?.name}</span>
                            <Ruler className="h-5 w-5 text-slate-600" />
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 p-10">
                            {Object.entries((order.members ?? [])[activeMemberIdx]?.measurements || {}).map(([key, val]) => (
                              <div key={key} className="relative">
                                <p className="text-[10px] font-black uppercase text-slate-400 leading-tight mb-1.5 tracking-tighter">{key.replaceAll("_", " ")}</p>
                                <p className="text-lg font-black text-slate-900 flex items-baseline gap-1">
                                  {String(val)} <span className="text-[10px] font-bold text-slate-300">cm</span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (order.items ?? []).some((item) => Object.keys(item.measurements ?? item.measurementDetails ?? item.measurement_details ?? {}).length > 0) ? (
                      <div className="space-y-8">
                        {(order.items ?? []).map((item, iIdx) => {
                          const meas = item.measurements ?? item.measurementDetails ?? item.measurement_details ?? {};
                          const entries = Object.entries(meas).filter(([, v]) => v != null && v !== "");
                          if (!entries.length) return null;
                          return (
                            <div key={iIdx} className="overflow-hidden rounded-[2rem] border-2 border-slate-100 bg-white shadow-xl">
                              <div className="bg-[#0f172a] px-8 py-4 flex items-center justify-between text-white">
                                <span className="text-sm font-black uppercase tracking-widest text-blue-400">{item.productName ?? item.name ?? `Item ${iIdx + 1}`}</span>
                                <Ruler className="h-5 w-5 text-slate-600" />
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 p-10">
                                {entries.map(([key, val]) => (
                                  <div key={key} className="relative">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-tighter">{key.replaceAll("_", " ")}</p>
                                    <p className="text-lg font-black text-slate-900 flex items-baseline gap-1">
                                      {String(val)} <span className="text-[10px] font-bold text-slate-300">cm</span>
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                        <Ruler className="h-16 w-16 text-slate-200 mx-auto mb-6" />
                        <p className="text-lg font-black text-slate-400 uppercase tracking-widest">No Measurement Data</p>
                        <p className="text-sm font-bold text-slate-400 mt-2">No measurements were recorded for this order.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Payment Information ───────────────── */}
                {section === "payment" && (
                  <div className="space-y-10">
                    <div className="p-10 rounded-[2.5rem] bg-[#0f172a] text-white shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <CreditCard className="h-32 w-32" />
                      </div>
                      <h4 className="text-sm font-black text-blue-400 uppercase tracking-[0.2em] mb-8">Financial Overview</h4>
                      <div className="grid gap-10 sm:grid-cols-3">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Amount</p>
                          <p className="text-4xl font-black">{order.totalUsd ? `$${Number(order.totalUsd).toFixed(2)}` : order.totalAmount ? `$${Number(order.totalAmount).toFixed(2)}` : "$ ---.--"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Payment Method</p>
                          <p className="text-2xl font-black uppercase text-blue-300">{order.paymentMethod || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase mb-1">Payment Reference</p>
                          <p className="text-base font-black text-slate-300">{order.paymentReference || order.payment_reference || "—"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <DetailField label="Payment Status" value={prettyLabel(order.paymentStatus)} />
                      <DetailField label="Currency" value={order.paymentCurrency || "USD"} />
                      {order.paymentProofUrl && (
                        <div className="sm:col-span-2">
                          <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-5 rounded-2xl border-2 border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors">
                            <FileCheck className="h-8 w-8 text-blue-600" />
                            <div>
                              <p className="text-sm font-black text-blue-900">Payment Proof Document</p>
                              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Click to view — Uploaded: {order.paymentProofUploadedAt ? new Date(order.paymentProofUploadedAt).toLocaleDateString() : "Unknown"}</p>
                            </div>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Production Tracking ───────────────── */}
                {section === "production" && (
                  <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center bg-slate-50">
                    <div className="h-24 w-24 rounded-[2rem] bg-white shadow-xl flex items-center justify-center mx-auto mb-8">
                      <Scissors className="h-10 w-10 text-slate-300" />
                    </div>
                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-widest">Production Workflow</h4>
                    <p className="text-sm font-bold text-slate-500 mt-3 max-w-md mx-auto leading-relaxed">
                      Detailed tailoring milestones and material tracking will appear here once the order enters production.
                    </p>
                    <p className="mt-6 text-sm font-black text-blue-600 uppercase tracking-widest">
                      Current Status: {prettyLabel(order.status)}
                    </p>
                  </div>
                )}

                {/* ── Shipping Information ──────────────── */}
                {section === "shipping" && (
                  <div className="space-y-10">
                    {order.fulfillmentType === "pickup" ? (
                      <div className="grid gap-6 sm:grid-cols-2">
                        <DetailField label="Fulfillment Type" value="Pickup" />
                        <DetailField label="Pickup Location" value={order.pickupLocation} />
                        <DetailField label="Pickup Person Name" value={order.pickupPersonName} />
                        <DetailField label="Pickup Person Phone" value={order.pickupPersonPhone} />
                        {order.pickupIdUrl && (
                          <div className="sm:col-span-2">
                            <a href={order.pickupIdUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-5 rounded-2xl border-2 border-blue-100 bg-blue-50 hover:bg-blue-100 transition-colors">
                              <FileText className="h-8 w-8 text-blue-600" />
                              <div>
                                <p className="text-sm font-black text-blue-900">Pickup ID Document</p>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Click to view</p>
                              </div>
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid gap-6 sm:grid-cols-2">
                          <DetailField label="Carrier" value={order.carrier || "EMS / Ethiopian Post"} />
                          <DetailField label="Fulfillment Type" value={order.fulfillmentType || "Mail"} />
                          <div className="sm:col-span-2">
                            <DetailField label="Shipping Address" value={
                              shippingAddr
                                ? [shippingAddr.street, shippingAddr.city, shippingAddr.state, shippingAddr.postalCode, shippingAddr.country].filter(Boolean).join(", ")
                                : shippingAddrStr || "Not provided"
                            } />
                          </div>
                        </div>
                        {(order.shippingDocuments ?? []).length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Shipping Documents</p>
                            {(order.shippingDocuments ?? []).map((doc, dIdx) => (
                              <a key={dIdx} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors shadow-sm">
                                <FileText className="h-6 w-6 text-blue-600" />
                                <div>
                                  <p className="text-sm font-black text-slate-900">{doc.label || `Shipping Document ${dIdx + 1}`}</p>
                                  {doc.uploadedAt && <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>}
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-[2.5rem] border border-slate-100 bg-[#f8fafc] p-12 text-center">
                            <Truck className="h-20 w-20 text-slate-200 mx-auto mb-6" />
                            <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">Awaiting Logistics Data</h4>
                            <p className="text-sm font-bold text-slate-400 mt-2">Shipping documents and tracking IDs will appear here.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Order Timeline ────────────────────── */}
                {section === "timeline" && (
                  <div className="space-y-12 pl-4">
                    <div className="relative">
                      <div className="absolute left-[31px] top-6 bottom-6 w-1 bg-slate-100 rounded-full" />
                      <div className="space-y-12">
                        {timelineStages.map((stage, idx) => {
                          const currentIdx = timelineStages.findIndex((s) => s.status === order.status);
                          const isCompleted = idx <= (currentIdx === -1 ? 0 : currentIdx);
                          return (
                            <div key={idx} className="relative flex items-center gap-8 group">
                              <div className={`h-16 w-16 rounded-[1.25rem] border-4 flex items-center justify-center relative z-10 transition-all duration-700 shadow-xl ${isCompleted ? "bg-blue-600 border-blue-100 text-white" : "bg-white border-slate-50 text-slate-200"}`}>
                                {isCompleted ? <CheckCircle2 className="h-7 w-7" /> : <div className="h-2 w-2 rounded-full bg-slate-200" />}
                              </div>
                              <div className="flex flex-col">
                                <span className={`text-xl font-black uppercase tracking-tight ${isCompleted ? "text-[#0f172a]" : "text-slate-200"}`}>{stage.label}</span>
                                <span className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{isCompleted ? "Validated" : "Pending Lifecycle Event"}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Document Attachments ──────────────── */}
                {section === "attachments" && (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { label: "Order Items", icon: ShoppingBag, count: (order.items ?? []).length },
                      { label: "Payment Proof", icon: CreditCard, count: order.paymentProofUrl ? 1 : 0 },
                      { label: "Shipping Documents", icon: FileText, count: (order.shippingDocuments ?? []).length },
                      { label: "Pickup ID", icon: FileCheck, count: order.pickupIdUrl ? 1 : 0 },
                      { label: "System Audit", icon: ClipboardList, count: 1 },
                    ].map((doc, dIdx) => (
                      <div key={dIdx} className="p-8 rounded-[2rem] border-2 border-slate-100 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-lg group">
                        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-6 group-hover:bg-[#0f172a] group-hover:text-white transition-all">
                          <doc.icon className="h-8 w-8" />
                        </div>
                        <p className="text-base font-black text-slate-900 uppercase tracking-tight">{doc.label}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{doc.count} Files Available</p>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-blue-600 group-hover:translate-x-2 transition-transform uppercase">
                          Explore <ChevronRight className="h-3 w-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
