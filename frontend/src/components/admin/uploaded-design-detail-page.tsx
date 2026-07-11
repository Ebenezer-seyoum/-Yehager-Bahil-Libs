"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  DollarSign,
  FileText,
  ImageIcon,
  Loader2,
  Mail,
  Palette,
  Phone,
  Ruler,
  Send,
  Sparkles,
  UserRound,
  X,
  XCircle,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { can } from "@/lib/permissions";
import { AdminDetailHeader } from "@/components/admin/admin-detail-layout";
import { dashboardError, dashboardSuccess, dashboardConfirm } from "@/lib/dashboard-swal";

export type UploadedDesignDetailData = {
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
  childAge?: number | string | null;
  fabricType?: string | null;
  embroideryStyle?: string | null;
  colorPreference?: string | null;
  inspirationNote?: string | null;
  measurementSnapshot?: Record<string, unknown> | null;
  contactPhone?: string | null;
  contactTelegram?: string | null;
  contactAddress?: Record<string, unknown> | string | null;
  quotedPriceUsd?: number | string | null;
  estimatedDeliveryLabel?: string | null;
  estimatedDeliveryDaysMin?: number | null;
  estimatedDeliveryDaysMax?: number | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewReason?: string | null;
  submittedAt?: string | null;
  createdAt?: string | null;
  approvedCartItemId?: string | null;
  approvedOrderId?: string | null;
  familyGroupId?: string | null;
  eventId?: string | null;
  paymentStatus?: string | null;
  members?: Array<{
    id?: string | null;
    name?: string | null;
    gender?: string | null;
    relation?: string | null;
    age?: number | string | null;
  }> | null;
};

type MemberPriceDraft = {
  memberId?: string;
  memberName: string;
  roleLabel: string;
  priceUsd: string;
  designerCostUsd: string;
  taxPercent: string;
  otherCostUsd: string;
};

const DELIVERY_OPTIONS = [
  { label: "15-20 days", min: 15, max: 20 },
  { label: "21-30 days", min: 21, max: 30 },
  { label: "30-40 days", min: 30, max: 40 },
] as const;

function prettyStatus(value?: string | null) {
  return (value ?? "submitted").replaceAll("_", " ");
}

function formatDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function addressText(value?: Record<string, unknown> | string | null) {
  if (!value) return "Not provided";
  if (typeof value === "string") return value;
  const parts = Object.entries(value)
    .filter(([, v]) => v != null && String(v).trim())
    .map(([key, v]) => `${key.replaceAll("_", " ")}: ${String(v)}`);
  return parts.length ? parts.join(", ") : "Not provided";
}

