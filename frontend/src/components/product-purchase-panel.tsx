"use client";

import Link from "next/link";
import { BookOpen, ChevronDown, Clock, Mail, Pencil, Play, Ruler, ShoppingBag, Users, X, PlusCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { ShareLinks } from "@/components/share-links";
import { MeasurementVideoModal } from "@/components/measurement-help";
import { useToast } from "@/components/ui/use-toast";
import {
  HEM_STYLE_OPTIONS,
  PANTS_MEASUREMENT_FIELDS,
  PANTS_MEASUREMENT_TITLE,
  PRESSING_STYLE_OPTIONS,
  TOP_MEASUREMENT_FIELDS,
  TOP_MEASUREMENT_TITLE,
  measurementDisplayGroups,
} from "@/lib/measurement-fields";

type Role = {
  label: string;
  icon?: string;
  price: number;
  gender: "male" | "female" | "unisex";
};

type ProductPurchasePanelProps = {
  product: {
    id: string;
    name: string;
    description?: string | null;
    region?: string | null;
    subcategory?: string | null;
    gender?: string | null;
    uniqueId?: string | null;
    fabricType?: string | null;
    embroideryStyle?: string | null;
    priceUsd?: number | string | null;
    originalPriceUsd?: number | string | null;
    discount?: { label?: string | null } | null;
  };
  roles: Role[];
  price: number;
  etbRate: number | null;
  measurements: Array<{ id: string; label?: string | null }>;
  latestMeasurement: {
    id: string;
    label?: string | null;
    chest?: number | null;
    waist?: number | null;
    hips?: number | null;
    shoulderWidth?: number | null;
    armLength?: number | null;
    torsoLength?: number | null;
    [key: string]: unknown;
  } | null;
  eventId: string;
  event: { id: string; name: string; ownerName?: string | null } | null;
  isAuthenticated: boolean;
  authRequired: boolean;
  shareUrl: string;
  addToCartAction: (formData: FormData) => void | Promise<void>;
  createMeasurementAction: (formData: FormData) => Promise<{
    id: string;
    label?: string | null;
    chest?: number | null;
    waist?: number | null;
    hips?: number | null;
    shoulderWidth?: number | null;
    armLength?: number | null;
    torsoLength?: number | null;
    [key: string]: unknown;
  } | null | void>;
  createEventAction: (formData: FormData) => void | Promise<void>;
  createGroupAction: (formData: FormData) => void | Promise<void>;
};

type SavedMeasurement = NonNullable<ProductPurchasePanelProps["latestMeasurement"]>;

function formatGender(value?: string | null) {
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  return "Unisex";
}

function inchesToCm(inches?: number | null) {
  const value = Number(inches);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 2.54 * 10) / 10;
}

function MeasurementInput({
  name,
  label,
  hint,
  required = true,
  defaultValue,
}: {
  name?: string;
  label: string;
  hint: string;
  required?: boolean;
  defaultValue?: number | null;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
        {label}{" "}
        {required ? (
          <span className="text-[#f5a623]">*</span>
        ) : (
          <span className="text-[10px] font-normal lowercase italic text-zinc-600">(optional)</span>
        )}
      </span>
      <div className="relative block">
        <input
          {...(name ? { name } : {})}
          type="number"
          min="0.1"
          step="0.1"
          required={required}
          defaultValue={defaultValue ?? ""}
          placeholder="0.0"
          className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 pr-12 text-lg font-medium text-blue-200 outline-none transition-all focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623]/40"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#f5a623]">cm</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{hint}</p>
    </label>
  );
}

function ExtraMeasurementInput({
  label,
  hint,
  required = true,
  name,
  defaultValue,
}: {
  label: string;
  hint: string;
  required?: boolean;
  name?: string;
  defaultValue?: number | null;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-zinc-500">
        {label} {required ? <span className="text-[#f5a623]">*</span> : null}
      </span>
      <div className="relative block">
        <input
          {...(name ? { name } : {})}
          type="number"
          min="0.1"
          step="0.1"
          defaultValue={defaultValue ?? ""}
          placeholder="0.0"
          className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 pr-12 text-lg font-medium text-blue-200 outline-none transition-all focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623]/40"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#f5a623]">cm</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{hint}</p>
    </label>
  );
}

