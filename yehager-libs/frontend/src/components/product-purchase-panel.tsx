"use client";

import Link from "next/link";
import { BookOpen, ChevronDown, Clock, Mail, Pencil, Play, Ruler, ShoppingBag, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ShareLinks } from "@/components/share-links";
import { MeasurementVideoModal } from "@/components/measurement-help";

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
  } | null | void>;
  createEventAction: (formData: FormData) => void | Promise<void>;
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
    <label>
      <span className="mb-1 block text-sm font-semibold text-muted-foreground">
        {label} {required ? <span className="text-primary">*</span> : <span className="font-normal italic">(optional)</span>}
      </span>
      <span className="relative block">
        <input
          {...(name ? { name } : {})}
          type="number"
          min="0.1"
          step="0.1"
          required={required}
          defaultValue={inchesToCm(defaultValue) ?? ""}
          placeholder="0.0"
          className="h-12 w-full rounded-lg border border-input bg-black px-4 pr-12 text-lg text-blue-200 outline-none transition focus:border-primary"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">cm</span>
      </span>
      <span className="mt-1 block min-h-10 text-xs leading-snug text-muted-foreground">{hint}</span>
    </label>
  );
}

function ExtraMeasurementInput({
  label,
  hint,
  required = true,
}: {
  label: string;
  hint: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-1 block text-sm font-semibold text-muted-foreground">
        {label} {required ? <span className="text-primary">*</span> : null}
      </span>
      <span className="relative block">
        <input
          type="number"
          min="0.1"
          step="0.1"
          placeholder="0.0"
          className="h-12 w-full rounded-lg border border-input bg-black px-4 pr-12 text-lg text-blue-200 outline-none transition focus:border-primary"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">cm</span>
      </span>
      <span className="mt-1 block min-h-10 text-xs leading-snug text-muted-foreground">{hint}</span>
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
      className={`min-h-28 rounded-xl border-2 p-4 text-left transition-colors ${
        selected ? "border-primary bg-primary/10" : "border-border bg-background/40 hover:border-primary/50"
      }`}
    >
      <span className={`block text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>{title}</span>
      <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{description}</span>
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
}: ProductPurchasePanelProps) {
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [eventOpen, setEventOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [isMeasurementEditorOpen, setIsMeasurementEditorOpen] = useState(!latestMeasurement?.id);
  const [savedMeasurement, setSavedMeasurement] = useState<SavedMeasurement | null>(latestMeasurement);
  const [hemStyle, setHemStyle] = useState("Straight");
  const [pressingStyle, setPressingStyle] = useState("Creased");
  const [tailorNote, setTailorNote] = useState("");
  const [tailorNoteSkipped, setTailorNoteSkipped] = useState(false);
  const selectedRole = roles[selectedRoleIndex] ?? null;
  const displayPrice = Number(selectedRole?.price ?? price);
  const measurementGender = selectedRole?.gender ?? product.gender ?? "female";
  const etb = etbRate ? Math.round(displayPrice * etbRate).toLocaleString() : null;
  const signinHref = `/signin?callbackUrl=${encodeURIComponent(`/product/${product.id}`)}`;
  const hasMeasurement = Boolean(savedMeasurement?.id);
  const measurementSummary = [
    ["Chest", savedMeasurement?.chest],
    ["Waist", savedMeasurement?.waist],
    ["Hips", savedMeasurement?.hips],
    ["Shoulder", savedMeasurement?.shoulderWidth],
    ["Arm", savedMeasurement?.armLength],
    ["Torso", savedMeasurement?.torsoLength],
  ] as const;

  useEffect(() => {
    if (latestMeasurement?.id) {
      setSavedMeasurement(latestMeasurement);
      setIsMeasurementEditorOpen(false);
    }
  }, [latestMeasurement]);

  const detailItems = useMemo(
    () =>
      [
        product.fabricType ? ["Fabric", product.fabricType] : null,
        product.embroideryStyle ? ["Design name", product.embroideryStyle] : null,
        ["Origin", "Handcrafted in Ethiopia"],
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
        {product.uniqueId ? <span className="rounded-full bg-secondary px-3 py-1 font-mono text-xs text-muted-foreground">#{product.uniqueId}</span> : null}
      </div>

      <div>
        <h1 className="font-heading text-3xl font-bold leading-tight text-foreground md:text-4xl">{product.name}</h1>
        <p className="mt-3 text-3xl font-light text-primary">${displayPrice.toFixed(2)}</p>
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

      {authRequired ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Sign in is required to save measurements and add this product to your cart.
        </div>
      ) : null}

      {/* Measurement editor / summary: render in the same place so summary replaces the form when collapsed */}
      {(hasMeasurement || isMeasurementEditorOpen) ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Ruler className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-xl font-bold">Your Measurements</h2>
            </div>
            <div className="flex items-center gap-4">
              <a href="#measurement-form" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <BookOpen className="h-4 w-4" />
                How to Measure
              </a>
              <button type="button" onClick={() => setShowVideo(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary hover:underline">
                <Play className="h-4 w-4" />
                Watch Tutorial
              </button>
            </div>
          </div>

          {hasMeasurement && !isMeasurementEditorOpen ? (
            <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">Your Measurements</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMeasurementEditorOpen(true)}
                  className="inline-flex items-center rounded-md px-0 py-0 text-sm font-semibold text-[#f5a623] hover:text-[#ffb84d]"
                >
                  Edit
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
                {measurementSummary.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[13px] text-zinc-400">{label}</p>
                    <p className="mt-1 text-[14px] font-semibold text-white">{value ? `${Number(value).toFixed(1)} cm` : "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-4">
                <p className="font-bold text-primary">Please measure in centimeters (cm) only.</p>
                <p className="mt-1 text-sm text-muted-foreground">Do not use inches - all values must be entered in CM to ensure a perfect fit.</p>
              </div>

              <form
                id="measurement-form"
                action={async (formData) => {
                  const result = await createMeasurementAction(formData);
                  if (result && typeof result === "object" && "id" in result) {
                    setSavedMeasurement(result as SavedMeasurement);
                    setIsMeasurementEditorOpen(false);
                  }
                }}
                className="mt-6 space-y-6"
              >
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="measurementId" value={savedMeasurement?.id ?? ""} />
                <input type="hidden" name="label" value={`${product.name} measurements`} />

                <div>
                  <label className="mb-2 block text-sm font-semibold text-muted-foreground">
                    Select Gender <span className="text-primary">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ["female", "👗 Women"],
                      ["male", "👔 Men"],
                    ].map(([value, label]) => (
                      <label key={value} className="cursor-pointer">
                        <input className="peer sr-only" type="radio" name="gender" value={value} defaultChecked={(measurementGender === "male" ? "male" : "female") === value} />
                        <span className="flex h-16 items-center justify-center rounded-xl border-2 border-border text-xl font-bold text-muted-foreground transition peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-5">
                  <h3 className="text-xl font-bold text-primary">👗 Dress Measurements</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Measurements used to tailor your dress or top garment</p>
                  <div className="my-5 h-px bg-primary/40" />
                  <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                    <MeasurementInput name="shoulderWidth" label="Shoulder" hint="Seam to seam across the top of the shoulder" defaultValue={savedMeasurement?.shoulderWidth} />
                    <MeasurementInput name="chest" label="Chest / Bust" hint="Around the fullest part of the bust" defaultValue={savedMeasurement?.chest} />
                    <MeasurementInput name="waist" label="Waist" hint="Around the natural waistline" defaultValue={savedMeasurement?.waist} />
                    <MeasurementInput name="torsoLength" label="Shoulder to Waist" hint="From shoulder down to natural waist" defaultValue={savedMeasurement?.torsoLength} />
                    <MeasurementInput name="hips" label="Hip" hint="Around the fullest part of the hips, usually 7-9 inches below the waist" defaultValue={savedMeasurement?.hips} />
                    <MeasurementInput name="armLength" label="Arm Length" hint="From shoulder seam to wrist with arm slightly bent" defaultValue={savedMeasurement?.armLength} />
                    <MeasurementInput label="Thigh Circumference" hint="Around the fullest part of the upper thigh" required={false} />
                    <MeasurementInput label="Wrist Circumference" hint="Around the wrist bone" required={false} />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-muted-foreground">
                    Length Preference <span className="font-normal italic">(choose one or both - optional)</span>
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                    <MeasurementInput label="Waist to Skirt Length" hint="From waist down to where you want the skirt hemline to end" required={false} />
                    <MeasurementInput label="Waist to Dress Length" hint="From waist down to where you want the full dress to end" required={false} />
                  </div>
                  <p className="mt-3 text-sm italic text-muted-foreground">
                    💡 Waist to Skirt Length - for garments ending at the skirt/hem. Waist to Dress Length - for the full dress from waist to hem.
                  </p>
                </div>

                <details className="rounded-xl border border-border bg-background/40 p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-xl font-bold">
                    <span className="text-lg">👖 Add Women&apos;s Pants Measurements</span>
                    <ChevronDown className="h-5 w-5" />
                  </summary>
                  <div className="mt-4 rounded-xl border border-border bg-background/40 p-5">
                    <h3 className="text-xl font-bold text-primary">👖 Women&apos;s Pants Measurements</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Required if you are also ordering pants / trousers</p>
                    <div className="my-5 h-px bg-primary/40" />
                    <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                      <ExtraMeasurementInput label="Waist" hint="Around the narrowest part of your natural waist" />
                      <ExtraMeasurementInput label="Hip" hint="Around the fullest part of the hips, usually 7-9 inches below the waist" />
                      <ExtraMeasurementInput label="Thigh Circumference" hint="Around the fullest part of the upper thigh" />
                      <ExtraMeasurementInput label="Waist to Length" hint="From waist down to where you want the pants to end" />
                    </div>

                    <input type="hidden" name="hemStyle" value={hemStyle} />
                    <input type="hidden" name="pressingStyle" value={pressingStyle} />

                    <p className="mt-6 text-sm font-semibold text-muted-foreground">
                      Hem Style <span className="text-primary">*</span>
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <ChoiceCard
                        title="Straight"
                        description="Clean, simple finish - the fabric lies flat at the bottom without any fold. A classic, neat look."
                        selected={hemStyle === "Straight"}
                        onClick={() => setHemStyle("Straight")}
                      />
                      <ChoiceCard
                        title="Folded Hem"
                        description="The bottom edge is folded inward and stitched - creates a structured, slightly heavier finish that holds its shape."
                        selected={hemStyle === "Folded Hem"}
                        onClick={() => setHemStyle("Folded Hem")}
                      />
                    </div>

                    <p className="mt-6 text-sm font-semibold text-muted-foreground">
                      Pressing (Iron) Style <span className="text-primary">*</span>
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <ChoiceCard
                        title="Creased"
                        description="A sharp, pressed crease runs down the front and back of each leg - gives a formal, tailored appearance."
                        selected={pressingStyle === "Creased"}
                        onClick={() => setPressingStyle("Creased")}
                      />
                      <ChoiceCard
                        title="Plain (No Crease)"
                        description="The fabric is ironed smooth without any crease line - a relaxed, casual, and modern finish."
                        selected={pressingStyle === "Plain (No Crease)"}
                        onClick={() => setPressingStyle("Plain (No Crease)")}
                      />
                    </div>
                  </div>
                </details>

                <div className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
                  <div className="flex gap-4 border-b border-primary/30 p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
                      <Mail className="h-4 w-4 text-primary" />
                    </span>
                    <div>
                      <h3 className="text-base font-bold sm:text-lg">A Message to Our Tailors</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        Is there anything specific you&apos;d like our tailors to know? Share fit preferences, design details, or special instructions.
                      </p>
                    </div>
                  </div>
                  {tailorNoteSkipped ? (
                    <div className="space-y-5 p-5">
                      <p className="text-sm italic text-muted-foreground">No note added.</p>
                      <button
                        type="button"
                        onClick={() => setTailorNoteSkipped(false)}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                      >
                        <Pencil className="h-4 w-4" />
                        Add a note to our tailors
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 p-5">
                      <div className="rounded-lg border border-border bg-black p-4 text-blue-200">
                        <p className="text-sm">Examples:</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                          <li>&quot;I prefer a slightly relaxed fit in the shoulders&quot;</li>
                          <li>&quot;Please add a chest pocket on the left side&quot;</li>
                          <li>&quot;The collar should be slightly wider than standard&quot;</li>
                        </ul>
                      </div>
                      <textarea
                        name="tailorNote"
                        maxLength={300}
                        rows={4}
                        value={tailorNote}
                        onChange={(event) => setTailorNote(event.target.value)}
                        placeholder="Type your note here..."
                        className="w-full resize-none rounded-lg border border-input bg-black p-4 text-sm outline-none transition focus:border-primary"
                      />
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">{tailorNote.length} / 300 characters</p>
                        <button
                          type="button"
                          onClick={() => {
                            setTailorNote("");
                            setTailorNoteSkipped(true);
                          }}
                          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                        >
                          Skip
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isAuthenticated ? (
                  <button type="submit" className="h-14 w-full rounded-lg bg-primary px-5 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90">
                    {hasMeasurement ? "Update Measurements" : "Save Measurements"}
                  </button>
                ) : (
                  <button type="button" disabled className="h-14 w-full cursor-not-allowed rounded-lg bg-primary px-5 text-base font-bold text-primary-foreground opacity-45">
                    Sign in to save measurements
                  </button>
                )}
              </form>
              {hasMeasurement ? (
                <button
                  type="button"
                  onClick={() => setIsMeasurementEditorOpen(false)}
                  className="mt-4 inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
                >
                  Close
                </button>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {isMeasurementEditorOpen ? (
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Ruler className="h-5 w-5 text-primary" />
              <h2 className="font-heading text-xl font-bold">Your Measurements</h2>
            </div>
            <div className="flex items-center gap-4">
              <a href="#measurement-form" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <BookOpen className="h-4 w-4" />
                How to Measure
              </a>
              <button type="button" onClick={() => setShowVideo(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary hover:underline">
                <Play className="h-4 w-4" />
                Watch Tutorial
              </button>
            </div>
          </div>

        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <p className="font-bold text-primary">Please measure in centimeters (cm) only.</p>
          <p className="mt-1 text-sm text-muted-foreground">Do not use inches - all values must be entered in CM to ensure a perfect fit.</p>
        </div>

        <form
          id="measurement-form"
          action={async (formData) => {
            const result = await createMeasurementAction(formData);
            if (result && typeof result === "object" && "id" in result) {
              setSavedMeasurement(result as SavedMeasurement);
              setIsMeasurementEditorOpen(false);
            }
          }}
          className="mt-6 space-y-6"
        >
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="measurementId" value={savedMeasurement?.id ?? ""} />
          <input type="hidden" name="label" value={`${product.name} measurements`} />

          <div>
            <label className="mb-2 block text-sm font-semibold text-muted-foreground">
              Select Gender <span className="text-primary">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["female", "👗 Women"],
                ["male", "👔 Men"],
              ].map(([value, label]) => (
                <label key={value} className="cursor-pointer">
                  <input className="peer sr-only" type="radio" name="gender" value={value} defaultChecked={(measurementGender === "male" ? "male" : "female") === value} />
                  <span className="flex h-16 items-center justify-center rounded-xl border-2 border-border text-xl font-bold text-muted-foreground transition peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary">
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/40 p-5">
            <h3 className="text-xl font-bold text-primary">👗 Dress Measurements</h3>
            <p className="mt-1 text-sm text-muted-foreground">Measurements used to tailor your dress or top garment</p>
            <div className="my-5 h-px bg-primary/40" />
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <MeasurementInput name="shoulderWidth" label="Shoulder" hint="Seam to seam across the top of the shoulder" defaultValue={savedMeasurement?.shoulderWidth} />
              <MeasurementInput name="chest" label="Chest / Bust" hint="Around the fullest part of the bust" defaultValue={savedMeasurement?.chest} />
              <MeasurementInput name="waist" label="Waist" hint="Around the natural waistline" defaultValue={savedMeasurement?.waist} />
              <MeasurementInput name="torsoLength" label="Shoulder to Waist" hint="From shoulder down to natural waist" defaultValue={savedMeasurement?.torsoLength} />
              <MeasurementInput name="hips" label="Hip" hint="Around the fullest part of the hips, usually 7-9 inches below the waist" defaultValue={savedMeasurement?.hips} />
              <MeasurementInput name="armLength" label="Arm Length" hint="From shoulder seam to wrist with arm slightly bent" defaultValue={savedMeasurement?.armLength} />
              <MeasurementInput label="Thigh Circumference" hint="Around the fullest part of the upper thigh" required={false} />
              <MeasurementInput label="Wrist Circumference" hint="Around the wrist bone" required={false} />
            </div>
            <p className="mt-4 text-sm font-semibold text-muted-foreground">
              Length Preference <span className="font-normal italic">(choose one or both - optional)</span>
            </p>
            <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <MeasurementInput label="Waist to Skirt Length" hint="From waist down to where you want the skirt hemline to end" required={false} />
              <MeasurementInput label="Waist to Dress Length" hint="From waist down to where you want the full dress to end" required={false} />
            </div>
            <p className="mt-3 text-sm italic text-muted-foreground">
              💡 Waist to Skirt Length - for garments ending at the skirt/hem. Waist to Dress Length - for the full dress from waist to hem.
            </p>
          </div>

          <details className="rounded-xl border border-border bg-background/40 p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xl font-bold">
              <span className="text-lg">👖 Add Women&apos;s Pants Measurements</span>
              <ChevronDown className="h-5 w-5" />
            </summary>
            <div className="mt-4 rounded-xl border border-border bg-background/40 p-5">
              <h3 className="text-xl font-bold text-primary">👖 Women&apos;s Pants Measurements</h3>
              <p className="mt-1 text-sm text-muted-foreground">Required if you are also ordering pants / trousers</p>
              <div className="my-5 h-px bg-primary/40" />
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <ExtraMeasurementInput label="Waist" hint="Around the narrowest part of your natural waist" />
                <ExtraMeasurementInput label="Hip" hint="Around the fullest part of the hips, usually 7-9 inches below the waist" />
                <ExtraMeasurementInput label="Thigh Circumference" hint="Around the fullest part of the upper thigh" />
                <ExtraMeasurementInput label="Waist to Length" hint="From waist down to where you want the pants to end" />
              </div>

              <input type="hidden" name="hemStyle" value={hemStyle} />
              <input type="hidden" name="pressingStyle" value={pressingStyle} />

              <p className="mt-6 text-sm font-semibold text-muted-foreground">
                Hem Style <span className="text-primary">*</span>
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ChoiceCard
                  title="Straight"
                  description="Clean, simple finish - the fabric lies flat at the bottom without any fold. A classic, neat look."
                  selected={hemStyle === "Straight"}
                  onClick={() => setHemStyle("Straight")}
                />
                <ChoiceCard
                  title="Folded Hem"
                  description="The bottom edge is folded inward and stitched - creates a structured, slightly heavier finish that holds its shape."
                  selected={hemStyle === "Folded Hem"}
                  onClick={() => setHemStyle("Folded Hem")}
                />
              </div>

              <p className="mt-6 text-sm font-semibold text-muted-foreground">
                Pressing (Iron) Style <span className="text-primary">*</span>
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ChoiceCard
                  title="Creased"
                  description="A sharp, pressed crease runs down the front and back of each leg - gives a formal, tailored appearance."
                  selected={pressingStyle === "Creased"}
                  onClick={() => setPressingStyle("Creased")}
                />
                <ChoiceCard
                  title="Plain (No Crease)"
                  description="The fabric is ironed smooth without any crease line - a relaxed, casual, and modern finish."
                  selected={pressingStyle === "Plain (No Crease)"}
                  onClick={() => setPressingStyle("Plain (No Crease)")}
                />
              </div>
            </div>
          </details>

          <div className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
            <div className="flex gap-4 border-b border-primary/30 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <Mail className="h-4 w-4 text-primary" />
              </span>
              <div>
                <h3 className="text-base font-bold sm:text-lg">A Message to Our Tailors</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Is there anything specific you&apos;d like our tailors to know? Share fit preferences, design details, or special instructions.
                </p>
              </div>
            </div>
            {tailorNoteSkipped ? (
              <div className="space-y-5 p-5">
                <p className="text-sm italic text-muted-foreground">No note added.</p>
                <button
                  type="button"
                  onClick={() => setTailorNoteSkipped(false)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                >
                  <Pencil className="h-4 w-4" />
                  Add a note to our tailors
                </button>
              </div>
            ) : (
              <div className="space-y-4 p-5">
                <div className="rounded-lg border border-border bg-black p-4 text-blue-200">
                  <p className="text-sm">Examples:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                    <li>&quot;I prefer a slightly relaxed fit in the shoulders&quot;</li>
                    <li>&quot;Please add a chest pocket on the left side&quot;</li>
                    <li>&quot;The collar should be slightly wider than standard&quot;</li>
                  </ul>
                </div>
                <textarea
                  name="tailorNote"
                  maxLength={300}
                  rows={4}
                  value={tailorNote}
                  onChange={(event) => setTailorNote(event.target.value)}
                  placeholder="Type your note here..."
                  className="w-full resize-none rounded-lg border border-input bg-black p-4 text-sm outline-none transition focus:border-primary"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{tailorNote.length} / 300 characters</p>
                  <button
                    type="button"
                    onClick={() => {
                      setTailorNote("");
                      setTailorNoteSkipped(true);
                    }}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <button type="submit" className="h-14 w-full rounded-lg bg-primary px-5 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90">
              {hasMeasurement ? "Update Measurements" : "Save Measurements"}
            </button>
          ) : (
            <button type="button" disabled className="h-14 w-full cursor-not-allowed rounded-lg bg-primary px-5 text-base font-bold text-primary-foreground opacity-45">
              Sign in to save measurements
            </button>
          )}
        </form>
        {hasMeasurement ? (
          <button
            type="button"
            onClick={() => setIsMeasurementEditorOpen(false)}
            className="mt-4 inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
          >
            Close
          </button>
        ) : null}
      </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        {isAuthenticated ? (
          <form action={addToCartAction} className="flex-1">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="roleLabel" value={selectedRole?.label ?? ""} />
            <input type="hidden" name="measurementId" value={latestMeasurement?.id ?? ""} />
            <button type="submit" className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-md bg-primary px-5 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              <ShoppingBag className="h-5 w-5" />
              Add to Cart
            </button>
          </form>
        ) : (
          <Link href={signinHref} className="inline-flex h-14 flex-1 items-center justify-center gap-3 rounded-md bg-primary px-5 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
            <ShoppingBag className="h-5 w-5" />
            Add to Cart
          </Link>
        )}

        {!event ? (
          <button
            type="button"
            onClick={() => setEventOpen(true)}
            className="inline-flex h-14 flex-1 items-center justify-center gap-3 rounded-md border border-border px-5 text-lg font-semibold transition-colors hover:border-primary/50 hover:bg-secondary"
          >
            <Users className="h-5 w-5" />
            Group Order
          </button>
        ) : (
          <Link href={`/event/${event.id}`} className="inline-flex h-14 flex-1 items-center justify-center gap-3 rounded-md border border-border px-5 text-lg font-semibold transition-colors hover:border-primary/50 hover:bg-secondary">
            <Users className="h-5 w-5" />
            Event Dashboard
          </Link>
        )}

        <ShareLinks url={shareUrl} title={`Check out ${product.name}`} />
      </div>

      {measurements.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
            <Link href={signinHref} className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to save measurements and add to cart
        </p>
      ) : null}

      {eventOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4" onClick={(eventClick) => eventClick.target === eventClick.currentTarget && setEventOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-2xl font-bold">Create Event Group</h2>
                <p className="mt-2 text-sm text-muted-foreground">Invite friends and family to order together for your celebration.</p>
              </div>
              <button type="button" onClick={() => setEventOpen(false)} className="rounded-full p-1 text-muted-foreground hover:bg-secondary" aria-label="Close group order modal">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form action={createEventAction} className="mt-5 space-y-3">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="productName" value={product.name} />
              <input name="eventName" required placeholder="e.g. Tigist's Wedding 2025" className="h-14 w-full rounded-lg border border-input bg-background px-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <div className="flex gap-3">
                <button type="submit" className="h-14 flex-1 rounded-md bg-primary px-4 text-base font-bold text-primary-foreground hover:bg-primary/90">
                  Create & Get Invite Link
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {showVideo ? <MeasurementVideoModal gender={measurementGender} onClose={() => setShowVideo(false)} /> : null}
    </div>
  );
}
