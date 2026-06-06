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

type ShippingDocument = { url: string; label: string; uploadedAt?: string };

export function AdminOrderDocuments({
  orderId,
  pickupIdUrl,
  pickupSignedDocUrl,
  pickupProofUrl,
  shippingDocuments,
}: {
  orderId: string;
  pickupIdUrl?: string | null;
  pickupSignedDocUrl?: string | null;
  pickupProofUrl?: string | null;
  shippingDocuments?: ShippingDocument[] | null;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shippingLabel, setShippingLabel] = useState("Shipping document");

  async function uploadFile(type: "pickup_id" | "pickup_signed" | "pickup_proof" | "shipping_doc", file: File) {
    setBusyKey(type);
    setError(null);
    try {
      const signRes = await fetch("/api/backend/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: `orders/${orderId}` }),
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

      const saveRes = await fetch(`/api/backend/admin/orders/${orderId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          url: uploadJson.secure_url,
          label: type === "shipping_doc" ? shippingLabel : undefined,
        }),
      });
      if (!saveRes.ok) throw new Error("Could not save order document");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusyKey(null);
    }
  }

  async function removeShippingDocument(index: number) {
    setBusyKey(`remove-${index}`);
    setError(null);
    try {
      const res = await fetch(`/api/backend/admin/orders/${orderId}/documents`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      if (!res.ok) throw new Error("Could not remove document");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Removal failed");
    } finally {
      setBusyKey(null);
    }
  }

  const uploads = [
    { type: "pickup_id" as const, label: "Pickup ID", url: pickupIdUrl },
    { type: "pickup_signed" as const, label: "Signed pickup document", url: pickupSignedDocUrl },
    { type: "pickup_proof" as const, label: "Pickup proof", url: pickupProofUrl },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {uploads.map((item) => (
          <div key={item.type} className="rounded-lg border border-border p-3">
            <p className="text-sm font-medium">{item.label}</p>
            {item.url ? (
              <a className="mt-2 inline-block text-xs text-primary hover:underline" href={item.url} target="_blank" rel="noreferrer">
                View document
              </a>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Not uploaded yet.</p>
            )}
            <label className="mt-3 inline-flex cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary">
              {busyKey === item.type ? "Uploading..." : item.url ? "Replace" : "Upload"}
              <input
                className="hidden"
                type="file"
                accept="image/*,application/pdf"
                disabled={busyKey !== null}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(item.type, file);
                }}
              />
            </label>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-muted-foreground">Shipping document label</span>
            <input
              value={shippingLabel}
              onChange={(event) => setShippingLabel(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3"
            />
          </label>
          <label className="inline-flex cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {busyKey === "shipping_doc" ? "Uploading..." : "Upload shipping document"}
            <input
              className="hidden"
              type="file"
              accept="image/*,application/pdf"
              disabled={busyKey !== null}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadFile("shipping_doc", file);
              }}
            />
          </label>
        </div>

        <div className="mt-4 space-y-2">
          {(shippingDocuments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No shipping documents uploaded.</p>
          ) : (
            (shippingDocuments ?? []).map((doc, index) => (
              <div key={`${doc.url}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary/40 px-3 py-2 text-sm">
                <div>
                  <a href={doc.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                    {doc.label}
                  </a>
                  {doc.uploadedAt ? <p className="text-xs text-muted-foreground">{new Date(doc.uploadedAt).toLocaleString()}</p> : null}
                </div>
                <button
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() => void removeShippingDocument(index)}
                  className="text-xs text-destructive hover:underline disabled:opacity-60"
                >
                  {busyKey === `remove-${index}` ? "Removing..." : "Remove"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
