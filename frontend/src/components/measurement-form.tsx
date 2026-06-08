"use client";

import { BookOpen, ChevronDown, Mail, Pencil, Play, Ruler, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Measurement = {
  id?: string;
  label?: string | null;
  gender?: string | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  shoulderWidth?: number | null;
  armLength?: number | null;
  torsoLength?: number | null;
  neck?: number | null;
  inseam?: number | null;
  bicepCircumference?: number | null;
  wristCircumference?: number | null;
  waistToSkirt?: number | null;
  waistToDress?: number | null;
  pantsWaist?: number | null;
  pantsHip?: number | null;
  thighCircumference?: number | null;
  waistToPantsLength?: number | null;
  hemStyle?: string | null;
  pressingStyle?: string | null;
  tailorNote?: string | null;
};

type MeasurementFormProps = {
  initialData?: Measurement | null;
  onSubmit: (formData: FormData) => void | Promise<void>;
  onClose?: () => void;
  title?: string;
  isAuthenticated: boolean;
};

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
  name: string;
  label: string;
  hint: string;
  required?: boolean;
  defaultValue?: number | null;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zinc-400">
        {label} {required ? <span className="text-[#f5a623]">*</span> : <span className="font-normal italic text-zinc-500">(optional)</span>}
      </span>
      <span className="relative block">
        <input
          name={name}
          type="number"
          min="0.1"
          step="0.1"
          required={required}
          defaultValue={inchesToCm(defaultValue) ?? ""}
          placeholder="0.0"
          className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 pr-12 text-lg text-blue-200 outline-none transition focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623]"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#f5a623]">cm</span>
      </span>
      <span className="mt-1.5 block min-h-8 text-[12px] leading-snug text-zinc-500">{hint}</span>
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
      className={cn(
        "min-h-28 rounded-xl border-2 p-5 text-left transition-all",
        selected ? "border-[#f5a623] bg-[#f5a623]/5" : "border-white/5 bg-[#1a1a1a] hover:border-white/10"
      )}
    >
      <span className={cn("block text-sm font-bold", selected ? "text-[#f5a623]" : "text-white")}>{title}</span>
      <span className="mt-2 block text-xs leading-relaxed text-zinc-400">{description}</span>
    </button>
  );
}

