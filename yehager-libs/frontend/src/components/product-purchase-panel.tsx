"use client";

import Link from "next/link";
import { BookOpen, ChevronDown, Clock, Mail, Play, Ruler, ShoppingBag, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { ShareLinks } from "@/components/share-links";

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
  authRequired: boolean;
  shareUrl: string;
  addToCartAction: (formData: FormData) => void | Promise<void>;
  createMeasurementAction: (formData: FormData) => void | Promise<void>;
  createEventAction: (formData: FormData) => void | Promise<void>;
};

function formatGender(value?: string | null) {
  if (value === "male") return "Male";
  if (value === "female") return "Female";
  return "Unisex";
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
          defaultValue={defaultValue ?? ""}
          placeholder="0.0"
          className="h-12 w-full rounded-lg border border-input bg-black px-4 pr-12 text-lg text-blue-200 outline-none transition focus:border-primary"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">cm</span>
      </span>
      <span className="mt-1 block min-h-10 text-xs leading-snug text-muted-foreground">{hint}</span>
    </label>
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
  authRequired,
  shareUrl,
  addToCartAction,
  createMeasurementAction,
  createEventAction,
}: ProductPurchasePanelProps) {
  const [selectedRoleIndex, setSelectedRoleIndex] = useState(0);
  const [eventOpen, setEventOpen] = useState(false);
  const selectedRole = roles[selectedRoleIndex] ?? null;
  const displayPrice = Number(selectedRole?.price ?? price);
  const measurementGender = selectedRole?.gender ?? product.gender ?? "female";
  const etb = etbRate ? Math.round(displayPrice * etbRate).toLocaleString() : null;

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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {product.region ? <span className="rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">{product.region}</span> : null}
        {product.subcategory ? <span className="rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground">{product.subcategory}</span> : null}
        {product.uniqueId ? <span className="rounded-full bg-secondary px-4 py-2 font-mono text-sm text-muted-foreground">#{product.uniqueId}</span> : null}
      </div>

      <div>
        <h1 className="font-heading text-3xl font-bold leading-tight text-foreground md:text-4xl">{product.name}</h1>
        <p className="mt-4 text-4xl font-light text-primary">${displayPrice.toFixed(2)}</p>
        {etb ? <p className="mt-1 text-base text-muted-foreground">≈ {etb} ETB</p> : null}
      </div>

      {roles.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Select Outfit</h3>
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
                <span className="block text-xl font-bold">
                  {role.icon ? `${role.icon} ` : "👤 "}
                  {role.label}
                </span>
                <span className="mt-2 block text-base text-muted-foreground">${Number(role.price).toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {product.description ? <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p> : null}

      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Garment Details</h3>
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
          <p className="font-bold">Production to Delivery Time</p>
          <p className="mt-1 text-sm">
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
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Play className="h-4 w-4" />
              Watch Tutorial
            </span>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <p className="font-bold text-primary">Please measure in centimeters (cm) only.</p>
          <p className="mt-1 text-sm text-muted-foreground">Do not use inches - all values must be entered in CM to ensure a perfect fit.</p>
        </div>

        <form id="measurement-form" action={createMeasurementAction} className="mt-6 space-y-6">
          <input type="hidden" name="productId" value={product.id} />
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
              <MeasurementInput name="shoulderWidth" label="Shoulder" hint="Seam to seam across the top of the shoulder" defaultValue={latestMeasurement?.shoulderWidth} />
              <MeasurementInput name="chest" label="Chest / Bust" hint="Around the fullest part of the bust" defaultValue={latestMeasurement?.chest} />
              <MeasurementInput name="waist" label="Waist" hint="Around the natural waistline" defaultValue={latestMeasurement?.waist} />
              <MeasurementInput name="torsoLength" label="Shoulder to Waist" hint="From shoulder down to natural waist" defaultValue={latestMeasurement?.torsoLength} />
              <MeasurementInput name="hips" label="Hip" hint="Around the fullest part of the hips, usually 7-9 inches below the waist" defaultValue={latestMeasurement?.hips} />
              <MeasurementInput name="armLength" label="Arm Length" hint="From shoulder seam to wrist with arm slightly bent" defaultValue={latestMeasurement?.armLength} />
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
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <MeasurementInput name="inseam" label="Pants Inseam" hint="From crotch seam to ankle" required={false} />
              <MeasurementInput label="Pants Rise" hint="From waist to crotch seam" required={false} />
            </div>
          </details>

          <div className="overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
            <div className="flex gap-4 border-b border-primary/30 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <Mail className="h-5 w-5 text-primary" />
              </span>
              <div>
                <h3 className="text-lg font-bold">A Message to Our Tailors</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Is there anything specific you&apos;d like our tailors to know? Share fit preferences, design details, or special instructions.
                </p>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-lg border border-border bg-black p-4 text-blue-200">
                <p className="text-base">Examples:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>&quot;I prefer a slightly relaxed fit in the shoulders&quot;</li>
                  <li>&quot;Please add a chest pocket on the left side&quot;</li>
                  <li>&quot;The collar should be slightly wider than standard&quot;</li>
                </ul>
              </div>
              <textarea
                name="tailorNote"
                maxLength={300}
                rows={4}
                placeholder="Type your note here..."
                className="w-full resize-none rounded-lg border border-input bg-black p-4 text-sm outline-none transition focus:border-primary"
              />
              <p className="text-sm text-muted-foreground">0 / 300 characters</p>
            </div>
          </div>

          <button type="submit" className="h-14 w-full rounded-lg bg-primary px-5 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90">
            Save Measurements
          </button>
        </form>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
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
          <Link href="/signin" className="text-primary hover:underline">
            Sign in
          </Link>{" "}
          to save measurements and add to cart
        </p>
      ) : null}

      {eventOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4" onClick={(eventClick) => eventClick.target === eventClick.currentTarget && setEventOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-6">
            <h2 className="font-heading text-2xl font-bold">Create Group Order</h2>
            <p className="mt-2 text-sm text-muted-foreground">Start a wedding, baptism, or celebration group around this look.</p>
            <form action={createEventAction} className="mt-5 space-y-3">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="productName" value={product.name} />
              <input name="eventName" required placeholder="Event name" className="h-12 w-full rounded-lg border border-input bg-background px-4 text-sm" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setEventOpen(false)} className="h-11 flex-1 rounded-md border border-border px-4 text-sm font-semibold hover:bg-secondary">
                  Cancel
                </button>
                <button type="submit" className="h-11 flex-1 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground hover:bg-primary/90">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
