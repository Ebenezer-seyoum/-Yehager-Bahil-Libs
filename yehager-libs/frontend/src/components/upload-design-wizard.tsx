"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
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

const steps = ["Design", "Fabric & Style", "Measurements", "Contact & Submit"] as const;

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

function UploadSlot({
  label,
  required,
  value,
  onUpload,
  busy,
}: {
  label: string;
  required?: boolean;
  value: UploadedFileState | null;
  onUpload: (file: File) => Promise<void>;
  busy: boolean;
}) {
  return (
    <label className={`rounded-xl border-2 border-dashed p-5 text-center transition ${busy ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}>
      <input
        type="file"
        className="hidden"
        accept="image/*"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void onUpload(file);
        }}
      />
      <div className="space-y-2">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        </div>
        <p className="text-sm font-semibold">
          {label} {required ? <span className="text-destructive">*</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">{value ? value.name : "Click to upload image"}</p>
      </div>
    </label>
  );
}

export function UploadDesignWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState<null | "front" | "side" | "back" | "submit">(null);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const [designTitle, setDesignTitle] = useState("");
  const [inspirationNote, setInspirationNote] = useState("");
  const [fabricType, setFabricType] = useState("");
  const [embroideryStyle, setEmbroideryStyle] = useState("");
  const [colorPreference, setColorPreference] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactTelegram, setContactTelegram] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressCountry, setAddressCountry] = useState("");

  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [shoulderWidth, setShoulderWidth] = useState("");
  const [armLength, setArmLength] = useState("");
  const [torsoLength, setTorsoLength] = useState("");
  const [gender, setGender] = useState("female");

  const [frontImage, setFrontImage] = useState<UploadedFileState | null>(null);
  const [sideImage, setSideImage] = useState<UploadedFileState | null>(null);
  const [backImage, setBackImage] = useState<UploadedFileState | null>(null);

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  async function handleUpload(which: "front" | "side" | "back", file: File) {
    setError(null);
    setBusy(which);
    try {
      const url = await uploadToCloudinary(file, "upload-designs/references");
      const next = { url, name: file.name };
      if (which === "front") setFrontImage(next);
      if (which === "side") setSideImage(next);
      if (which === "back") setBackImage(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  function canProceed() {
    if (step === 0) return Boolean(designTitle.trim() && frontImage);
    if (step === 1) return Boolean(fabricType.trim() && embroideryStyle.trim());
    if (step === 2) return Boolean(gender && chest && waist && hips && shoulderWidth && armLength && torsoLength);
    return true;
  }

  async function submitAll() {
    if (!frontImage) {
      setError("Front image is required.");
      return;
    }
    setBusy("submit");
    setError(null);
    try {
      const res = await fetch("/api/backend/uploaded-designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designTitle,
          inspirationNote,
          frontImageUrl: frontImage.url,
          sideImageUrl: sideImage?.url,
          backImageUrl: backImage?.url,
          fabricType,
          embroideryStyle,
          colorPreference,
          measurementSnapshot: {
            gender,
            chest: Number(chest),
            waist: Number(waist),
            hips: Number(hips),
            shoulderWidth: Number(shoulderWidth),
            armLength: Number(armLength),
            torsoLength: Number(torsoLength),
          },
          contactPhone,
          contactTelegram,
          contactAddress: {
            street: addressStreet,
            city: addressCity,
            country: addressCountry,
          },
        }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Could not submit design");
      }
      setDoneMessage("Your design was submitted successfully. Our team will review it soon.");
      setTimeout(() => router.refresh(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Upload Your Own Design</p>
        <h1 className="mt-1 font-heading text-4xl font-bold">Bring your vision to life</h1>
        <p className="mt-2 text-sm text-muted-foreground">Share your design references and preferences. We will tailor your garment exactly as requested.</p>
        <div className="mt-4 h-2 rounded-full bg-secondary">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {steps.map((label, idx) => (
            <button
              type="button"
              key={label}
              onClick={() => setStep(idx)}
              className={`rounded-full px-3 py-1 text-xs ${idx === step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {idx + 1}. {label}
            </button>
          ))}
        </div>
      </div>

      {step === 0 ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Your Design References</h2>
          <label className="block text-sm">
            <span className="text-muted-foreground">Design title *</span>
            <input value={designTitle} onChange={(e) => setDesignTitle(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" placeholder="e.g. Wedding Habesha Kemis" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <UploadSlot label="Front View" required value={frontImage} busy={busy === "front"} onUpload={async (f) => handleUpload("front", f)} />
            <UploadSlot label="Side View" value={sideImage} busy={busy === "side"} onUpload={async (f) => handleUpload("side", f)} />
            <UploadSlot label="Back View" value={backImage} busy={busy === "back"} onUpload={async (f) => handleUpload("back", f)} />
          </div>
          <label className="block text-sm">
            <span className="text-muted-foreground">Notes for our tailors</span>
            <textarea value={inspirationNote} onChange={(e) => setInspirationNote(e.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-input bg-background p-3" placeholder="Mention motifs, sleeves, neckline, fit preference..." />
          </label>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Fabric & Style</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-muted-foreground">Fabric type *</span>
              <input value={fabricType} onChange={(e) => setFabricType(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" placeholder="e.g. Cotton, Tilf..." />
            </label>
            <label className="text-sm">
              <span className="text-muted-foreground">Embroidery style *</span>
              <input value={embroideryStyle} onChange={(e) => setEmbroideryStyle(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" placeholder="e.g. Traditional hand embroidery" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="text-muted-foreground">Color preference</span>
              <input value={colorPreference} onChange={(e) => setColorPreference(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" placeholder="e.g. White with gold tibeb" />
            </label>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Measurements</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="text-muted-foreground">Gender *</span>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3">
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="unisex">Unisex</option>
              </select>
            </label>
            <label className="text-sm"><span className="text-muted-foreground">Chest (cm) *</span><input value={chest} onChange={(e) => setChest(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
            <label className="text-sm"><span className="text-muted-foreground">Waist (cm) *</span><input value={waist} onChange={(e) => setWaist(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
            <label className="text-sm"><span className="text-muted-foreground">Hips (cm) *</span><input value={hips} onChange={(e) => setHips(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
            <label className="text-sm"><span className="text-muted-foreground">Shoulder Width (cm) *</span><input value={shoulderWidth} onChange={(e) => setShoulderWidth(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
            <label className="text-sm"><span className="text-muted-foreground">Arm Length (cm) *</span><input value={armLength} onChange={(e) => setArmLength(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
            <label className="text-sm"><span className="text-muted-foreground">Torso Length (cm) *</span><input value={torsoLength} onChange={(e) => setTorsoLength(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">Contact & Submit</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm"><span className="text-muted-foreground">Phone</span><input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
            <label className="text-sm"><span className="text-muted-foreground">Telegram</span><input value={contactTelegram} onChange={(e) => setContactTelegram(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
            <label className="text-sm sm:col-span-2"><span className="text-muted-foreground">Street</span><input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
            <label className="text-sm"><span className="text-muted-foreground">City</span><input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
            <label className="text-sm"><span className="text-muted-foreground">Country</span><input value={addressCountry} onChange={(e) => setAddressCountry(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3" /></label>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            After submission, admin can approve or reject your design request. If approved, it is automatically converted to an order.
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
      {doneMessage ? <div className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600"><CheckCircle2 className="h-4 w-4" />{doneMessage}</div> : null}

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="rounded-lg border border-border px-4 py-2 text-sm disabled:opacity-50">
          Back
        </button>
        {step < steps.length - 1 ? (
          <button type="button" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={!canProceed()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            Continue
          </button>
        ) : (
          <button type="button" onClick={() => void submitAll()} disabled={busy === "submit"} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {busy === "submit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit Design
          </button>
        )}
      </div>
    </div>
  );
}
