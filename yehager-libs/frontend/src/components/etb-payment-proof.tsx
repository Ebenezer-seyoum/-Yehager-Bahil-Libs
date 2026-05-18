"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SignedUpload = {
  cloudName: string;
  apiKey: string;
  folder: string;
  publicId?: string;
  timestamp: number;
  signature: string;
};

export function EtbPaymentProof({
  orderId,
  orderNumber,
  totalEtb,
  etbExchangeRate,
}: {
  orderId: string;
  orderNumber: string;
  totalEtb: number;
  etbExchangeRate?: number | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadProof(selected: File) {
    setBusy(true);
    setError(null);
    try {
      const signRes = await fetch("/api/backend/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: "payments/etb-proofs" }),
      });
      if (!signRes.ok) throw new Error("Could not start upload");
      const signedPayload = (await signRes.json()) as { data: SignedUpload };
      const signed = signedPayload.data;

      const formData = new FormData();
      formData.append("file", selected);
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
      setProofUrl(uploadJson.secure_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitProof() {
    if (!proofUrl) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/backend/orders/${orderId}/etb-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentProofUrl: proofUrl }),
      });
      if (!res.ok) throw new Error("Could not submit payment proof");
      router.push(`/order-confirmation?order=${orderId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border-2 border-primary/40 bg-primary/10 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Amount to transfer</p>
        <p className="mt-2 font-heading text-4xl font-bold">{totalEtb.toLocaleString()} ETB</p>
        {etbExchangeRate ? <p className="mt-1 text-xs text-muted-foreground">Rate: 1 USD = {etbExchangeRate.toLocaleString()} ETB</p> : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold">Payment reference</p>
        <p className="mt-2 rounded-lg bg-secondary px-3 py-2 font-mono text-sm">{orderNumber}</p>
        <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>1. Transfer the exact ETB amount through your bank.</li>
          <li>2. Use the order number above as the payment reference.</li>
          <li>3. Upload the confirmation screenshot below.</li>
        </ol>
      </div>

      <div className="rounded-xl border-2 border-dashed border-border bg-card p-5">
        <p className="text-sm font-semibold">Upload payment proof</p>
        <input
          className="mt-3 block w-full text-sm"
          type="file"
          accept="image/*,application/pdf"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
            if (selected) void uploadProof(selected);
          }}
        />
        {file ? <p className="mt-2 text-xs text-muted-foreground">{file.name}</p> : null}
        {proofUrl ? <p className="mt-2 text-xs text-green-600">Proof uploaded successfully.</p> : null}
        {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      </div>

      <button
        type="button"
        disabled={!proofUrl || busy}
        onClick={() => void submitProof()}
        className="w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Processing..." : "I have completed the payment"}
      </button>
    </div>
  );
}
