"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  CreditCard,
  Eye,
  ExternalLink,
  FileText,
  Images,
  Package,
  Palette,
  Ruler,
  Scissors,
  Truck,
  UserRound,
  XCircle,
} from "lucide-react";

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
  members?: any[] | null;
};

function prettyStatus(v?: string | null) {
  return (v ?? "submitted").replaceAll("_", " ");
}

function Field({ label, value }: { label: string; value: unknown }) {
  const display = (v: any) => {
    if (v == null || String(v).trim() === "") return "Not provided";
    return String(v);
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{display(value)}</p>
    </div>
  );
}

export function UploadedDesignDetailPage({
  initialDesign,
  backUrl = "/admin/uploaded-designs",
}: {
  initialDesign: UploadedDesignDetailData;
  backUrl?: string;
}) {
  const router = useRouter();
  const design = initialDesign;
  const [section, setSection] = useState<"info" | "customer" | "measurements" | "payment" | "production" | "shipping" | "timeline" | "attachments">("info");
  const [activeMemberIdx, setActiveMemberIdx] = useState<number>(0);

  const isGroup = !!(design.familyGroupId || design.eventId);
  const canReview = ["submitted", "in_review"].includes(String(design.status ?? "submitted"));

  const sections = [
    { id: "info", label: "Order Information", hint: "Core metadata", icon: Palette },
    { id: "customer", label: "Customer Detail", hint: "Contact & address", icon: UserRound },
    { id: "measurements", label: "Measurement Details", hint: "Sizing data", icon: Ruler },
    { id: "payment", label: "Payment Information", hint: "Transaction detail", icon: CreditCard },
    { id: "production", label: "Production Tracking", hint: "Workflow status", icon: Package },
    { id: "shipping", label: "Shipping Information", hint: "Carrier & tracking", icon: Truck },
    { id: "timeline", label: "Order Timeline", hint: "Lifecycle stages", icon: ClipboardList },
    { id: "attachments", label: "Document Attachments", hint: "Images & files", icon: Eye },
  ] as const;

  const timelineStages = [
    { label: "Request Submitted", status: "submitted" },
    { label: "Admin Review", status: "in_review" },
    { label: "Quote Issued", status: "approved" },
    { label: "Payment Received", status: "paid" },
    { label: "Production Started", status: "tailoring" },
    { label: "Shipped/Ready", status: "shipped" },
  ];

  const handleApprove = () => router.push(`/admin/uploaded-designs/${design.id}?action=approve`);
  const handleDecline = () => router.push(`/admin/uploaded-designs/${design.id}?action=reject`);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Page Header */}
      <div className="bg-[#0f172a] border-b border-white/10">
        <div className="mx-auto max-w-[1600px] px-8 py-6 flex items-center gap-6">
          <button
            onClick={() => router.push(backUrl)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-all group shrink-0"
          >
            <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-all">
              <ArrowLeft className="h-5 w-5" />
            </div>
            <span className="text-sm font-black uppercase tracking-widest hidden sm:block">Back to Designs</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-black text-white tracking-tight uppercase truncate">Custom Design Workspace</h1>
            <p className="text-sm text-slate-400 font-medium mt-1">Manage custom creation requests, technical specifications, and client communication.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {canReview && (
              <>
                <button
                  onClick={handleApprove}
                  className="h-11 px-6 rounded-2xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700 shadow-lg transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" /> Issue Quote
                </button>
                <button
                  onClick={handleDecline}
                  className="h-11 px-6 rounded-2xl bg-slate-700 text-sm font-black text-white hover:bg-slate-800 shadow-lg transition-all flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" /> Decline
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-8 py-10 pb-20">
        {/* Identity Block */}
        <div className="mb-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl flex flex-col lg:flex-row items-center gap-10 ring-1 ring-black/[0.02]">
          <div className="h-40 w-40 shrink-0 overflow-hidden rounded-[2.5rem] border-4 border-slate-50 shadow-2xl bg-[#0f172a] flex items-center justify-center relative">
            <img src={design.frontImageUrl || design.sideImageUrl || ""} alt="Design preview" className="h-full w-full object-cover" />
          </div>
          <div className="flex-1 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{design.designTitle || "CUSTOM DESIGN"}</h2>
              <div className="bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">SUB #</span>
                <span className="text-xs font-black text-slate-900">{design.submissionNumber || design.id.slice(0, 10)}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-6">
              <span className={`inline-flex rounded-xl border-2 px-4 py-1 text-xs font-black uppercase tracking-wider shadow-sm ${
                String(design.status) === "rejected" ? "border-rose-200 bg-rose-50 text-rose-600" :
                String(design.status) === "completed_request" ? "border-emerald-200 bg-emerald-50 text-emerald-600" :
                "border-blue-200 bg-blue-50 text-blue-600"
              }`}>{prettyStatus(design.status)}</span>
              <span className="inline-flex rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-1 text-xs font-black uppercase tracking-wider text-slate-500 shadow-sm">
                {isGroup ? "Group Custom Design" : "Individual Custom Design"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[1.5rem] border-2 border-slate-100">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] pl-1">Request Lifecycle</span>
                <div className="h-12 w-full rounded-2xl border-2 border-blue-100 bg-white px-4 flex items-center text-sm font-black text-blue-800">
                  {prettyStatus(design.status)}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] pl-1">Quoted Value</span>
                <div className="h-12 w-full rounded-2xl border-2 border-emerald-100 bg-white px-4 flex items-center text-sm font-black text-emerald-800 shadow-sm">
                  {design.quotedPriceUsd ? `$${Number(design.quotedPriceUsd).toFixed(2)}` : "Pending Quote"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar + Main */}
        <div className="grid gap-10 lg:grid-cols-[340px_1fr]">
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

          <main className="min-h-[800px]">
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-12 shadow-2xl relative overflow-hidden ring-1 ring-black/[0.02]">
              <div className="flex items-center gap-4 mb-10">
                <div className="h-2 w-12 bg-blue-600 rounded-full" />
                <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{sections.find((s) => s.id === section)?.label}</h3>
              </div>

              {section === "info" && (
                <div className="space-y-10">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field label="Submission Number" value={design.submissionNumber} />
                    <Field label="Design Category" value={isGroup ? "Group Custom" : "Individual Custom"} />
                    <Field label="Submission Date" value={(design.submittedAt || design.createdAt) ? new Date(String(design.submittedAt ?? design.createdAt)).toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "N/A"} />
                    <Field label="Fabric Preference" value={design.fabricType} />
                    <Field label="Embroidery Preference" value={design.embroideryStyle} />
                    <Field label="Color Preference" value={design.colorPreference} />
                  </div>
                  <div className="rounded-[1.5rem] border border-slate-100 bg-[#f8fafc] p-8 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2">Technical Inspiration Notes</p>
                    <p className="text-base font-bold text-slate-800 leading-relaxed italic">"{design.inspirationNote || "No specific inspiration notes provided."}"</p>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
                    {[
                      ["Front View", design.frontImageUrl],
                      ["Side View", design.sideImageUrl],
                      ["Back View", design.backImageUrl],
                      ["Detail View", design.detailImageUrl],
                    ].filter((i) => i[1]).map(([label, url]) => (
                      <a key={label} href={url || ""} target="_blank" rel="noreferrer" className="group rounded-[1.5rem] overflow-hidden border-4 border-slate-50 shadow-lg relative aspect-square bg-[#0f172a]">
                        <img src={url || ""} alt={label} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-center">
                          <span className="text-[10px] font-black text-white uppercase tracking-widest">{label}</span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600/20">
                          <ExternalLink className="text-white h-8 w-8" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {section === "customer" && (
                <div className="space-y-10">
                  <div className="flex items-center gap-8 p-10 rounded-[2.5rem] bg-[#f8fafc] border border-slate-100 shadow-inner">
                    <div className="h-24 w-24 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-2xl rotate-3">
                      <UserRound className="h-12 w-12" />
                    </div>
                    <div>
                      <h4 className="text-3xl font-black text-slate-900 tracking-tight">{design.customerName || "Anonymous Sender"}</h4>
                      <p className="text-lg font-bold text-slate-500 mt-1">{design.userEmail}</p>
                    </div>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field label="Phone Connection" value={design.contactPhone || "Not Provided"} />
                    <Field label="Telegram / Social" value={design.contactTelegram || "Not Provided"} />
                    <div className="sm:col-span-2">
                      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-lg">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                          <Truck className="h-3 w-3" /> Delivery Address Details
                        </p>
                        <p className="text-base font-bold text-slate-800 leading-relaxed">
                          {design.contactAddress ? (typeof design.contactAddress === "object" ? JSON.stringify(design.contactAddress) : String(design.contactAddress)) : "No address provided."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {section === "measurements" && (
                <div className="space-y-10">
                  {isGroup && (design.members ?? []).length > 0 ? (
                    <div className="space-y-8">
                      <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 -mx-2 px-2">
                        {(design.members ?? []).map((member: any, idx: number) => (
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
                          <span className="text-sm font-black uppercase tracking-widest text-blue-400">Snapshot: {(design.members ?? [])[activeMemberIdx]?.name}</span>
                          <Ruler className="h-5 w-5 text-slate-600" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 p-10">
                          {Object.entries((design.members ?? [])[activeMemberIdx]?.measurements || {}).map(([key, val]) => (
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
                  ) : design.measurementSnapshot && Object.keys(design.measurementSnapshot).length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 p-12 rounded-[2.5rem] border-2 border-slate-100 bg-white shadow-xl">
                      {Object.entries(design.measurementSnapshot).map(([key, val]) => (
                        <div key={key} className="group relative">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">{key.replaceAll("_", " ")}</p>
                          <p className="text-xl font-black text-slate-900 tabular-nums">{String(val)} <span className="text-[10px] text-slate-300 ml-0.5 font-bold">cm</span></p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                      <Ruler className="h-16 w-16 text-slate-200 mx-auto mb-6" />
                      <p className="text-lg font-black text-slate-400 uppercase tracking-widest">No Technical Sizing Data</p>
                    </div>
                  )}
                </div>
              )}

              {section === "payment" && (
                <div className="space-y-10">
                  <div className="p-10 rounded-[2.5rem] bg-[#0f172a] text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <CreditCard className="h-32 w-32" />
                    </div>
                    <h4 className="text-sm font-black text-blue-400 uppercase tracking-[0.2em] mb-8">Financial Overview</h4>
                    <div className="grid gap-10 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Quoted Price</p>
                        <p className="text-5xl font-black">{design.quotedPriceUsd ? `$${Number(design.quotedPriceUsd).toFixed(2)}` : "$ ---.--"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase mb-1">Payment Status</p>
                        <p className="text-3xl font-black uppercase text-blue-300 italic tracking-tighter">{design.paymentStatus || "Awaiting Quote"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[1.5rem] bg-amber-50 border border-amber-200 p-6 flex gap-4">
                    <Clock3 className="h-6 w-6 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-black text-amber-900 italic uppercase">Conditional Production</p>
                      <p className="text-xs font-bold text-amber-700 mt-1">Custom designs enter production only after full payment verification of the issued quote.</p>
                    </div>
                  </div>
                </div>
              )}

              {section === "production" && (
                <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center bg-slate-50">
                  <div className="h-24 w-24 rounded-[2rem] bg-white shadow-xl flex items-center justify-center mx-auto mb-8">
                    <Scissors className="h-10 w-10 text-slate-300" />
                  </div>
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-widest">Workflow Initialization</h4>
                  <p className="text-sm font-bold text-slate-500 mt-3 max-w-md mx-auto leading-relaxed">
                    Custom creation and material procurement tracking occurs here once the order transitions to tailoring.
                  </p>
                </div>
              )}

              {section === "shipping" && (
                <div className="rounded-[2.5rem] border border-slate-100 bg-[#f8fafc] p-12 text-center">
                  <Truck className="h-20 w-20 text-slate-200 mx-auto mb-6" />
                  <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">Awaiting Logistics Data</h4>
                  <p className="text-sm font-bold text-slate-400 mt-2">Shipping IDs and carrier tracking will appear here after production completion.</p>
                </div>
              )}

              {section === "timeline" && (
                <div className="space-y-12 pl-4">
                  <div className="relative">
                    <div className="absolute left-[31px] top-6 bottom-6 w-1 bg-slate-100 rounded-full" />
                    <div className="space-y-12">
                      {timelineStages.map((stage, idx) => {
                        const currentStatusIdx = timelineStages.findIndex((s) => s.status === design.status);
                        const isCompleted = idx <= (currentStatusIdx === -1 ? 0 : currentStatusIdx);
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

              {section === "attachments" && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: "Original References", icon: Images, count: (design.frontImageUrl ? 1 : 0) + (design.sideImageUrl ? 1 : 0) + (design.backImageUrl ? 1 : 0) + (design.detailImageUrl ? 1 : 0) },
                    { label: "Technical Sheet", icon: Ruler, count: design.measurementSnapshot && Object.keys(design.measurementSnapshot).length > 0 ? 1 : 0 },
                    { label: "Quote Document", icon: FileText, count: design.quotedPriceUsd ? 1 : 0 },
                    { label: "Initial Invoice", icon: CreditCard, count: 0 },
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
          </main>
        </div>
      </div>
    </div>
  );
}