function statusClass(status?: string | null) {
  const key = String(status ?? "").toLowerCase();
  if (key === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  if (key === "awaiting_payment" || key === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (key === "in_review") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

function DetailTile({ label, value, icon: Icon }: { label: string; value: unknown; icon: LucideIcon }) {
  const display = value == null || String(value).trim() === "" ? "Not provided" : String(value);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="break-words text-sm font-bold text-slate-900">{display}</p>
    </div>
  );
}

function ReviewModal({
  mode,
  design,
  onClose,
  onDone,
}: {
  mode: "approve" | "decline";
  design: UploadedDesignDetailData;
  onClose: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const isApprove = mode === "approve";
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [delivery, setDelivery] = useState<(typeof DELIVERY_OPTIONS)[number]>(DELIVERY_OPTIONS[1]);
  const [customEstimate, setCustomEstimate] = useState(false);
  const [customMin, setCustomMin] = useState("");
  const [customMax, setCustomMax] = useState("");
  const [memberPrices, setMemberPrices] = useState<MemberPriceDraft[]>(
    () =>
      (design.members ?? []).map((member) => ({
        memberId: member.id ?? undefined,
        memberName: member.name ?? "Member",
        roleLabel: member.relation || member.gender || "Member",
        priceUsd: "",
        designerCostUsd: "",
        taxPercent: "",
        otherCostUsd: "",
      })),
  );
  const hasMemberPricing = isApprove && memberPrices.length > 0;

  function updateMemberPrice(index: number, patch: Partial<MemberPriceDraft>) {
    setMemberPrices((current) =>
      current.map((member, memberIndex) =>
        memberIndex === index ? { ...member, ...patch } : member,
      ),
    );
  }

  function applyQuoteToMembers() {
    if (!quotedPrice.trim()) return;
    setMemberPrices((current) =>
      current.map((member) => ({
        ...member,
        priceUsd: member.priceUsd || quotedPrice,
      })),
    );
  }

  async function submit() {
    const price = Number(quotedPrice);
    const min = customEstimate ? Number(customMin) : delivery.min;
    const max = customEstimate ? Number(customMax) : delivery.max;

    if (isApprove && !hasMemberPricing && (!Number.isFinite(price) || price <= 0)) {
      await dashboardError("Price Required", "Enter a valid quoted price before approving.");
      return;
    }
    if (hasMemberPricing) {
      const invalidMember = memberPrices.find((member) => {
        const memberPrice = Number(member.priceUsd);
        return !Number.isFinite(memberPrice) || memberPrice <= 0;
      });
      if (invalidMember) {
        await dashboardError("Member Price Required", `Enter a valid price for ${invalidMember.memberName}.`);
        return;
      }
    }
    if (isApprove && (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min)) {
      await dashboardError("Delivery Estimate Required", "Enter a valid completion and delivery estimate.");
      return;
    }
    if (!isApprove && reason.trim().length < 3) {
      await dashboardError("Decline Reason Required", "Add a short reason before declining the request.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/backend/admin/uploaded-designs/${design.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: isApprove ? "approve" : "reject",
          reason: reason.trim() || undefined,
          quotedPriceUsd: isApprove && Number.isFinite(price) && price > 0 ? price : undefined,
          memberPrices: hasMemberPricing
            ? memberPrices.map((member) => ({
                memberId: member.memberId,
                memberName: member.memberName,
                roleLabel: member.roleLabel || undefined,
                priceUsd: Number(member.priceUsd),
                designerCostUsd: member.designerCostUsd ? Number(member.designerCostUsd) : undefined,
                taxPercent: member.taxPercent ? Number(member.taxPercent) : undefined,
                otherCostUsd: member.otherCostUsd ? Number(member.otherCostUsd) : undefined,
              }))
            : undefined,
          estimatedDeliveryLabel: isApprove ? (customEstimate ? `${min}-${max} days` : delivery.label) : undefined,
          estimatedDeliveryDaysMin: isApprove ? min : undefined,
          estimatedDeliveryDaysMax: isApprove ? max : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? payload?.message ?? "Review update failed.");
      onDone();
      router.refresh();
      await dashboardSuccess(
        isApprove ? "Request Approved" : "Request Declined",
        isApprove ? "The custom design was priced and added to the customer's cart." : "The request was declined and saved with your reason.",
      );
    } catch (error) {
      await dashboardError("Review Update Failed", error instanceof Error ? error.message : "Review update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className={`flex items-center justify-between px-6 py-5 text-white ${isApprove ? "bg-emerald-700" : "bg-rose-700"}`}>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">{isApprove ? "Approve Request" : "Decline Request"}</p>
            <h3 className="mt-1 text-xl font-black">#{design.submissionNumber ?? design.id.slice(0, 10)}</h3>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl bg-white/10 p-2 hover:bg-white/20 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[78vh] overflow-y-auto p-6">
          {isApprove ? (
            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-black text-slate-800">{hasMemberPricing ? "Default member price in USD" : "Quoted price in USD"}</span>
                <div className="mt-2 flex h-12 items-center rounded-xl border border-slate-300 px-4 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                  <DollarSign className="mr-2 h-4 w-4 text-slate-400" />
                  <input
                    value={quotedPrice}
                    onChange={(event) => setQuotedPrice(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="h-full flex-1 bg-transparent text-sm font-bold outline-none"
                    placeholder={hasMemberPricing ? "Optional: apply to members" : "Example: 180"}
                  />
                </div>
              </label>
              {hasMemberPricing ? (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-emerald-950">Per-member quote</p>
                      <p className="mt-1 text-xs font-semibold text-emerald-800">Set separate prices for women, men, and children.</p>
                    </div>
                    <button
                      type="button"
                      onClick={applyQuoteToMembers}
                      className="h-9 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-black text-emerald-800 hover:bg-emerald-50"
                    >
                      Apply Default Price
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {memberPrices.map((member, index) => (
                      <div key={member.memberId ?? `${member.memberName}-${index}`} className="grid gap-3 rounded-xl border border-emerald-100 bg-white p-3 lg:grid-cols-6">
                        <div className="lg:col-span-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Member</p>
                          <p className="mt-1 font-black text-slate-950">{member.memberName}</p>
                          <input
                            value={member.roleLabel}
                            onChange={(event) => updateMemberPrice(index, { roleLabel: event.target.value })}
                            className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs font-bold outline-none focus:border-emerald-500"
                            placeholder="Role"
                          />
                        </div>
                        {[
                          ["Price", "priceUsd"],
                          ["Designer Cost", "designerCostUsd"],
                          ["Tax %", "taxPercent"],
                          ["Other Cost", "otherCostUsd"],
                        ].map(([label, key]) => (
                          <label key={key} className="block">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                            <input
                              value={member[key as keyof MemberPriceDraft] ?? ""}
                              onChange={(event) => updateMemberPrice(index, { [key]: event.target.value } as Partial<MemberPriceDraft>)}
                              type="number"
                              min="0"
                              step="0.01"
                              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-sm font-bold outline-none focus:border-emerald-500"
                              placeholder="0.00"
                            />
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-sm font-black text-slate-800">Estimated completion and delivery</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {DELIVERY_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        setDelivery(option);
                        setCustomEstimate(false);
                      }}
                      className={`h-11 rounded-xl border text-sm font-black ${
                        !customEstimate && delivery.label === option.label
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomEstimate(true)}
                    className={`h-11 rounded-xl border text-sm font-black ${
                      customEstimate ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Custom estimate
                  </button>
                </div>
                {customEstimate ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <input value={customMin} onChange={(event) => setCustomMin(event.target.value)} type="number" min="1" className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-bold outline-none" placeholder="Min days" />
                    <input value={customMax} onChange={(event) => setCustomMax(event.target.value)} type="number" min="1" className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-bold outline-none" placeholder="Max days" />
                  </div>
                ) : null}
              </div>

              <label className="block">
                <span className="text-sm font-black text-slate-800">Internal note to customer context</span>
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" placeholder="Optional note about pricing, fabric, sizing, or production expectations." />
              </label>
            </div>
          ) : (
            <label className="block">
              <span className="text-sm font-black text-slate-800">Reason for decline</span>
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 min-h-36 w-full rounded-xl border border-slate-300 p-3 text-sm font-medium outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" placeholder="Explain why this custom design request cannot be accepted." />
            </label>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white shadow-lg disabled:opacity-60 ${isApprove ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isApprove ? <Send className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {isApprove ? "Approve and Add to Cart" : "Decline Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UploadedDesignDetailPage({
  initialDesign,
  backUrl = "/admin/custom-orders?tab=requests",
}: {
  initialDesign: UploadedDesignDetailData;
  backUrl?: string;
}) {
  const router = useRouter();
  const design = initialDesign;
  const { data: session } = useSession();
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<"approve" | "decline" | null>(null);
  const isGroup = Boolean(design.familyGroupId || design.eventId);
  const sessionUser = session?.user as { id?: string | null; role?: string | null; permissions?: string[] | null } | undefined;
  const userPermissions = sessionUser?.permissions ?? [];
  const canDeleteDesign = can(userPermissions, "uploaded_designs.review");

  async function handleDeleteDesign() {
    const confirmed = await dashboardConfirm({
      title: "Delete Design?",
      text: `Are you sure you want to delete this custom design submission #${design.submissionNumber}? This will permanently remove the submission and its images. This action cannot be undone.`,
      confirmButtonText: "Yes, Delete Design",
      cancelButtonText: "Cancel",
      tone: "danger",
      icon: "warning",
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/uploaded-designs/${design.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? "Could not delete custom design");
      }
      await dashboardSuccess("Deleted!", `Custom design request #${design.submissionNumber} has been successfully deleted.`);
      router.push(backUrl);
      router.refresh();
    } catch (error) {
      await dashboardError("Error", error instanceof Error ? error.message : "Failed to delete custom design");
    } finally {
      setBusy(false);
    }
  }

  const canReview = ["submitted", "in_review"].includes(String(design.status ?? "submitted").toLowerCase());
  const primaryImage = design.frontImageUrl || design.sideImageUrl || design.backImageUrl || design.detailImageUrl;
  const images = useMemo(
    () =>
      [
        { label: "Front Design Image", url: design.frontImageUrl },
        { label: "Side Design Image", url: design.sideImageUrl },
        { label: "Back Design Image", url: design.backImageUrl },
        { label: "Detail Reference Image", url: design.detailImageUrl },
      ].filter((item): item is { label: string; url: string } => Boolean(item.url)),
    [design.backImageUrl, design.detailImageUrl, design.frontImageUrl, design.sideImageUrl],
  );

  useEffect(() => {
    try {
      const key = "admin-viewed-custom-design-notifications";
      const current = JSON.parse(localStorage.getItem(key) || "[]");
      const next = Array.from(new Set([...(Array.isArray(current) ? current : []), design.id]));
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("admin-custom-design-viewed", { detail: { id: design.id } }));
    } catch {
      // Local notification state is best-effort; the server also resolves the alert on detail load.
    }
  }, [design.id]);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="mx-auto max-w-[1600px] px-8 pt-8">
        <AdminDetailHeader
          icon={Palette}
          iconTheme="border-orange-100 bg-orange-50 text-orange-600"
          category="Custom Request Review"
          title={`Request #${design.submissionNumber || design.id.slice(0, 10)}`}
          subtitle="Review the uploaded design, set a quote, and move approved work into the customer's cart."
          onRefresh={() => router.refresh()}
          onBack={() => router.push(backUrl)}
          backLabel="Back to Requests"
        />
      </div>

      <div className="mx-auto max-w-[1600px] px-8 py-10 pb-20">
        <section className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
          <div className="grid gap-6 lg:grid-cols-[220px_1fr_240px] lg:items-center">
            <div className="h-52 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
              {primaryImage ? (
                <img src={primaryImage} alt="Custom design preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-slate-300" />
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-black tracking-tight text-slate-950">{design.designTitle || "Custom Design Request"}</h2>
                <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${statusClass(design.status)}`}>
                  {prettyStatus(design.status)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-slate-600">
                  {isGroup ? "Group Request" : "Individual Request"}
                </span>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailTile label="Customer" value={design.customerName || design.userEmail} icon={UserRound} />
                <DetailTile label="Email" value={design.userEmail} icon={Mail} />
                <DetailTile label="Phone" value={design.contactPhone} icon={Phone} />
                <DetailTile label="Submitted" value={formatDate(design.submittedAt || design.createdAt)} icon={CalendarDays} />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {canReview ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModal("approve")}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-black text-white shadow-lg hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal("decline")}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black text-white shadow-lg hover:bg-rose-700"
                  >
                    <XCircle className="h-4 w-4" />
                    Decline
                  </button>
                </>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">
                  This request has already been reviewed.
                </div>
              )}
              {design.approvedCartItemId ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
                  Added to customer cart.
                </div>
              ) : null}
              {canDeleteDesign && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleDeleteDesign}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-50 text-sm font-black text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Request
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">Design Assets</p>
                <h3 className="text-2xl font-black text-slate-950">Custom Design Images</h3>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{images.length} files</span>
            </div>

            {images.length ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {images.map((image) => (
                  <a key={image.label} href={image.url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={image.url} alt={image.label} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    </div>
                    <div className="flex items-center justify-between bg-white px-4 py-3">
                      <span className="text-sm font-black text-slate-900">{image.label}</span>
                      <ImageIcon className="h-4 w-4 text-slate-400" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <ImageIcon className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-black text-slate-500">No design images uploaded.</p>
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Request Record</p>
              <h3 className="text-2xl font-black text-slate-950">Audit Context</h3>
            </div>

            <div className="space-y-4">
              <DetailTile label="Submission Number" value={design.submissionNumber} icon={ClipboardList} />
              <DetailTile label="Child Age" value={design.childAge} icon={UserRound} />
              <DetailTile label="Fabric Preference" value={design.fabricType} icon={Sparkles} />
              <DetailTile label="Embroidery Style" value={design.embroideryStyle} icon={Palette} />
              <DetailTile label="Color Preference" value={design.colorPreference} icon={Palette} />
              <DetailTile label="Address" value={addressText(design.contactAddress)} icon={FileText} />
              <DetailTile label="Measurements" value={design.measurementSnapshot && Object.keys(design.measurementSnapshot).length ? "Measurements received" : "No measurement snapshot"} icon={Ruler} />
              <DetailTile label="Reviewed By" value={design.reviewedBy} icon={UserRound} />
              <DetailTile label="Reviewed At" value={formatDate(design.reviewedAt)} icon={Clock3} />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Customer Design Context</p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-800">
                {design.inspirationNote || "No customer design context was provided."}
              </p>
            </div>

            {design.reviewReason ? (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-500">Review Note</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-blue-950">{design.reviewReason}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      {modal ? (
        <ReviewModal
          mode={modal}
          design={design}
          onClose={() => setModal(null)}
          onDone={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}
