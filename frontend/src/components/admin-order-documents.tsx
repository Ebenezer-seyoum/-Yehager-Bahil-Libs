"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Download, Eye, FileText, Trash2, UploadCloud } from "lucide-react";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type SignedUpload = {
  cloudName: string;
  apiKey: string;
  folder: string;
  publicId?: string;
  timestamp: number;
  signature: string;
};

type ShippingDocument = { url: string; label: string; uploadedAt?: string };
type UploadType = "pickup_id" | "pickup_proof" | "shipping_doc";

export function AdminOrderDocuments({
  orderId,
  pickupIdUrl,
  pickupSignedDocUrl,
  pickupProofUrl,
  shippingDocuments,
  pickup = false,
}: {
  orderId: string;
  pickupIdUrl?: string | null;
  pickupSignedDocUrl?: string | null;
  pickupProofUrl?: string | null;
  shippingDocuments?: ShippingDocument[] | null;
  pickup?: boolean;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const canUpload = can(permissions, "documents.upload");
  const canUpdate = can(permissions, "documents.update") || canUpload;
  const canDelete = can(permissions, "documents.delete");
  const canDownload = can(permissions, "documents.download") || can(permissions, "documents.view");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shippingLabel, setShippingLabel] = useState("EMS waybill / shipping document");

  async function uploadFile(type: UploadType, file: File) {
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

  const uploadRows = pickup
    ? [
        { type: "pickup_id" as const, label: "Pickup ID", helper: "Customer ID used for office handover.", url: pickupIdUrl, required: true },
        { type: "pickup_proof" as const, label: "Pickup Proof", helper: "Signed pickup paper or handover photo.", url: pickupProofUrl ?? pickupSignedDocUrl, required: true },
      ]
    : [];

  return (
    <div className="space-y-5">
      {uploadRows.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {uploadRows.map((item) => (
            <UploadCard
              key={item.type}
              label={item.label}
              helper={item.helper}
              url={item.url}
              required={item.required}
              busy={busyKey === item.type}
              disabled={busyKey !== null || (!item.url ? !canUpload : !canUpdate)}
              canDownload={canDownload}
              onFile={(file) => void uploadFile(item.type, file)}
            />
          ))}
        </div>
      ) : null}

      {!pickup ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs font-black uppercase tracking-widest text-slate-500">Shipping Document Label</span>
              <input
                value={shippingLabel}
                onChange={(event) => setShippingLabel(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className={cn("inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white", canUpload && busyKey === null ? "bg-blue-700 hover:bg-blue-800" : "cursor-not-allowed bg-slate-300")}>
              <UploadCloud className="h-4 w-4" />
              {busyKey === "shipping_doc" ? "Uploading..." : "Upload Shipping Document"}
              <input
                className="hidden"
                type="file"
                accept="image/*,application/pdf"
                disabled={busyKey !== null || !canUpload}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile("shipping_doc", file);
                }}
              />
            </label>
          </div>

          <div className="mt-4 space-y-2">
            {(shippingDocuments ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">No shipping documents uploaded.</div>
            ) : (
              (shippingDocuments ?? []).map((doc, index) => (
                <div key={`${doc.url}-${index}`} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-slate-950">{doc.label || `Shipping Document ${index + 1}`}</p>
                    {doc.uploadedAt ? <p className="text-xs font-semibold text-slate-500">{new Date(doc.uploadedAt).toLocaleString()}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-100">
                      <Eye className="h-3.5 w-3.5" /> Preview
                    </a>
                    {canDownload ? (
                      <a href={doc.url} download className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white hover:bg-slate-800">
                        <Download className="h-3.5 w-3.5" /> Download
                      </a>
                    ) : null}
                    {canDelete ? (
                      <button type="button" disabled={busyKey !== null} onClick={() => void removeShippingDocument(index)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-60">
                        <Trash2 className="h-3.5 w-3.5" /> {busyKey === `remove-${index}` ? "Removing..." : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</p> : null}
    </div>
  );
}

function UploadCard({
  label,
  helper,
  url,
  required,
  busy,
  disabled,
  canDownload,
  onFile,
}: {
  label: string;
  helper: string;
  url?: string | null;
  required?: boolean;
  busy: boolean;
  disabled: boolean;
  canDownload: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-slate-950">{label}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", required ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600")}>{required ? "Required" : "Optional"}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black", url ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{url ? "Uploaded" : "Missing"}</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-100">
            <Eye className="h-3.5 w-3.5" /> Preview
          </a>
        ) : null}
        {url && canDownload ? (
          <a href={url} download className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white hover:bg-slate-800">
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        ) : null}
        <label className={cn("inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-black text-white", disabled ? "cursor-not-allowed bg-slate-300" : "bg-blue-700 hover:bg-blue-800")}>
          <UploadCloud className="h-3.5 w-3.5" /> {busy ? "Uploading..." : url ? "Replace" : "Upload"}
          <input
            className="hidden"
            type="file"
            accept="image/*,application/pdf"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </label>
      </div>
    </div>
  );
}