export function MeasurementForm({
  initialData,
  onSubmit,
  onClose,
  title = "Your Measurements",
  isAuthenticated,
}: MeasurementFormProps) {
  const [hemStyle, setHemStyle] = useState(initialData?.hemStyle || "Straight");
  const [pressingStyle, setPressingStyle] = useState(initialData?.pressingStyle || "Creased");
  const [tailorNote, setTailorNote] = useState(initialData?.tailorNote || "");
  const [isAddingNote, setIsAddingNote] = useState(Boolean(initialData?.tailorNote));
  const [gender, setGender] = useState(initialData?.gender || "female");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Ruler className="h-6 w-6 text-[#f5a623]" />
          <h2 className="font-heading text-2xl font-bold text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#f5a623] hover:underline">
            <BookOpen className="h-4 w-4" />
            How to Measure
          </button>
          <button type="button" className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-400 hover:text-[#f5a623]">
            <Play className="h-4 w-4" />
            Watch Tutorial
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#f5a623]/20 bg-[#f5a623]/5 p-5">
        <p className="font-bold text-[#f5a623]">Please measure in centimeters (cm) only.</p>
        <p className="mt-1 text-sm text-zinc-400">Do not use inches - all values must be entered in CM to ensure a perfect fit.</p>
      </div>

      <form 
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          formData.set("hemStyle", hemStyle || "");
          formData.set("pressingStyle", pressingStyle || "");
          formData.set("tailorNote", tailorNote || "");
          onSubmit(formData);
        }} 
        className="space-y-8"
      >
        <input type="hidden" name="gender" value={gender || ""} />
        
        {/* Gender Selection */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-zinc-400">
            Select Gender <span className="text-[#f5a623]">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "female", label: "👗 Women" },
              { value: "male", label: "👔 Men" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGender(opt.value)}
                className={cn(
                  "flex h-16 items-center justify-center rounded-xl border-2 text-xl font-bold transition-all",
                  gender === opt.value 
                    ? "border-[#f5a623] bg-[#f5a623]/10 text-[#f5a623]" 
                    : "border-white/5 bg-[#1a1a1a] text-zinc-500 hover:border-white/10"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Top Garment Section */}
        <div className="rounded-2xl border border-white/5 bg-[#141414] p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👔</span>
            <div>
              <h3 className="text-lg font-bold text-[#f5a623]">Shirt / Coat / Blazer Measurements</h3>
              <p className="text-xs text-zinc-500">Measurements for the top garment — shirt, suit coat, or blazer</p>
            </div>
          </div>
          <div className="my-6 h-px bg-white/5" />
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <MeasurementInput name="neck" label="Neck" hint="Around the base of the neck where the collar sits" defaultValue={initialData?.neck} />
            <MeasurementInput name="shoulderWidth" label="Shoulder" hint="Seam to seam across the top of the shoulder" defaultValue={initialData?.shoulderWidth} />
            <MeasurementInput name="chest" label="Chest / Bust" hint="Around the fullest part of the bust" defaultValue={initialData?.chest} />
            <MeasurementInput name="waist" label="Waist" hint="Around the narrowest part of your natural waist" defaultValue={initialData?.waist} />
            <MeasurementInput name="torsoLength" label="Shirt / Coat Length" hint="From the back of the neck down to where you want the shirt or coat to end" defaultValue={initialData?.torsoLength} />
            <MeasurementInput name="armLength" label="Arm Length" hint="From shoulder seam to wrist with arm slightly bent" defaultValue={initialData?.armLength} />
            <MeasurementInput name="bicepCircumference" label="Bicep Circumference" hint="Around the fullest part of the upper arm" required={false} defaultValue={initialData?.bicepCircumference} />
            <MeasurementInput name="wristCircumference" label="Wrist Circumference" hint="Around the wrist bone" required={false} defaultValue={initialData?.wristCircumference} />
          </div>
        </div>

        {/* Pants Section (Collapsible in product panel, but here we can show it) */}
        <div className="rounded-2xl border border-white/5 bg-[#141414] p-6 shadow-xl">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {}}>
            <span className="text-2xl">👖</span>
            <div>
              <h3 className="text-lg font-bold text-[#f5a623]">{gender === 'male' ? "Men's" : "Women's"} Pants Measurements</h3>
              <p className="text-xs text-zinc-500">Required if you are also ordering trousers / pants</p>
            </div>
          </div>
          <div className="my-6 h-px bg-white/5" />
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <MeasurementInput name="pantsWaist" label="Waist" hint="Around the narrowest part of your natural waist" defaultValue={initialData?.pantsWaist} />
            <MeasurementInput name="pantsHip" label="Hip" hint="Around the fullest part of the hips, usually 7-9 inches below the waist" defaultValue={initialData?.pantsHip} />
            <MeasurementInput name="thighCircumference" label="Thigh Circumference" hint="Around the fullest part of the upper thigh" defaultValue={initialData?.thighCircumference} />
            <MeasurementInput name="waistToPantsLength" label="Waist to Length" hint="From waist down to where you want the pants to end" defaultValue={initialData?.waistToPantsLength} />
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <p className="text-sm font-semibold text-zinc-400 mb-3">
                Hem Style <span className="text-[#f5a623]">*</span>
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            </div>

            <div>
              <p className="text-sm font-semibold text-zinc-400 mb-3">
                Pressing (Iron) Style <span className="text-[#f5a623]">*</span>
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
        </div>

        {/* Tailor Note Section */}
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#141414] shadow-xl">
          <div className="flex gap-4 border-b border-white/5 p-6 bg-[#f5a623]/5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f5a623]/20">
              <Mail className="h-5 w-5 text-[#f5a623]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">A Message to Our Tailors</h3>
              <p className="mt-1 text-[14px] leading-relaxed text-zinc-400">
                Is there anything specific you'd like our tailors to know? Share any fit preferences, design details, or special instructions — every note helps us craft a garment that's truly yours.
              </p>
            </div>
          </div>

          {!isAddingNote ? (
            <div className="p-6">
              <p className="text-sm italic text-zinc-500">No note added.</p>
              <button
                type="button"
                onClick={() => setIsAddingNote(true)}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#f5a623] hover:underline"
              >
                <Pencil className="h-4 w-4" />
                Add a note to our tailors
              </button>
            </div>
          ) : (
            <div className="space-y-4 p-6">
              <div className="rounded-xl border border-white/5 bg-black p-4">
                <p className="text-sm font-semibold text-zinc-300">Examples:</p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-zinc-400">
                  <li>"I prefer a slightly relaxed fit in the shoulders"</li>
                  <li>"Please add a chest pocket on the left side"</li>
                  <li>"The collar should be slightly wider than standard"</li>
                </ul>
              </div>
              <div className="relative">
                <textarea
                  name="tailorNote"
                  maxLength={300}
                  rows={4}
                  value={tailorNote || ""}
                  onChange={(e) => setTailorNote(e.target.value)}
                  placeholder="Type your note here..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-black p-4 text-[15px] text-blue-200 outline-none transition focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623]"
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">{(tailorNote || "").length} / 300 characters</p>
                  <button
                    type="button"
                    onClick={() => {
                      setTailorNote("");
                      setIsAddingNote(false);
                    }}
                    className="text-xs font-bold text-[#f5a623] hover:underline"
                  >
                    Discard note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={!isAllFieldValid() && false /* Logic for valid fields could be added */}
            className="h-14 flex-1 rounded-xl bg-[#f5a623] px-8 text-lg font-bold text-black transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-50"
          >
            {initialData?.id ? "Update Measurements" : "Save Measurements"}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-14 rounded-xl border border-white/10 bg-[#1a1a1a] px-8 text-lg font-bold text-white transition-colors hover:bg-white/5"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );

  function isAllFieldValid() {
    // Basic validation check
    return true;
  }
}
