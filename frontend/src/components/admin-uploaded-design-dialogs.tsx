"use client";

import Link from "next/link";
import { useState } from "react";
import type { ComponentType, PropsWithChildren } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, Clock3, Images, Loader2, Palette, Ruler, UserRound, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";

const TypedDialogContent = DialogContent as ComponentType<PropsWithChildren<{ className?: string }>>;
const TypedDialogTitle = DialogTitle as ComponentType<PropsWithChildren<{ className?: string }>>;

export type UploadedDesign = {
  id: string;
  submissionNumber?: string | null;
  designTitle?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  status?: string | null;
  frontImageUrl?: string | null;
  sideImageUrl?: string | null;
  backImageUrl?: string | null;
  detailImageUrl?: string | null;
  fabricType?: string | null;
  embroideryStyle?: string | null;
  colorPreference?: string | null;
  inspirationNote?: string | null;
  measurementSnapshot?: Record<string, unknown> | null;
  contactPhone?: string | null;
  contactTelegram?: string | null;
  contactAddress?: Record<string, unknown> | null;
  quotedPriceUsd?: number | string | null;
  estimatedDeliveryLabel?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewReason?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
  approvedCartItemId?: string | null;
  approvedOrderId?: string | null;
};

type DialogKind = "view" | "approve" | "reject" | null;

const DELIVERY_OPTIONS = [
  { label: "20-30 days", min: 20, max: 30 },
  { label: "30-40 days", min: 30, max: 40 },
  { label: "40-50 days", min: 40, max: 50 },
  { label: "45-60 days", min: 45, max: 60 },
] as const;

function display(value: unknown) {
  if (value == null || String(value).trim() === "") return "Not provided";
  return String(value);
}

function prettyStatus(value?: string | null) {
  return display(value ?? "submitted").replaceAll("_", " ");
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-950">{display(value)}</p>
    </div>
  );
}

function ImageStrip({ design }: { design: UploadedDesign }) {
  const images = [
    ["Front", design.frontImageUrl],
    ["Side", design.sideImageUrl],
    ["Back", design.backImageUrl],
    ["Detail", design.detailImageUrl],
  ].filter((item): item is [string, string] => Boolean(item[1]));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {images.map(([label, url]) => (
        <a key={label} href={url} target="_blank" rel="noreferrer" className="group relative overflow-hidden rounded-xl border border-white/15 bg-black">
          <img src={url} alt={`${label} design reference`} className="h-32 w-full object-cover transition group-hover:scale-105" />
          <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-center text-xs font-bold text-white">{label}</span>
        </a>
      ))}
    </div>
  );
}

export function AdminUploadedDesignDialogs({
  design,
  kind,
  onClose,
}: {
  design: UploadedDesign | null;
  kind: DialogKind;
  onClose: () => void;
}) {
  if (!design || !kind) return null;
  if (kind === "view") return <ViewDialog design={design} onClose={onClose} />;
  return <DecisionDialog design={design} decision={kind} onClose={onClose} />;
}

