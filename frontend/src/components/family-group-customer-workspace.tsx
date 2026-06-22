"use client";

import Link from "next/link";
import { ChevronRight, Pencil, Plus, ShoppingCart, Trash2, UserRound, Users, X } from "lucide-react";
import { useState } from "react";
import { HEM_STYLE_OPTIONS, PANTS_MEASUREMENT_FIELDS, PRESSING_STYLE_OPTIONS, TOP_MEASUREMENT_FIELDS, TOP_MEASUREMENT_TITLE, PANTS_MEASUREMENT_TITLE } from "@/lib/measurement-fields";

type Member = {
  id: string;
  name?: string | null;
  relation?: string | null;
  gender?: string | null;
  measurements?: Record<string, unknown> | null;
};

type Group = {
  groupName?: string | null;
  eventName?: string | null;
  productName?: string | null;
  productImage?: string | null;
  selectionType?: string | null;
};
type SelectedDesign = {
  status?: string | null;
  submissionNumber?: string | null;
  quotedPriceUsd?: number | string | null;
  estimatedDeliveryLabel?: string | null;
};

type Measurement = { id: string; label?: string | null };

export function FamilyGroupCustomerWorkspace({
  groupId,
  group,
  members,
  selectedDesign,
  selectionResult,
  savedMeasurements,
  readyMembers,
  canAddAllToCart,
  addMember,
  renameGroup,
  removeMember,
  addAllToCart,
}: {
  groupId: string;
  group: Group;
  members: Member[];
  selectedDesign?: SelectedDesign | null;
  selectionResult?: string | null;
  savedMeasurements: Measurement[];
  readyMembers: number;
  canAddAllToCart: boolean;
  addMember: (formData: FormData) => Promise<void>;
  renameGroup: (formData: FormData) => Promise<void>;
  removeMember: (formData: FormData) => Promise<void>;
  addAllToCart: () => Promise<void>;
}) {
  const [memberOpen, setMemberOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [gender, setGender] = useState("male");
  const [relation, setRelation] = useState("Myself");
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string>("");
  const [hemStyle, setHemStyle] = useState("Straight");
  const [pressingStyle, setPressingStyle] = useState("Creased");
  const hasSource = Boolean(group.productName);
  const customReady = group.selectionType !== "custom_design" || selectedDesign?.status === "awaiting_payment";

  function closeMember() {
    setMemberOpen(false);
    setStep(1);
    setSelectedMeasurementId("");
    setHemStyle("Straight");
    setPressingStyle("Creased");
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Link href="/events" className="hover:text-primary">Events</Link>
        <ChevronRight className="h-4 w-4" />
        <span>Family Group</span>
      </div>

      <section className="rounded-3xl bg-[#f4f4f4] px-8 py-10 text-black sm:px-12">
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Family Group</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <h1 className="font-heading text-4xl font-bold sm:text-6xl">{group.groupName}</h1>
          <Pencil className="h-5 w-5 text-black/30" />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-8 text-base text-slate-600">
          <span className="inline-flex items-center gap-2"><Users className="h-5 w-5" /> {members.length} members</span>
          <span>Event: {group.eventName || "Private group order"}</span>
        </div>
        <form action={renameGroup} className="mt-6 flex max-w-xl gap-2">
          <input name="groupName" defaultValue={group.groupName ?? ""} className="h-10 flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm" />
          <button className="h-10 rounded-lg bg-black px-4 text-sm font-semibold text-white">Rename</button>
        </form>
      </section>

      <section id="shared-outfit" className="scroll-mt-24 rounded-3xl border border-border bg-card p-6">
        {selectionResult ? (
          <div className="mb-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400">
            {selectionResult === "custom-design" ? "Custom design submitted successfully." : "Catalog product selected successfully."}
          </div>
        ) : null}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Shared Outfit</p>
            <h2 className="mt-2 font-heading text-3xl font-bold">{group.productName || "Choose one outfit for the group"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {group.selectionType === "custom_design"
                ? selectedDesign?.status === "awaiting_payment" ? "Custom design approved and ready for payment." : "Custom design selected and awaiting admin review and price quote."
                : hasSource ? "Catalog product selected successfully. This outfit applies to every family member." : "Select a catalog outfit or upload your own design."}
            </p>
            {hasSource ? (
              <span className="mt-4 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                {group.selectionType === "custom_design" ? "Custom Design Submitted Successfully" : "Catalog Product Selected Successfully"}
              </span>
            ) : null}
            {selectedDesign ? (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-3 py-1 font-semibold ${customReady ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                  {customReady ? "Ready for Payment" : "Awaiting Design Review"}
                </span>
                {selectedDesign.submissionNumber ? <span className="rounded-full bg-secondary px-3 py-1">{selectedDesign.submissionNumber}</span> : null}
                {selectedDesign.quotedPriceUsd ? <span className="rounded-full bg-secondary px-3 py-1">${Number(selectedDesign.quotedPriceUsd).toFixed(2)} per member</span> : null}
                {selectedDesign.estimatedDeliveryLabel ? <span className="rounded-full bg-secondary px-3 py-1">{selectedDesign.estimatedDeliveryLabel}</span> : null}
              </div>
            ) : null}
          </div>
          {group.productImage ? <img src={group.productImage} alt="" className="h-28 w-24 rounded-xl object-cover" /> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href={`/catalog?selectionMode=group&groupId=${groupId}`} className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-black">Select Catalog Outfit</Link>
          <Link href={`/upload-your-design?groupId=${groupId}`} className="inline-flex h-10 items-center rounded-lg border border-primary px-5 text-sm font-semibold text-primary hover:bg-primary/10">Upload Your Design</Link>
        </div>
      </section>

      <section id="members" className="scroll-mt-24 rounded-3xl border border-primary/40 bg-primary/10 p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">{hasSource ? "Shared outfit selected. Add your members next." : "Select an outfit before adding members"}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              Add each family member with their name and measurements. Everyone gets their own outfit, and you checkout all at once in a single order.
            </p>
          </div>
          <button disabled={!hasSource} onClick={() => setMemberOpen(true)} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-semibold text-black hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="h-5 w-5" /> Add Member
          </button>
        </div>
      </section>

      {members.length === 0 ? (
        <section className="grid min-h-96 place-items-center rounded-3xl border-2 border-dashed border-border px-6 text-center">
          <div>
            <Users className="mx-auto h-16 w-16 text-primary/50" />
            <h2 className="mt-5 font-heading text-3xl font-bold">Start with yourself, then add your family</h2>
            <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-muted-foreground">Add each person with their measurements so every outfit fits perfectly.</p>
            <button disabled={!hasSource} onClick={() => setMemberOpen(true)} className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-7 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">
              <Plus className="h-5 w-5" /> Add Your First Member
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          {members.map((member) => {
            const measurementCount = Object.values(member.measurements ?? {}).filter((value) => value !== null && value !== undefined && value !== "").length;
            return (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 font-bold text-primary">{String(member.name ?? "?").charAt(0).toUpperCase()}</div>
                  <div>
                    <p className="font-semibold">{member.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{member.relation || "Member"} · {member.gender} · {measurementCount} measurements</p>
                  </div>
                </div>
                <form action={removeMember}>
                  <input type="hidden" name="memberId" value={member.id} />
                  <button className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-destructive" aria-label="Remove member"><Trash2 className="h-5 w-5" /></button>
                </form>
              </div>
            );
          })}
          <button disabled={!hasSource} onClick={() => setMemberOpen(true)} className="flex h-20 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/60 bg-primary/5 font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40">
            <Plus className="h-5 w-5" /> Add Another Family Member
          </button>
        </section>
      )}

      <section id="checkout" className="scroll-mt-24 rounded-3xl border border-border bg-card p-7">
        <h2 className="font-heading text-2xl font-bold">{readyMembers} Member{readyMembers === 1 ? "" : "s"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{customReady ? "Ready to checkout together" : "Checkout unlocks after the custom design is approved and priced"}</p>
        <form action={addAllToCart} className="mt-6">
          <button disabled={!canAddAllToCart} className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-primary text-lg font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">
            <ShoppingCart className="h-5 w-5" /> Add All to Cart & Checkout
          </button>
        </form>
      </section>

      {memberOpen ? (
        <div className="fixed inset-0 z-[150] grid place-items-center bg-black/85 p-4 backdrop-blur-sm" onClick={(event) => event.target === event.currentTarget && closeMember()}>
          <form action={addMember} className="max-h-[calc(100dvh-40px)] w-full max-w-[768px] overflow-y-auto rounded-3xl border border-border bg-card shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-7 py-5">
              <h2 className="flex items-center gap-3 font-heading text-2xl font-bold"><UserRound className="h-5 w-5 text-primary" /> Add Family Member</h2>
              <button type="button" onClick={closeMember} className="rounded-lg p-2 hover:bg-secondary"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-7 pt-6">
              <div className="grid grid-cols-2 gap-3">
                <div className={`h-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-secondary"}`} />
                <div className={`h-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-secondary"}`} />
              </div>
            </div>

            <div className={step === 1 ? "space-y-5 p-7 pt-6" : "hidden"}>
              <label className="block text-sm font-semibold">Full Name <span className="text-primary">*</span>
                <input name="name" required placeholder="e.g. Abebe Kebede" className="mt-2 h-12 w-full rounded-xl border border-input bg-black px-4 text-base outline-none focus:border-primary" />
              </label>
              <div>
                <p className="text-sm font-semibold">Gender <span className="text-primary">*</span></p>
                <input type="hidden" name="gender" value={gender} />
                <div className="mt-3 grid grid-cols-2 gap-4">
                  {["male", "female"].map((value) => <button key={value} type="button" onClick={() => setGender(value)} className={`h-14 rounded-xl border-2 text-base font-semibold capitalize ${gender === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{value === "male" ? "👔 Male" : "👗 Female"}</button>)}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Relation <span className="text-primary">*</span></p>
                <input type="hidden" name="relation" value={relation} />
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {["Myself", "Husband", "Wife", "Son", "Daughter", "Other"].map((value) => <button key={value} type="button" onClick={() => setRelation(value)} className={`h-12 rounded-xl border-2 font-semibold ${relation === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{value}</button>)}
                </div>
              </div>
              <button type="button" onClick={() => {
                if (relation === "Myself" && savedMeasurements.length > 0) {
                  setSelectedMeasurementId(savedMeasurements[0].id);
                } else {
                  setSelectedMeasurementId("");
                }
                setStep(2);
              }} className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-black">Continue to Measurements →</button>
            </div>

            <div className={step === 2 ? "space-y-5 p-7 pt-6" : "hidden"}>
              {savedMeasurements.length ? (
                <label className="block text-sm font-semibold">Use saved measurements
                  <select 
                    name="measurementId" 
                    value={selectedMeasurementId}
                    onChange={(e) => setSelectedMeasurementId(e.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-input bg-black px-4"
                  >
                    <option value="">Enter new manual measurements</option>
                    {savedMeasurements.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                  </select>
                </label>
              ) : null}
              {selectedMeasurementId ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm font-bold text-emerald-400">
                  Using your exact predefined profile sizing.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                    <h3 className="font-heading text-lg font-bold text-primary">{TOP_MEASUREMENT_TITLE}</h3>
                    <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                      {TOP_MEASUREMENT_FIELDS.map((field) => (
                        <label key={field.key} className="text-sm font-semibold">{field.label}{field.required !== false ? <span className="text-primary">*</span> : null}
                          <input name={field.key} type="number" step="0.1" min="0" placeholder="0.0" className="mt-2 h-12 w-full rounded-xl border border-input bg-black px-4 text-lg text-blue-200 outline-none focus:border-primary" />
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">{field.hint}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-secondary/30 p-5">
                    <h3 className="font-heading text-lg font-bold text-primary">{PANTS_MEASUREMENT_TITLE}</h3>
                    <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                      {PANTS_MEASUREMENT_FIELDS.map((field) => (
                        <label key={field.key} className="text-sm font-semibold">{field.label}{field.required !== false ? <span className="text-primary">*</span> : null}
                          <input name={field.key} type="number" step="0.1" min="0" placeholder="0.0" className="mt-2 h-12 w-full rounded-xl border border-input bg-black px-4 text-lg text-blue-200 outline-none focus:border-primary" />
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">{field.hint}</span>
                        </label>
                      ))}
                    </div>
                    <input type="hidden" name="hemStyle" value={hemStyle} />
                    <input type="hidden" name="pressingStyle" value={pressingStyle} />
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-sm font-semibold">Hem Style <span className="text-primary">*</span></p>
                        <div className="mt-3 grid gap-3">
                          {HEM_STYLE_OPTIONS.map((option) => (
                            <button key={option.value} type="button" onClick={() => setHemStyle(option.value)} className={`rounded-xl border-2 p-4 text-left ${hemStyle === option.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                              <span className="block font-bold">{option.title}</span>
                              <span className="mt-1 block text-xs">{option.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Pressing (Iron) Style <span className="text-primary">*</span></p>
                        <div className="mt-3 grid gap-3">
                          {PRESSING_STYLE_OPTIONS.map((option) => (
                            <button key={option.value} type="button" onClick={() => setPressingStyle(option.value)} className={`rounded-xl border-2 p-4 text-left ${pressingStyle === option.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                              <span className="block font-bold">{option.title}</span>
                              <span className="mt-1 block text-xs">{option.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setStep(1)} className="h-12 rounded-xl border border-border font-semibold">← Back</button>
                <button type="submit" className="h-12 rounded-xl bg-primary text-base font-semibold text-black">Add to Family Group ✓</button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