function ChoiceCard({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[110px] rounded-2xl border-2 p-5 text-left transition-all ${
        selected ? "border-[#f5a623] bg-[#f5a623]/10 shadow-[0_0_20px_rgba(245,166,35,0.15)]" : "border-white/5 bg-[#141414] hover:border-white/20"
      }`}
    >
      <span className={`block text-base font-bold ${selected ? "text-[#f5a623]" : "text-white"}`}>{title}</span>
      <span className="mt-2 block text-xs leading-relaxed text-zinc-400">{description}</span>
    </button>
  );
}

export function ProductPurchasePanel({
  product,
  roles,
  price,
  etbRate,
  measurements,
  latestMeasurement,
  eventId,
  event,
  isAuthenticated,
  authRequired,
  shareUrl,
  addToCartAction,
  createMeasurementAction,
  createEventAction,
  createGroupAction,
}: ProductPurchasePanelProps) {
  const { toast } = useToast();
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [eventOpen, setEventOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isMeasurementEditorOpen, setIsMeasurementEditorOpen] = useState(!latestMeasurement?.id);
  const [savedMeasurement, setSavedMeasurement] = useState<SavedMeasurement | null>(latestMeasurement);
  const [hemStyle, setHemStyle] = useState(String((latestMeasurement as any)?.hemStyle || (latestMeasurement as any)?.hem_style || "Straight"));
  const [pressingStyle, setPressingStyle] = useState(String((latestMeasurement as any)?.pressingStyle || (latestMeasurement as any)?.pressing_style || "Creased"));
  const [tailorNote, setTailorNote] = useState("");
  const [isPantsOpen, setIsPantsOpen] = useState(false);

  const selectedRole = roles[selectedRoleIndex] ?? null;
  const displayPrice = Number(selectedRole?.price ?? price);
  const originalPrice = Number(product.originalPriceUsd ?? product.priceUsd ?? displayPrice);
  const hasDiscount = !selectedRole && Boolean(product.discount && originalPrice > displayPrice);
  const measurementGender = selectedRole?.gender ?? product.gender ?? "female";
  const etb = etbRate ? Math.round(displayPrice * etbRate).toLocaleString() : null;
  const signinHref = `/signin?callbackUrl=${encodeURIComponent(`/product/${product.id}`)}`;
  const hasMeasurement = Boolean(savedMeasurement?.id);

  const measurementSummary = useMemo(() => measurementDisplayGroups(savedMeasurement ?? {}).filter((group) => group.title !== "Profile"), [savedMeasurement]);

  const detailItems = useMemo(
    () =>
      [
        product.fabricType ? ["Fabric", product.fabricType] : null,
        product.embroideryStyle ? ["Design name", product.embroideryStyle] : null,
        ["Fit Type", "Traditional Cut"],
        ["Gender", formatGender(product.gender)],
      ].filter(Boolean) as Array<[string, string]>,
    [product.embroideryStyle, product.fabricType, product.gender],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {product.region ? <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{product.region}</span> : null}
        {product.subcategory ? <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">{product.subcategory}</span> : null}
        {product.uniqueId ? <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs text-muted-foreground"># {product.uniqueId}</span> : null}
        {hasDiscount ? <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white">{product.discount?.label ?? "SALE"}</span> : null}
      </div>

      <div>
        <h1 className="font-heading text-3xl font-bold leading-tight text-foreground md:text-4xl">{product.name}</h1>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <p className="text-3xl font-light text-primary">${displayPrice.toFixed(2)}</p>
          {hasDiscount ? <p className="pb-1 text-lg font-semibold text-muted-foreground line-through">${originalPrice.toFixed(2)}</p> : null}
        </div>
        {etb ? <p className="mt-1 text-sm text-muted-foreground">≈ {etb} ETB</p> : null}
      </div>

      {roles.length > 0 ? (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Outfit</h3>
          <div className={`grid gap-3 ${roles.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
            {roles.map((role, index) => (
              <button
                key={`${role.label}-${index}`}
                type="button"
                onClick={() => setSelectedRoleIndex(index)}
                className={`min-h-24 rounded-xl border-2 p-5 text-left transition-all ${
                  selectedRoleIndex === index ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-primary/50"
                }`}
              >
                <span className="block text-sm font-semibold">
                  {role.icon ? `${role.icon} ` : "👤 "}
                  {role.label}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">${Number(role.price).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {product.description ? <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p> : null}

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Garment Details</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {detailItems.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-secondary p-5">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-base font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-4 rounded-xl border border-amber-100 bg-amber-50 p-5 text-amber-900">
        <Clock className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Production to Delivery Time</p>
          <p className="mt-1 text-xs leading-relaxed">
            All garments require at least 30 days to tailor and ship.{" "}
            <Link href="/care-and-info" className="underline">
              Learn more
            </Link>
          </p>
        </div>
      </div>

      {authRequired && !isAuthenticated ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive font-bold">
          Account required to save measurements and continue with your order.
        </div>
      ) : null}

      {/* Unified Measurement Block */}
      {(hasMeasurement || isMeasurementEditorOpen) ? (
        <section className="rounded-3xl border border-white/5 bg-card p-6 md:p-8 space-y-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Ruler className="h-6 w-6 text-[#f5a623]" />
              <h2 className="font-heading text-xl font-bold text-white tracking-tight">Your Measurements</h2>
            </div>
            <div className="flex items-center gap-4">
              <button type="button" className="inline-flex items-center gap-2 text-sm font-bold text-[#f5a623] transition-colors hover:text-[#ffb84d]">
                <BookOpen className="h-4 w-4" />
                How to Measure
              </button>
              <button type="button" onClick={() => setShowVideo(true)} className="inline-flex items-center gap-2 text-sm font-bold text-zinc-400 transition-colors hover:text-[#f5a623]">
                <Play className="h-4 w-4" />
                Watch Tutorial
              </button>
            </div>
          </div>

          {hasMeasurement && !isMeasurementEditorOpen ? (
            <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f5a623]">Saved Profile</p>
                  <p className="mt-1 text-lg font-bold text-white tracking-tight">{savedMeasurement?.label ?? "My Measurements"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMeasurementEditorOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#f5a623]/30 bg-[#f5a623]/10 px-4 py-2 text-sm font-bold text-[#f5a623] transition-all hover:bg-[#f5a623]/20 active:scale-95"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
              </div>
              <div className="space-y-6">
                {measurementSummary.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-[#f5a623]">{group.title}</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm sm:grid-cols-3">
                      {group.fields.map(([label, value]) => (
                        <div key={label} className="space-y-1">
                          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
                          <p className="text-[17px] font-bold text-white">
                            {typeof value === "number" ? `${value.toFixed(1)} cm` : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="rounded-2xl border border-[#f5a623]/20 bg-[#f5a623]/5 p-5 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5a623]/20">
                   <span className="text-lg">📏</span>
                </div>
                <div>
                   <p className="font-bold text-[#f5a623]">Please measure in centimeters (cm) only.</p>
                   <p className="mt-1 text-sm leading-relaxed text-zinc-400">Precision is key for a perfect fit. Do not use inches — enter all values in CM.</p>
                </div>
              </div>

              <form
                id="measurement-form"
                action={async (formData) => {
                  if (!isAuthenticated) {
                    toast({ title: "Auth Required", description: "Please sign in to save measurements.", variant: "destructive" });
                    return;
                  }
                  try {
                    formData.set("hemStyle", hemStyle);
                    formData.set("pressingStyle", pressingStyle);
                    const result = await createMeasurementAction(formData);
                    if (result && typeof result === "object" && "id" in result) {
                      setSavedMeasurement(result as SavedMeasurement);
                      setIsMeasurementEditorOpen(false);
                      toast({ title: "Success", description: "Measurements saved for your order." });
                    }
                  } catch (error) {
                    toast({ title: "Error", description: "Failed to save measurements. Please check all required fields.", variant: "destructive" });
                  }
                }}
                className="space-y-10"
              >
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="measurementId" value={savedMeasurement?.id ?? ""} />
                <input type="hidden" name="label" value={savedMeasurement?.label ?? "My Measurements"} />

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 block text-left">
                    Select Gender <span className="text-[#f5a623]">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["female", "👗 Women"],
                      ["male", "👔 Men"],
                    ].map(([value, label]) => (
                      <label key={value} className="cursor-pointer group">
                        <input className="peer sr-only" type="radio" name="gender" value={value} defaultChecked={measurementGender === value} />
                        <span className="flex h-20 items-center justify-center rounded-2xl border-2 border-white/5 bg-[#141414] text-xl font-bold text-zinc-500 transition-all group-hover:border-white/10 peer-checked:border-[#f5a623] peer-checked:bg-[#f5a623]/10 peer-checked:text-[#f5a623] peer-checked:shadow-[0_0_20px_rgba(245,166,35,0.1)]">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/5 bg-[#141414] p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5a623]/10 text-2xl shadow-inner">👔</div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-white tracking-tight">{TOP_MEASUREMENT_TITLE}</h3>
                      <p className="text-[13px] text-zinc-500">Essential for shirts, coats, and blazers</p>
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                    {TOP_MEASUREMENT_FIELDS.map((field) => (
                      <MeasurementInput key={field.key} name={field.key} label={field.label} hint={field.hint} required={field.required !== false} defaultValue={(savedMeasurement as any)?.[field.key] as number | null} />
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/5 bg-[#141414] overflow-hidden">
                  <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); setIsPantsOpen(!isPantsOpen); }}
                    className="flex w-full items-center justify-between p-6 md:p-8 transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/50 text-2xl">👖</div>
                      <div className="text-left">
                        <h3 className="text-lg font-bold text-white tracking-tight">{PANTS_MEASUREMENT_TITLE}</h3>
                        <p className="text-[13px] text-zinc-500">Required for trousers or full suit sets</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-white/5 p-2 transition-transform duration-200">
                      <ChevronDown className={`h-5 w-5 text-zinc-400 ${isPantsOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {isPantsOpen && (
                    <div className="px-6 pb-8 md:px-8 md:pb-10 space-y-8 animate-in slide-in-from-top-4 duration-300">
                      <div className="h-px bg-white/5 mb-2" />
                      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                         {PANTS_MEASUREMENT_FIELDS.map((field) => (
                           <ExtraMeasurementInput key={field.key} name={field.key} label={field.label} hint={field.hint} required={field.required !== false} defaultValue={(savedMeasurement as any)?.[field.key] as number | null} />
                         ))}
                      </div>

                      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 pt-4">
                         <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block text-left">Hem Style <span className="text-[#f5a623]">*</span></label>
                           <div className="grid grid-cols-1 gap-3">
                             {HEM_STYLE_OPTIONS.map((option) => (
                               <ChoiceCard key={option.value} title={option.title} description={option.description} selected={hemStyle === option.value} onClick={() => setHemStyle(option.value)} />
                             ))}
                           </div>
                         </div>
                         <div className="space-y-4">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 block text-left">Iron / Pressing <span className="text-[#f5a623]">*</span></label>
                           <div className="grid grid-cols-1 gap-3">
                             {PRESSING_STYLE_OPTIONS.map((option) => (
                               <ChoiceCard key={option.value} title={option.title} description={option.description} selected={pressingStyle === option.value} onClick={() => setPressingStyle(option.value)} />
                             ))}
                           </div>
                         </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#141414]">
                  <div className="flex gap-5 border-b border-white/5 p-6 md:p-8 bg-gradient-to-br from-[#f5a623]/10 to-transparent">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f5a623]/20 shadow-inner">
                      <Mail className="h-5 w-5 text-[#f5a623]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-white tracking-tight">Special Instructions</h3>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-500">Share fit preferences with our tailors.</p>
                    </div>
                  </div>
                  <div className="p-6 md:p-8">
                    <textarea
                      name="tailorNote"
                      maxLength={300}
                      rows={3}
                      value={tailorNote}
                      onChange={(e) => setTailorNote(e.target.value)}
                      placeholder="e.g., Slimmer sleeves, extra long length..."
                      className="w-full resize-none rounded-2xl border border-white/10 bg-black p-5 text-sm text-white outline-none focus:border-[#f5a623] placeholder:text-zinc-700"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row pt-4">
                  <button 
                    type="submit" 
                    className="h-16 flex-1 rounded-2xl bg-[#f5a623] px-10 text-lg font-black text-black transition-all hover:bg-[#ffb84d] active:scale-95 disabled:opacity-50"
                  >
                    {hasMeasurement ? "Update Measurements" : "Save Measurements"}
                  </button>
                  {hasMeasurement && (
                    <button
                      type="button"
                      onClick={() => setIsMeasurementEditorOpen(false)}
                      className="h-16 rounded-2xl border border-white/10 bg-transparent px-8 text-base font-bold text-white hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
        </section>
      ) : null}

      <div className="space-y-3">
        {isAuthenticated ? (
          <form action={addToCartAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="roleLabel" value={selectedRole?.label ?? ""} />
            <input type="hidden" name="measurementId" value={savedMeasurement?.id ?? ""} />
            <button type="submit" className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#f5a623] px-5 text-lg font-bold text-black transition-transform hover:scale-[1.01] active:scale-95">
              <ShoppingBag className="h-5 w-5" />
              Add to Cart
            </button>
          </form>
        ) : (
          <Link href={signinHref} className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#f5a623] px-5 text-lg font-bold text-black transition-transform hover:scale-[1.01] active:scale-95">
            <ShoppingBag className="h-5 w-5" />
            Add to Cart
          </Link>
        )}

        {!event ? (
          <div className="grid grid-cols-2 gap-3">
            <form action={createGroupAction} className="w-full">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="groupName" value={`${product.name} Group Order`} />
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-3 text-sm font-semibold text-white hover:bg-white/5"
              >
                <Users className="h-4 w-4" />
                Group Order
              </button>
            </form>
            <button
              type="button"
              onClick={() => setEventOpen(true)}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-3 text-sm font-semibold text-white hover:bg-white/5"
            >
              <PlusCircle className="h-4 w-4" />
              Create Event
            </button>
          </div>
        ) : (
          <Link href={`/event/${event.id}`} className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-transparent px-5 text-base font-semibold text-white hover:bg-white/5">
            <Users className="h-5 w-5" />
            Event Dashboard
          </Link>
        )}
      </div>

      <ShareLinks url={shareUrl} title={`Check out ${product.name}`} />

      {eventOpen && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 px-4" onClick={(e) => e.target === e.currentTarget && setEventOpen(false)}>
          <div className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <h2 className="text-lg font-bold text-white tracking-tight">Create Event Group</h2>
              <button type="button" onClick={() => setEventOpen(false)} className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white" aria-label="Close modal">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-[15px] leading-relaxed text-zinc-400">
                Invite friends and family to order together for your celebration.
              </p>
              <form action={createEventAction} className="mt-5 space-y-5">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="productName" value={product.name} />
                <input name="eventName" required placeholder="e.g. Wedding 2025" className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-white focus:border-[#f5a623] outline-none" />
                <button type="submit" className="h-12 w-full rounded-xl bg-[#f5a623] font-bold text-black transition-all hover:bg-[#ffb84d]">Create Event</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showVideo && <MeasurementVideoModal gender={measurementGender} onClose={() => setShowVideo(false)} />}
    </div>
  );
}
