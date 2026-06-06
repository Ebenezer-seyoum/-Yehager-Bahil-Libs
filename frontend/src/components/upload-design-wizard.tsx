"use client";

import { useMemo, useState } from "react";
import { BookOpen, Check, CheckCircle2, ChevronDown, Loader2, Mail, Palette, Phone, Play, Ruler } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SignedUpload = {
  cloudName: string;
  apiKey: string;
  folder: string;
  publicId?: string;
  timestamp: number;
  signature: string;
};

type UploadedFileState = {
  url: string;
  name: string;
};

type UploadKey = "front" | "side" | "back" | "detail";

const steps = ["Design", "Fabric & Style", "Measurements", "Contact & Submit"] as const;

const outfitTypes = [
  "Men's Habesha Kemis",
  "Women's Habesha Kemis",
  "Kids Outfit",
  "Traditional Bridal Set",
  "Groom Suit",
  "Modern/Cultural Fusion",
  "Other",
];

const fabricOptions = [
  "Menen (መነን)",
  "Saba (ሳባ)",
  "Gabi-style Cotton (ጋቢ ዓይነት)",
  "Gezme (ግዝሜ)",
  "Premium Silk-Cotton Blend",
  "Standard Handwoven Cotton",
];

const embroideryOptions = [
  "Handmade Embroidery (የእጅ ጥልፍ)",
  "Machine Embroidery (የማሽን ጥልፍ)",
  "Printed Patterns",
  "No Embroidery/Plain",
];

const colorOptions = [
  "Pure Gold (ወርቃማ)",
  "Silver (ብርማ)",
  "Multi-color Cultural (ባለብዙ ቀለም)",
  "Monochromatic Black/White",
  "Custom (Specify in Remarks)",
];

const measurementFields = [
  ["neck", "Neck", "Around the base of the neck where the collar sits"],
  ["shoulder", "Shoulder", "Seam to seam across the top of the shoulder"],
  ["chest", "Chest / Bust", "Around the fullest part of the bust"],
  ["waist", "Waist", "Around the narrowest part of your natural waist"],
  ["shirtLength", "Shirt / Coat Length", "From the back of the neck down to where you want the shirt or coat to end"],
  ["armLength", "Arm Length", "From shoulder seam to wrist with arm slightly bent"],
  ["bicepCircumference", "Bicep Circumference", "Around the fullest part of the upper arm"],
  ["wristCircumference", "Wrist Circumference", "Around the wrist bone"],
] as const;

