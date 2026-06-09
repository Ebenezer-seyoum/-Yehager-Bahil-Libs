"use client";

import Link from "next/link";
import { useState } from "react";
import type { ComponentType, PropsWithChildren } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, Clock3, CreditCard, Eye, FileText, Images, Loader2, Package, Palette, Ruler, Scissors, Truck, UserRound, XCircle, ChevronRight, ExternalLink } from "lucide-react";
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
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-900">{display(value)}</p>
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
  const [section, setSection] = useState<"info" | "customer" | "measurements" | "payment" | "production" | "shipping" | "timeline" | "attachments">("info");
  const [activeMemberIdx, setActiveMemberIdx] = useState<number>(0);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);

  const isGroup = !!((design as any).familyGroupId || (design as any).eventId);
  const canReview = ["submitted", "in_review"].includes(String(design.status ?? "submitted"));

  if (decision) {
    return <DecisionDialog design={design} decision={decision} onClose={() => setDecision(null)} onCompleted={onClose} />;
  }

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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <TypedDialogContent className="max-w-7xl p-0 border-none overflow-hidden rounded-3xl !outline-none shadow-2xl">
        <div className="bg-[#0f172a] px-10 py-8 pr-16 text-white relative border-b border-white/10">
          <TypedDialogTitle className="text-4xl font-black text-white leading-tight tracking-tight uppercase">Custom Design Workspace</TypedDialogTitle>
          <p className="mt-2 text-base text-slate-400 font-medium max-w-2xl">Manage custom creation requests, technical specifications, and client communication.</p>
          <button onClick={onClose} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-all transform hover:rotate-90 hover:scale-110">
            <XCircle className="h-8 w-8" />
          </button>
        </div>

        <div className="max-h-[85vh] overflow-y-auto bg-[#f8fafc]">
          <div className="p-10 pb-16">
            <div className="mb-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl flex flex-col lg:flex-row items-center gap-10 ring-1 ring-black/[0.02]">
              <div className="h-40 w-40 shrink-0 overflow-hidden rounded-[2.5rem] border-4 border-slate-50 shadow-2xl bg-[#0f172a] flex items-center justify-center relative">
                 <img src={design.frontImageUrl || design.sideImageUrl || ""} alt="Design preview" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-4">
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">{design.designTitle || "CUSTOM DESIGN"}</h2>
                   <div className="bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                     <span className="text-xs font-black text-slate-500 uppercase tracking-widest">SUB #</span>
                     <span className="text-xs font-black text-slate-900">{design.submissionNumber || design.id.slice(0,10)}</span>
                   </div>
                </div>
                
                <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-6">
                  <span className={`inline-flex rounded-xl border-2 px-4 py-1 text-xs font-black uppercase tracking-wider shadow-sm ${
                    String(design.status) === "rejected" ? "border-rose-200 bg-rose-50 text-rose-600" :
                    String(design.status) === "completed_request" ? "border-emerald-200 bg-emerald-50 text-emerald-600" :
                    "border-blue-200 bg-blue-50 text-blue-600"
                  }`}>{prettyStatus(design.status)}</span>
                  <span className="inline-flex rounded-xl border-2 border-slate-100 bg-slate-50 px-4 py-1 text-xs font-black uppercase tracking-wider text-slate-500 shadow-sm">
                    { isGroup ? "Group Custom Design" : "Individual Custom Design" }
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
              <div className="min-w-[240px] flex flex-col gap-3">
                 {canReview && (
                   <>
                    <button onClick={() => setDecision("approve")} className="h-14 w-full rounded-2xl bg-blue-600 text-sm font-black text-white hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-5 w-5" /> ISSUE QUOTE
                    </button>
                    <button onClick={() => setDecision("reject")} className="h-14 w-full rounded-2xl bg-slate-900 text-sm font-black text-white hover:bg-black shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                      <XCircle className="h-5 w-5" /> DECLINE REQUEST
                    </button>
                   </>
                 )}
                 {!canReview && (
                   <div className="h-14 w-full rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-400 border border-slate-200">
                     DECISION RECORDED
                   </div>
                 )}
              </div>
            </div>

            <div className="grid gap-10 lg:grid-cols-[340px_1fr]">
              <aside className="space-y-6 shrink-0">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sticky top-6">
                  <p className="mb-6 px-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100 pb-4">Workspace Sections</p>
                  <nav className="space-y-3">
                    {sections.map((item) => {
                      const Icon = item.icon;
                      const isActive = section === item.id;
                      return (
                        <button key={item.id} type="button" onClick={() => setSection(item.id)} className={`flex w-full items-center gap-5 rounded-[1.25rem] px-5 py-4 text-left transition-all group ${isActive ? "bg-[#0f172a] text-white shadow-xl scale-[1.02]" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>
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
                   <div className="flex items-center gap-4 mb-10 relative z-10">
                      <div className="h-2 w-12 bg-blue-600 rounded-full" />
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{sections.find(s => s.id === section)?.label}</h3>
                   </div>

                   <div className="relative z-10">
                      {section === "info" && (
                         <div className="space-y-10">
                            <div className="grid gap-6 sm:grid-cols-2">
                               <Field label="Submission Number" value={design.submissionNumber} />
                               <Field label="Design Category" value={isGroup ? "Group Custom" : "Individual Custom"} />
                               <Field label="Submission Date" value={(design.submittedAt || design.createdAt) ? new Date(String(design.submittedAt ?? design.createdAt)).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"} />
                               <Field label="Fabric Preference" value={design.fabricType} />
                               <Field label="Embroidery Preference" value={design.embroideryStyle} />
                               <Field label="Color Preference" value={design.colorPreference} />
                            </div>
                            <div className="sm:col-span-2">
                               <div className="rounded-[1.5rem] border border-slate-100 bg-[#f8fafc] p-8 shadow-inner">
                                  <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 mb-2">Technical Inspiration Notes</p>
                                  <p className="text-base font-bold text-slate-800 leading-relaxed italic">"{design.inspirationNote || "No specific inspiration notes provided by customer."}"</p>
                               </div>
                            </div>

                            {/* Image Grid in Info Section */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
                               {[
                                 ["Front View", design.frontImageUrl],
                                 ["Side View", design.sideImageUrl],
                                 ["Back View", design.backImageUrl],
                                 ["Detail View", design.detailImageUrl],
                               ].filter((i): i is [string, string] => Boolean(i[1])).map(([label, url]: [string, string]) => (
                                 <a key={label} href={url} target="_blank" rel="noreferrer" className="group rounded-[1.5rem] overflow-hidden border-4 border-slate-50 shadow-lg relative aspect-square bg-[#0f172a]">
                                    <img src={url} alt={label} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
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
                                        {design.contactAddress ? (typeof design.contactAddress === 'object' ? JSON.stringify(design.contactAddress) : design.contactAddress) : "No address provided."}
                                     </p>
                                  </div>
                               </div>
                            </div>
                         </div>
                      )}

                      {section === "measurements" && (
                         <div className="space-y-10">
                            { isGroup && (design as any).members?.length > 0 ? (
                               <div className="space-y-8">
                                  <div className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 -mx-2 px-2 scrollbar-hide">
                                     {(design as any).members.map((member: any, idx: number) => (
                                        <button 
                                           key={idx} 
                                           onClick={() => setActiveMemberIdx(idx)}
                                           className={`flex flex-col items-center gap-3 shrink-0 p-4 rounded-[1.5rem] transition-all min-w-[120px] ${activeMemberIdx === idx ? 'bg-[#0f172a] text-white shadow-2xl scale-110 relative z-10' : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                                        >
                                           <div className={`h-14 w-14 rounded-2xl flex items-center justify-center font-black text-lg ${activeMemberIdx === idx ? 'bg-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                              {member.name?.charAt(0) || idx + 1}
                                           </div>
                                           <span className="text-xs font-black uppercase tracking-tight truncate w-full text-center">{member.name || `Member ${idx+1}`}</span>
                                        </button>
                                     ))}
                                  </div>

                                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                     <div className="overflow-hidden rounded-[2rem] border-2 border-slate-100 bg-white shadow-2xl">
                                        <div className="bg-[#0f172a] px-8 py-4 flex items-center justify-between text-white">
                                           <span className="text-sm font-black uppercase tracking-widest text-blue-400">Snapshot: {(design as any).members[activeMemberIdx]?.name}</span>
                                           <Ruler className="h-5 w-5 text-slate-600" />
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 p-10">
                                           {Object.entries((design as any).members[activeMemberIdx]?.measurements || {}).map(([key, val]) => (
                                              <div key={key} className="relative">
                                                 <p className="text-[10px] font-black uppercase text-slate-400 leading-tight mb-1.5 tracking-tighter">{key.replaceAll("_", " ")}</p>
                                                 <p className="text-lg font-black text-slate-900 flex items-baseline gap-1">
                                                    {String(val)} <span className="text-[10px] font-bold text-slate-300">cm</span>
                                                 </p>
                                                 <div className="absolute -left-3 top-2 bottom-0 w-[2px] bg-blue-500/10 rounded-full" />
                                              </div>
                                           ))}
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            ) : design.measurementSnapshot && Object.keys(design.measurementSnapshot).length > 0 ? (
                               <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 p-12 rounded-[2.5rem] border-2 border-slate-100 bg-white shadow-xl">
                                  {Object.entries(design.measurementSnapshot).map(([key, val]) => (
                                     <div key={key} className="group relative">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">{key.replaceAll("_", " ")}</p>
                                        <p className="text-xl font-black text-slate-900 tabular-nums">{String(val)} <span className="text-[10px] text-slate-300 ml-0.5 font-bold">cm</span></p>
                                        <div className="absolute -left-3 top-1.5 bottom-0 w-[2px] bg-slate-100 group-hover:bg-blue-500 transition-colors rounded-full" />
                                     </div>
                                  ))}
                               </div>
                            ) : (
                               <div className="py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                  <Ruler className="h-16 w-16 text-slate-200 mx-auto mb-6" />
                                  <p className="text-lg font-black text-slate-400 uppercase tracking-widest">No Technical Sizing Data</p>
                                  <p className="text-sm font-bold text-slate-400 mt-2">Measurements were not provided with this custom request.</p>
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
                                     <p className="text-3xl font-black uppercase text-blue-300 italic tracking-tighter">{(design as any).paymentStatus || "Awaiting Quote"}</p>
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
                               Custom creation and material procurement tracking occurs in this section once the order transitions to tailoring.
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
                               <div className="absolute left-[31px] top-6 bottom-6 w-1bg-slate-100 rounded-full" />
                               <div className="space-y-12">
                                  {timelineStages.map((stage, idx) => {
                                     const currentStatusIdx = timelineStages.findIndex(s => s.status === design.status);
                                     const isCompleted = idx <= (currentStatusIdx === -1 ? 0 : currentStatusIdx);
                                     return (
                                        <div key={idx} className="relative flex items-center gap-8 group">
                                           <div className={`h-16 w-16 rounded-[1.25rem] border-4 flex items-center justify-center relative z-10 transition-all duration-700 shadow-xl ${isCompleted ? 'bg-blue-600 border-blue-100 text-white' : 'bg-white border-slate-50 text-slate-200'}`}>
                                              {isCompleted ? <CheckCircle2 className="h-7 w-7" /> : <div className="h-2 w-2 rounded-full bg-slate-200" />}
                                           </div>
                                           <div className="flex flex-col">
                                              <span className={`text-xl font-black uppercase tracking-tight ${isCompleted ? 'text-[#0f172a]' : 'text-slate-200'}`}>{stage.label}</span>
                                              <span className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{isCompleted ? 'Validated' : 'Pending Lifecycle Event'}</span>
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
                              { label: "Original References", icon: Images, count: (design.frontImageUrl?1:0)+(design.sideImageUrl?1:0)+(design.backImageUrl?1:0)+(design.detailImageUrl?1:0) },
                              { label: "Technical Sheet", icon: Ruler, count: design.measurementSnapshot && Object.keys(design.measurementSnapshot).length > 0 ? 1 : 0 },
                              { label: "Quote Document", icon: FileText, count: design.quotedPriceUsd ? 1 : 0 },
                              { label: "Initial Invoice", icon: CreditCard, count: 0 },
                              { label: "System Audit", icon: ClipboardList, count: 1 }
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