function ViewDialog({ design, onClose }: { design: UploadedDesign; onClose: () => void }) {
  const [section, setSection] = useState<"overview" | "images" | "measurements" | "customer" | "review">("overview");
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const measurements = Object.entries(design.measurementSnapshot ?? {});
  const address = design.contactAddress ?? {};
  const images = [
    ["Front", design.frontImageUrl],
    ["Side", design.sideImageUrl],
    ["Back", design.backImageUrl],
    ["Detail", design.detailImageUrl],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const [selectedImage, setSelectedImage] = useState(images[0]?.[1] ?? "");
  const canReview = ["submitted", "in_review"].includes(String(design.status ?? "submitted"));

  if (decision) {
    return <DecisionDialog design={design} decision={decision} onClose={() => setDecision(null)} onCompleted={onClose} />;
  }

  const sections = [
    { id: "overview", label: "Design Overview", hint: "Request and quote", icon: Palette },
    { id: "images", label: "Uploaded Images", hint: "Front, side, back, detail", icon: Images },
    { id: "measurements", label: "Measurements", hint: "Customer sizing", icon: Ruler },
    { id: "customer", label: "Customer Information", hint: "Contact and address", icon: UserRound },
    { id: "review", label: "Review Information", hint: "Decision and linked records", icon: ClipboardList },
  ] as const;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <TypedDialogContent className="max-w-6xl p-0">
        <div className="bg-blue-950 px-6 py-4 pr-16 text-white">
          <TypedDialogTitle className="text-lg font-bold text-white">Custom Design Details</TypedDialogTitle>
          <p className="mt-1 text-sm text-blue-100">
            #{design.submissionNumber ?? design.id} · {design.customerName ?? design.userEmail ?? "Customer request"}
          </p>
        </div>
        <div className="max-h-[88vh] overflow-y-auto bg-slate-50 p-5">
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {selectedImage ? <img src={selectedImage} alt="Selected design reference" className="h-28 w-full rounded-2xl border border-slate-200 object-cover sm:w-44" /> : null}
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-900">Custom Design Request</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{design.designTitle ?? "Custom Design"}</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-700">#{design.submissionNumber ?? design.id}</p>
                  <p className="mt-1 text-sm text-slate-600">{design.customerName ?? "Customer"} · {design.userEmail ?? "No email"}</p>
                  <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${
                    String(design.status) === "rejected" ? "border-rose-200 bg-rose-50 text-rose-700" :
                    String(design.status) === "completed_request" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                    "border-blue-200 bg-blue-50 text-blue-900"
                  }`}>{prettyStatus(design.status)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canReview ? (
                  <>
                    <button type="button" onClick={() => setDecision("approve")} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-900 px-5 text-sm font-bold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-950">
                      <CheckCircle2 className="h-4 w-4" /> Approve & Quote
                    </button>
                    <button type="button" onClick={() => setDecision("reject")} className="inline-flex h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-red-700">
                      <XCircle className="h-4 w-4" /> Decline
                    </button>
                  </>
                ) : null}
                {design.approvedOrderId ? <Link href={`/admin/orders/${design.approvedOrderId}`} className="inline-flex h-11 items-center rounded-xl bg-blue-900 px-5 text-sm font-bold text-white hover:bg-blue-950">View Order</Link> : null}
              </div>
            </div>
          </header>

          <div className="mt-4 grid gap-4 lg:grid-cols-[270px_1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="px-2 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">Request Overview</p>
              <nav className="space-y-1">
                {sections.map((item) => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                    <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${active ? "border border-blue-200 bg-blue-50 text-blue-950 shadow-sm" : "text-slate-700 hover:bg-slate-50"}`}>
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${active ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"}`}><Icon className="h-5 w-5" /></span>
                      <span><span className="block text-sm font-bold">{item.label}</span><span className="mt-0.5 block text-xs text-slate-500">{item.hint}</span></span>
                    </button>
                  );
                })}
              </nav>
            </aside>

            <main className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
              {section === "images" ? (
                <section>
                  <h3 className="text-lg font-bold">Uploaded Images</h3>
                  {selectedImage ? <a href={selectedImage} target="_blank" rel="noreferrer"><img src={selectedImage} alt="Selected design" className="mt-4 h-72 w-full rounded-2xl border border-slate-200 object-contain bg-slate-50" /></a> : null}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {images.map(([label, url]) => (
                      <button key={label} type="button" onClick={() => setSelectedImage(url)} className={`overflow-hidden rounded-xl border-2 text-left ${selectedImage === url ? "border-blue-700" : "border-slate-200 hover:border-blue-300"}`}>
                        <img src={url} alt={`${label} design`} className="h-24 w-full object-cover" />
                        <span className="block px-3 py-2 text-xs font-bold text-slate-800">{label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : section === "measurements" ? (
                <section>
                  <h3 className="text-lg font-bold">Measurements</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {measurements.length ? measurements.map(([key, value]) => <Field key={key} label={key.replaceAll("_", " ")} value={value} />) : <Field label="Measurements" value={null} />}
                  </div>
                </section>
              ) : section === "customer" ? (
                <section>
                  <h3 className="text-lg font-bold">Customer Information</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field label="Customer Name" value={design.customerName} />
                    <Field label="Email Address" value={design.userEmail} />
                    <Field label="Phone Number" value={design.contactPhone} />
                    <Field label="Telegram" value={design.contactTelegram} />
                    {Object.entries(address).map(([key, value]) => <Field key={key} label={key.replaceAll("_", " ")} value={value} />)}
                  </div>
                </section>
              ) : section === "review" ? (
                <section>
                  <h3 className="text-lg font-bold">Review Information</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field label="Status" value={prettyStatus(design.status)} />
                    <Field label="Reviewed By" value={design.reviewedBy} />
                    <Field label="Reviewed At" value={design.reviewedAt ? new Date(design.reviewedAt).toLocaleString() : null} />
                    <Field label="Quoted Price" value={design.quotedPriceUsd ? `$${Number(design.quotedPriceUsd).toFixed(2)}` : null} />
                    <Field label="Estimated Delivery" value={design.estimatedDeliveryLabel} />
                    <Field label="Cart Item" value={design.approvedCartItemId} />
                    <Field label="Order" value={design.approvedOrderId} />
                    <Field label="Review Reason / Note" value={design.reviewReason} />
                  </div>
                </section>
              ) : (
                <section>
                  <h3 className="text-lg font-bold">Design Overview</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Field label="Design Title" value={design.designTitle} />
                    <Field label="Request ID" value={design.submissionNumber} />
                    <Field label="Fabric Type" value={design.fabricType} />
                    <Field label="Embroidery Style" value={design.embroideryStyle} />
                    <Field label="Color Preference" value={design.colorPreference} />
                    <Field label="Submitted" value={design.submittedAt || design.createdAt ? new Date(String(design.submittedAt ?? design.createdAt)).toLocaleString() : null} />
                    <Field label="Quoted Price" value={design.quotedPriceUsd ? `$${Number(design.quotedPriceUsd).toFixed(2)}` : null} />
                    <Field label="Estimated Delivery" value={design.estimatedDeliveryLabel} />
                  </div>
                  <div className="mt-3"><Field label="Customer Design Notes" value={design.inspirationNote} /></div>
                </section>
              )}
            </main>
          </div>
        </div>
      </TypedDialogContent>
    </Dialog>
  );
}

function DecisionDialog({
  design,
  decision,
  onClose,
  onCompleted,
}: {
  design: UploadedDesign;
  decision: "approve" | "reject";
  onClose: () => void;
  onCompleted?: () => void;
}) {
  const router = useRouter();
  const isApprove = decision === "approve";
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [delivery, setDelivery] = useState<(typeof DELIVERY_OPTIONS)[number]>(DELIVERY_OPTIONS[1]);
  const [customOpen, setCustomOpen] = useState(false);
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");

  async function submit() {
    const price = Number(quotedPrice);
    const min = customOpen ? Number(customMin) : delivery.min;
    const max = customOpen ? Number(customMax) : delivery.max;
    if (isApprove && (!Number.isFinite(price) || price <= 0)) {
      await dashboardError("Price Required", "Enter a valid quoted price before approving.");
      return;
    }
    if (isApprove && (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min)) {
      await dashboardError("Delivery Estimate Required", "Enter a valid completion and delivery estimate.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/backend/admin/uploaded-designs/${design.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: reason.trim() || undefined,
          quotedPriceUsd: isApprove ? price : undefined,
          estimatedDeliveryLabel: isApprove ? (customOpen ? `${min}-${max} days` : delivery.label) : undefined,
          estimatedDeliveryDaysMin: isApprove ? min : undefined,
          estimatedDeliveryDaysMax: isApprove ? max : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? payload?.message ?? "Review update failed.");
      (onCompleted ?? onClose)();
      router.refresh();
      await dashboardSuccess(
        isApprove ? "Quote Issued Successfully" : "Request Declined",
        isApprove ? "The design is awaiting payment and has been added to the customer's cart." : "The custom design request has been declined.",
      );
    } catch (error) {
      await dashboardError("Review Update Failed", error instanceof Error ? error.message : "Review update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <TypedDialogContent className="max-w-2xl border-slate-200 bg-white p-0 text-slate-950">
        <div className="bg-blue-950 px-6 py-4 pr-16 text-white">
          <TypedDialogTitle className="text-lg font-bold text-white">
            {isApprove ? "Issue Quote" : "Decline Request"} — #{design.submissionNumber ?? design.id}
          </TypedDialogTitle>
          <p className="mt-1 text-sm text-blue-100">{design.customerName ?? design.userEmail} · {design.designTitle ?? "Custom Design"}</p>
        </div>
        <div className="max-h-[90vh] overflow-y-auto p-6 sm:p-8">

          {isApprove ? <div className="mt-6"><ImageStrip design={design} /></div> : null}

          {isApprove ? (
            <>
              <label className="mt-6 block">
                <span className="text-sm font-semibold text-slate-700">Base Price (USD) <b className="text-red-600">*</b></span>
                <div className="mt-2 flex h-14 items-center rounded-xl border border-slate-300 bg-white px-4 focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-100">
                  <span className="mr-3 text-xl font-black text-blue-900">$</span>
                  <input value={quotedPrice} onChange={(event) => setQuotedPrice(event.target.value)} type="number" min="0" step="0.01" className="h-full flex-1 bg-transparent text-lg outline-none" placeholder="e.g. 120.00" />
                </div>
              </label>

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-700">Estimated Completion & Delivery Time <b className="text-red-600">*</b></p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {DELIVERY_OPTIONS.map((option) => (
                    <button key={option.label} type="button" onClick={() => { setDelivery(option); setCustomOpen(false); }} className={`h-12 rounded-xl border text-sm font-bold ${!customOpen && delivery.label === option.label ? "border-blue-700 bg-blue-50 text-blue-950" : "border-slate-300 text-slate-600 hover:border-blue-400 hover:bg-blue-50"}`}>
                      <Clock3 className="mr-2 inline h-4 w-4" /> {option.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => setCustomOpen(true)} className={`h-12 rounded-xl border text-sm font-bold ${customOpen ? "border-blue-700 bg-blue-50 text-blue-950" : "border-slate-300 text-slate-600 hover:border-blue-400 hover:bg-blue-50"}`}>Custom estimate</button>
                </div>
                {customOpen ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <input value={customMin} onChange={(event) => setCustomMin(event.target.value)} type="number" min="1" placeholder="Minimum days" className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700" />
                    <input value={customMax} onChange={(event) => setCustomMax(event.target.value)} type="number" min="1" placeholder="Maximum days" className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-blue-700" />
                  </div>
                ) : null}
                <p className="mt-3 text-xs text-slate-500">Counted from when the customer confirms and pays.</p>
              </div>
            </>
          ) : null}

          <label className="mt-6 block">
            <span className="text-sm font-semibold text-slate-700">{isApprove ? "Message to customer (optional)" : "Reason (optional — shown to customer)"}</span>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100" placeholder={isApprove ? "Add quote details or production notes..." : "e.g. The design complexity exceeds our current production capacity..."} />
          </label>

          <div className="mt-7 grid gap-3 sm:grid-cols-[1fr_1.65fr]">
            <button type="button" disabled={busy} onClick={onClose} className="h-13 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            <button type="button" disabled={busy} onClick={() => void submit()} className={`inline-flex h-13 items-center justify-center gap-3 rounded-xl text-sm font-black text-white disabled:opacity-50 ${isApprove ? "bg-blue-900 hover:bg-blue-950" : "bg-red-600 hover:bg-red-700"}`}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : isApprove ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              {isApprove ? "Approve & Notify Customer" : "Decline & Notify Customer"}
            </button>
          </div>
        </div>
      </TypedDialogContent>
    </Dialog>
  );
}
