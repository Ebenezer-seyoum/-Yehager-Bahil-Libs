"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  ImageIcon,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { can } from "@/lib/permissions";
import { uploadFileToS3 } from "@/lib/uploads";
import { cn } from "@/lib/utils";

type ShippingDocument = { url: string; label: string; uploadedAt?: string };
type UploadType = "pickup_id" | "pickup_proof" | "shipping_doc";
type UploadRow = {
  key: string;
  type: UploadType;
  label: string;
  helper: string;
  url?: string | null;
  required: boolean;
  fixedLabel?: string;
};

const ACCEPTED_DOCUMENT_TYPES =
  "image/*,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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
  const canDownload =
    can(permissions, "documents.download") ||
    can(permissions, "documents.view");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function uploadedByLabel(label: string) {
    return (shippingDocuments ?? []).find(
      (doc) => doc.label?.toLowerCase() === label.toLowerCase(),
    );
  }

  async function uploadFile(item: UploadRow, file: File) {
    setBusyKey(item.key);
    setError(null);
    try {
      const uploadUrl = await uploadFileToS3(file, `orders/${orderId}`);

      const saveRes = await fetch(
        `/api/backend/admin/orders/${orderId}/documents`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: item.type,
            url: uploadUrl,
            label: item.fixedLabel ?? item.label,
          }),
        },
      );
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
      const res = await fetch(
        `/api/backend/admin/orders/${orderId}/documents`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index }),
        },
      );
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
        {
          key: "pickup_id",
          type: "pickup_id" as const,
          label: "Pickup QR / Order ID",
          helper:
            "Customer order ID, QR, or approved pickup identity document.",
          url: pickupIdUrl,
          required: true,
        },
        {
          key: "pickup_proof",
          type: "pickup_proof" as const,
          label: "Pickup Proof",
          helper:
            "Signed handover document, pickup confirmation, or proof photo.",
          url: pickupProofUrl ?? pickupSignedDocUrl,
          required: true,
        },
        {
          key: "pickup_package_photo",
          type: "shipping_doc" as const,
          label: "Package Photo",
          fixedLabel: "Package Photo",
          helper: "Final packed order image before customer handover.",
          url: uploadedByLabel("Package Photo")?.url,
          required: true,
        },
        {
          key: "pickup_delivery_proof",
          type: "shipping_doc" as const,
          label: "Delivery Proof",
          fixedLabel: "Delivery Proof",
          helper: "Final pickup completion proof after handover.",
          url: uploadedByLabel("Delivery Proof")?.url,
          required: true,
        },
      ]
    : [
        {
          key: "shipping_label",
          type: "shipping_doc" as const,
          label: "Shipping Label",
          fixedLabel: "Shipping Label",
          helper: "EMS label, waybill, or printable shipping slip.",
          url: uploadedByLabel("Shipping Label")?.url,
          required: true,
        },
        {
          key: "courier_receipt",
          type: "shipping_doc" as const,
          label: "Courier Receipt",
          fixedLabel: "Courier Receipt",
          helper: "EMS counter receipt or courier acceptance document.",
          url: uploadedByLabel("Courier Receipt")?.url,
          required: true,
        },
        {
          key: "ems_package_photo",
          type: "shipping_doc" as const,
          label: "Package Photo",
          fixedLabel: "Package Photo",
          helper: "Photo of the packed parcel before EMS handoff.",
          url: uploadedByLabel("Package Photo")?.url,
          required: true,
        },
        {
          key: "ems_delivery_proof",
          type: "shipping_doc" as const,
          label: "Delivery Proof",
          fixedLabel: "Delivery Proof",
          helper:
            "Delivery confirmation, signed proof, or final carrier proof.",
          url: uploadedByLabel("Delivery Proof")?.url,
          required: true,
        },
      ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">
              {pickup
                ? "Pickup Document Uploads"
                : "EMS Shipping Document Uploads"}
            </p>
            <p className="text-xs font-semibold text-slate-500">
              Accepted formats: PDF, DOC, DOCX, JPG, PNG, and other image files.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
            <UploadCloud className="h-3.5 w-3.5" /> Professional Upload
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {uploadRows.map((item) => (
            <UploadCard
              key={item.key}
              label={item.label}
              helper={item.helper}
              url={item.url}
              required={item.required}
              busy={busyKey === item.key}
              disabled={
                busyKey !== null || (!item.url ? !canUpload : !canUpdate)
              }
              canDownload={canDownload}
              onFile={(file) => void uploadFile(item, file)}
            />
          ))}
        </div>

        {(shippingDocuments ?? []).length ? (
          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              Uploaded File History
            </p>
            {(shippingDocuments ?? []).map((doc, index) => (
              <div
                key={`${doc.url}-${index}`}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-black text-slate-950">
                    {doc.label || `Document ${index + 1}`}
                  </p>
                  {doc.uploadedAt ? (
                    <p className="text-xs font-semibold text-slate-500">
                      {new Date(doc.uploadedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-100"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </a>
                  {canDownload ? (
                    <a
                      href={doc.url}
                      download
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white hover:bg-slate-800"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      disabled={busyKey !== null}
                      onClick={() => void removeShippingDocument(index)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-600 px-3 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />{" "}
                      {busyKey === `remove-${index}` ? "Removing..." : "Remove"}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
          {error}
        </p>
      ) : null}
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
        <div
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
            url ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700",
          )}
        >
          {url ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : label.toLowerCase().includes("photo") ? (
            <ImageIcon className="h-5 w-5" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-slate-950">{label}</p>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-black",
                required
                  ? "bg-rose-100 text-rose-700"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {required ? "Required" : "Optional"}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-black",
                url
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700",
              )}
            >
              {url ? "Uploaded" : "Missing"}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-100"
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </a>
        ) : null}
        {url && canDownload ? (
          <a
            href={url}
            download
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        ) : null}
        <label
          className={cn(
            "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs font-black text-white",
            disabled
              ? "cursor-not-allowed bg-slate-300"
              : "bg-blue-700 hover:bg-blue-800",
          )}
        >
          <UploadCloud className="h-3.5 w-3.5" />{" "}
          {busy ? "Uploading..." : url ? "Replace" : "Upload"}
          <input
            className="hidden"
            type="file"
            accept={ACCEPTED_DOCUMENT_TYPES}
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