async function uploadToCloudinary(file: File, folder: string) {
  const signRes = await fetch("/api/backend/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  if (!signRes.ok) throw new Error("Could not start upload");
  const signedPayload = (await signRes.json()) as { data: SignedUpload };
  const signed = signedPayload.data;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signed.apiKey);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("signature", signed.signature);
  formData.append("folder", signed.folder);
  if (signed.publicId) formData.append("public_id", signed.publicId);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`, {
    method: "POST",
    body: formData,
  });
  if (!uploadRes.ok) throw new Error("Upload failed");
  const uploadJson = (await uploadRes.json()) as { secure_url?: string };
  if (!uploadJson.secure_url) throw new Error("Upload response missing URL");
  return uploadJson.secure_url;
}

function StepPills({ step, setStep }: { step: number; setStep: (step: number) => void }) {
  return (
    <div className="mt-7 flex flex-wrap items-center gap-2 text-xs">
      {steps.map((label, index) => {
        const active = step === index;
        const done = step > index;
        return (
          <div key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(index)}
              className={`inline-flex h-8 items-center gap-2 rounded-full px-4 font-bold transition ${
                active
                  ? "bg-primary text-black"
                  : done
                    ? "bg-primary/25 text-primary"
                    : "bg-secondary text-muted-foreground"
              }`}
            >
              <span className={`grid h-4 w-4 place-items-center rounded-full border ${active ? "border-black" : "border-current"}`}>
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              {label}
            </button>
            {index < steps.length - 1 ? <span className="text-muted-foreground">›</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function ChoiceButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-11 rounded-xl border px-3 text-left text-sm transition ${
        selected
          ? "border-primary bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
          : "border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function UploadSlot({
  tag,
  icon,
  label,
  required,
  value,
  busy,
  onUpload,
}: {
  tag: string;
  icon: string;
  label: string;
  required?: boolean;
  value: UploadedFileState | null;
  busy: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  return (
    <label
      className={`relative grid min-h-[285px] cursor-pointer place-items-center rounded-xl border-2 border-dashed bg-card p-5 text-center transition ${
        busy || value ? "border-primary/70 bg-primary/5" : "border-border hover:border-primary/60"
      }`}
    >
      <input
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/heic,image/*"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onUpload(file);
        }}
      />
      <span className="absolute left-3 top-3 rounded-full bg-background px-2 py-1 text-[10px] font-black text-foreground">
        {tag}
      </span>
      <div className="space-y-3">
        <div className="text-3xl">{busy ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /> : icon}</div>
        <div>
          <p className="text-xs font-black text-foreground">{value ? value.name : label}</p>
          <p className={`mt-2 text-[11px] font-bold ${required ? "text-primary" : "text-muted-foreground"}`}>
            {required ? "Required" : "Optional"}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground">JPEG · PNG · HEIC · max 10MB</p>
      </div>
    </label>
  );
}

function PageHeader({ step, setStep }: { step: number; setStep: (step: number) => void }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-medium">
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          Home
        </Link>
        <span className="text-muted-foreground">›</span>
        <span className="text-foreground">Upload Your Own Design</span>
      </div>
      <h1 className="mt-4 font-heading text-4xl font-bold leading-tight text-foreground sm:text-5xl">
        Upload Your Own Design
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
        Bring your vision to life. Share your design references and preferences — our master tailors will craft your garment exactly as you envision it.
      </p>
      <StepPills step={step} setStep={setStep} />
    </div>
  );
}

export function UploadDesignWizard({ familyGroupId, eventId }: { familyGroupId?: string; eventId?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<null | UploadKey | "submit">(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedNumber, setSubmittedNumber] = useState<string | null>(null);

  const [outfitType, setOutfitType] = useState("");
  const [fabricType, setFabricType] = useState("");
  const [embroideryStyle, setEmbroideryStyle] = useState("");
  const [colorPreference, setColorPreference] = useState("");
  const [gender, setGender] = useState<"female" | "male">("male");
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [measurementsSaved, setMeasurementsSaved] = useState(false);
  const [measurementNoteOpen, setMeasurementNoteOpen] = useState(false);
  const [measurementNote, setMeasurementNote] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [inspirationNote, setInspirationNote] = useState("");

  const [frontImage, setFrontImage] = useState<UploadedFileState | null>(null);
  const [sideImage, setSideImage] = useState<UploadedFileState | null>(null);
  const [backImage, setBackImage] = useState<UploadedFileState | null>(null);
  const [detailImage, setDetailImage] = useState<UploadedFileState | null>(null);

  const uploadedCount = useMemo(
    () => [frontImage, sideImage, backImage, detailImage].filter(Boolean).length,
    [frontImage, sideImage, backImage, detailImage],
  );

  async function handleUpload(which: UploadKey, file: File) {
    setError(null);
    setBusy(which);
    try {
      const url = await uploadToCloudinary(file, "upload-designs/references");
      const next = { url, name: file.name };
      if (which === "front") setFrontImage(next);
      if (which === "side") setSideImage(next);
      if (which === "back") setBackImage(next);
      if (which === "detail") setDetailImage(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  function canProceed() {
    if (step === 0) return Boolean(frontImage && backImage && outfitType);
    if (step === 1) return Boolean(fabricType && embroideryStyle && colorPreference);
    if (step === 2) return measurementsSaved;
    return Boolean(contactPhone.trim());
  }

  async function submitAll() {
    if (!canProceed() || !frontImage || !backImage) {
      setError("Please complete all required fields before submitting.");
      return;
    }

    setBusy("submit");
    setError(null);
    try {
      const res = await fetch("/api/backend/uploaded-designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designTitle: outfitType,
          inspirationNote,
          frontImageUrl: frontImage.url,
          sideImageUrl: sideImage?.url,
          backImageUrl: backImage.url,
          detailImageUrl: detailImage?.url,
          fabricType,
          embroideryStyle,
          colorPreference,
          measurementSnapshot: {
            gender,
            outfitType,
            ...Object.fromEntries(Object.entries(measurements).map(([key, value]) => [key, Number(value)])),
            tailorNote: measurementNote,
          },
          contactPhone,
          familyGroupId,
          eventId,
        }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Could not submit design");
      }
      const payload = await res.json();
      if (familyGroupId) {
        router.push(`/family-group/${familyGroupId}?selected=custom-design`);
        router.refresh();
        return;
      }
      if (eventId) {
        router.push(`/event/${eventId}?selected=custom-design`);
        router.refresh();
        return;
      }
      setSubmittedNumber(payload?.data?.submissionNumber ?? "YBL-CD");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(null);
    }
  }

  if (submittedNumber) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-4 py-16 text-center">
        <div>
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/20 text-primary">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="mt-7 font-heading text-3xl font-bold">Design Request Submitted!</h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-7 text-muted-foreground">
            Your custom design order <span className="font-black text-primary">{submittedNumber}</span> has been received.
            A confirmation email has been sent to you. Our team will be in touch within 1-2 business days.
          </p>
          <div className="mt-7 rounded-xl border border-primary/40 bg-primary/10 p-5 text-left text-sm leading-7 text-primary">
            <p className="font-black">What happens next?</p>
            <p>1. Our tailors review your design images and requirements.</p>
            <p>2. We may call or message you via WhatsApp for missing details.</p>
            <p>3. We send you a detailed price quote.</p>
            <p>4. Once you approve the quote and payment is confirmed, we begin production (30-45 days).</p>
            <p>5. Your finished garment is shipped worldwide with tracking.</p>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            {familyGroupId ? (
              <Link href={`/family-group/${familyGroupId}`} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary/90">
                Return to Group Order
              </Link>
            ) : null}
            {eventId ? (
              <Link href={`/event/${eventId}`} className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary/90">
                Return to Event Match-Up
              </Link>
            ) : null}
            <Link href="/catalog" className="rounded-lg border border-border px-5 py-2 text-sm font-bold hover:bg-secondary">
              Browse Collection
            </Link>
            <Link href="/my-orders" className="rounded-lg bg-primary px-5 py-2 text-sm font-bold text-black hover:bg-primary/90">
              My Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[680px] space-y-7 px-4 py-12 sm:px-6 lg:px-0">
      <PageHeader step={step} setStep={setStep} />

      {step === 0 ? (
        <>
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-4">
              <h2 className="flex items-center gap-2 font-heading text-2xl font-bold">
                <Palette className="h-5 w-5 text-primary" />
                Your Design References
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">Upload photos of the style you have in mind. Front and back views are required.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <UploadSlot tag="Front View" icon="👕" label="Upload Front View Picture" required value={frontImage} busy={busy === "front"} onUpload={(file) => handleUpload("front", file)} />
              <UploadSlot tag="Side View" icon="👔" label="Upload Side View Picture" value={sideImage} busy={busy === "side"} onUpload={(file) => handleUpload("side", file)} />
              <UploadSlot tag="Back View" icon="🔁" label="Upload Back View Picture" required value={backImage} busy={busy === "back"} onUpload={(file) => handleUpload("back", file)} />
              <UploadSlot tag="Detail Close-Up" icon="🪡" label="Upload Embroidery / Pattern Close-up" value={detailImage} busy={busy === "detail"} onUpload={(file) => handleUpload("detail", file)} />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h3 className="mb-4 text-sm font-black text-foreground">What type of outfit is this? <span className="text-primary">*</span></h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {outfitTypes.map((option) => (
                <ChoiceButton key={option} label={option} selected={outfitType === option} onClick={() => setOutfitType(option)} />
              ))}
            </div>
          </section>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-xl font-bold">Fabric Preference</h2>
            <p className="mt-4 text-xs text-muted-foreground">Select the base fabric material for your garment.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {fabricOptions.map((option) => (
                <ChoiceButton key={option} label={option} selected={fabricType === option} onClick={() => setFabricType(option)} />
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-xl font-bold">Embroidery & Tilet (ጥልፍ)</h2>
            <p className="mt-5 text-xs text-muted-foreground">Embroidery Type <span className="text-primary">*</span></p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {embroideryOptions.map((option) => (
                <ChoiceButton key={option} label={option} selected={embroideryStyle === option} onClick={() => setEmbroideryStyle(option)} />
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Primary Color Theme <span className="text-primary">*</span></p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {colorOptions.map((option) => (
                <ChoiceButton key={option} label={option} selected={colorPreference === option} onClick={() => setColorPreference(option)} />
              ))}
            </div>
          </section>
        </>
      ) : null}

      {step === 2 ? (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-3 font-heading text-2xl font-bold">
            <Ruler className="h-5 w-5 text-primary" />
            Sizing
          </h2>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <span className="font-heading text-base font-bold">Your Measurements</span>
            <span className="ml-auto inline-flex items-center gap-2 text-xs font-bold text-primary"><BookOpen className="h-4 w-4" /> Measuring Guides</span>
            <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-black text-white">
              <Play className="h-3.5 w-3.5" /> Watch Video: How to Measure
            </button>
          </div>
          <div className="mt-5 rounded-lg border border-primary/40 bg-primary/15 p-4 text-xs">
            <p className="font-black text-primary">Please measure in centimeters (cm) only.</p>
            <p className="mt-1 text-muted-foreground">Do not use inches — all values must be entered in CM to ensure a perfect fit.</p>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">Select Gender <span className="text-primary">*</span></p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => setGender("female")} className={`h-12 rounded-xl border text-sm font-bold ${gender === "female" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>👗 Women</button>
            <button type="button" onClick={() => setGender("male")} className={`h-12 rounded-xl border text-sm font-bold ${gender === "male" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>👔 Men</button>
          </div>
          {measurementsSaved ? (
            <div className="mt-5 rounded-xl border border-primary/50 bg-primary/10 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="inline-flex items-center gap-2 text-sm font-black text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                  Measurements saved
                </p>
                <button type="button" onClick={() => setMeasurementsSaved(false)} className="text-xs text-muted-foreground underline hover:text-foreground">
                  Edit
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-5 rounded-xl border border-border p-4">
                <h3 className="font-black text-primary">👔 Shirt / Coat / Blazer Measurements</h3>
                <p className="mt-1 border-b border-primary/30 pb-3 text-xs text-muted-foreground">Measurements for the top garment — shirt, suit coat, or blazer</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {measurementFields.map(([key, label, hint]) => (
                    <label key={key} className="text-xs text-muted-foreground">
                      {label} <span className="text-primary">*</span>
                      <div className="mt-1 flex h-10 items-center rounded-lg border border-border bg-background px-3 focus-within:border-primary">
                        <input
                          type="number"
                          min="0"
                          value={measurements[key] ?? ""}
                          onChange={(event) => {
                            setMeasurementsSaved(false);
                            setMeasurements((current) => ({ ...current, [key]: event.target.value }));
                          }}
                          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                          placeholder="0.0"
                        />
                        <span className="text-[10px] font-black text-primary">cm</span>
                      </div>
                      <span className="mt-1 block text-[10px]">{hint}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="button" className="mt-5 flex h-12 w-full items-center justify-between rounded-xl border border-border px-4 text-left text-sm font-black">
                <span>👖 Add Men&apos;s Pants Measurements</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              <div className="mt-5 overflow-hidden rounded-xl border border-primary/40">
                <div className="flex gap-3 border-b border-primary/30 bg-primary/5 p-4">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/20">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black">A Message to Our Tailors</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Is there anything specific you&apos;d like our tailors to know? Share any fit preferences, design details, or special instructions.
                    </p>
                  </div>
                </div>
                <div className="p-4 text-sm">
                  {measurementNoteOpen ? (
                    <textarea
                      value={measurementNote}
                      onChange={(event) => setMeasurementNote(event.target.value)}
                      className="min-h-24 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary"
                      placeholder="Add your note here..."
                    />
                  ) : (
                    <p className="italic text-muted-foreground">{measurementNote || "No note added."}</p>
                  )}
                  <button type="button" onClick={() => setMeasurementNoteOpen((open) => !open)} className="mt-4 text-xs font-black text-primary">
                    ✎ {measurementNoteOpen ? "Done" : "Add a note to our tailors"}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const complete = measurementFields.every(([key]) => Number(measurements[key] ?? 0) > 0);
                  if (!complete) {
                    setError("Please enter all required measurements before saving.");
                    return;
                  }
                  setError(null);
                  setMeasurementsSaved(true);
                }}
                className="mt-5 h-11 w-full rounded-lg bg-primary/60 text-sm font-bold text-black hover:bg-primary"
              >
                Save Measurements
              </button>
            </>
          )}
        </section>
      ) : null}

      {step === 3 ? (
        <>
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="flex items-center gap-3 font-heading text-2xl font-bold">
              <Phone className="h-5 w-5 text-primary" />
              Contact for Follow-Up
            </h2>
            <p className="mt-4 text-xs text-muted-foreground">We&apos;ll send your quote and production updates via WhatsApp.</p>
            <label className="mt-4 block text-xs text-muted-foreground">
              Mobile Phone Number (WhatsApp Preferred) <span className="text-primary">*</span>
              <div className="mt-1 flex gap-2">
                <select className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground">
                  <option>ET +251</option>
                  <option>US +1</option>
                </select>
                <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-primary bg-background px-3 text-sm text-foreground outline-none" />
              </div>
            </label>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-2xl font-bold">Special Instructions & Tailor Remarks</h2>
            <p className="mt-4 text-xs text-muted-foreground">Optional but highly recommended — the more detail you provide, the better the outcome.</p>
            <textarea
              value={inspirationNote}
              maxLength={800}
              onChange={(event) => setInspirationNote(event.target.value)}
              className="mt-4 min-h-40 w-full rounded-xl border border-border bg-background p-4 text-sm text-foreground outline-none focus:border-primary"
              placeholder="Please describe any specific adjustments, color combinations, lining preferences, or deadlines our tailors need to know..."
            />
            <p className="mt-2 text-right text-xs text-muted-foreground">{inspirationNote.length} / 800</p>
          </section>

          <section className="rounded-2xl border border-primary/40 bg-primary/10 p-5 text-sm">
            <h3 className="font-black text-primary">Order Summary</h3>
            <div className="mt-3 grid grid-cols-[130px_1fr] gap-y-1 text-xs">
              <span className="font-bold text-foreground">Outfit:</span><span className="text-muted-foreground">{outfitType}</span>
              <span className="font-bold text-foreground">Fabric:</span><span className="text-muted-foreground">{fabricType}</span>
              <span className="font-bold text-foreground">Embroidery:</span><span className="text-muted-foreground">{embroideryStyle}</span>
              <span className="font-bold text-foreground">Color Theme:</span><span className="text-muted-foreground">{colorPreference}</span>
              <span className="font-bold text-foreground">Sizing:</span><span className="text-muted-foreground">Custom Measurements</span>
              <span className="font-bold text-foreground">Images:</span><span className="text-muted-foreground">{uploadedCount} uploaded</span>
            </div>
            <div className="mt-4 border-t border-primary/20 pt-3 text-xs text-muted-foreground">
              <p>Pricing is not fixed — our team will send a detailed quote within 1-2 business days after reviewing your design.</p>
              <p className="mt-1">No payment is taken at this step.</p>
            </div>
          </section>
        </>
      ) : null}

      {error ? <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0 || Boolean(busy)}
          className="h-11 rounded-lg border border-border bg-background text-sm font-bold disabled:opacity-50"
        >
          ← Back
        </button>
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}
            disabled={!canProceed() || Boolean(busy)}
            className="h-11 rounded-lg bg-primary text-sm font-bold text-black disabled:opacity-50"
          >
            Continue: {steps[step + 1]} →
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submitAll()}
            disabled={!canProceed() || busy === "submit"}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-black disabled:opacity-50"
          >
            {busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit Design Request ✨
          </button>
        )}
      </div>
    </div>
  );
}
