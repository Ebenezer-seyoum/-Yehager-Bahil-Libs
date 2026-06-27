"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileText,
  ImageIcon,
  ReceiptText,
  Ruler,
  Truck,
  type LucideIcon,
  UploadCloud,
} from "lucide-react";
import { AdminDetailHeader, AdminDetailLayout } from "@/components/admin/admin-detail-layout";
import { AdminOrderDocuments } from "@/components/admin-order-documents";
import type { AdminWorkspaceData } from "@/lib/admin/types";

type OrderRecord = Record<string, unknown> & {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  fulfillmentType?: string | null;
  carrier?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
  paymentProofUrl?: string | null;
  pickupIdUrl?: string | null;
  pickupSignedDocUrl?: string | null;
  pickupProofUrl?: string | null;
  pickupLocation?: string | null;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
  shippingDocumentUrl?: string | null;
  shippingDocuments?: ShippingDocument[] | null;
  shippingAddress?: { street?: string | null; city?: string | null; country?: string | null } | null;
  totalUsd?: string | number | null;
  items?: Array<Record<string, unknown>> | null;
  measurements?: Record<string, unknown> | null;
  measurementSnapshot?: Record<string, unknown> | null;
  measurement_snapshot?: Record<string, unknown> | null;
};
type ShippingDocument = { url: string; label: string; uploadedAt?: string };

function hasValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function collectImages(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(collectImages);
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    return collectImages(row.url ?? row.imageUrl ?? row.image_url ?? row.src ?? row.path);
  }
  return [];
}

function orderImages(order: OrderRecord) {
  return Array.from(new Set(
    ((order.items ?? []) as Array<Record<string, unknown>>).flatMap((item) => [
      ...collectImages(item.customDesignImages),
      ...collectImages(item.custom_design_images),
      ...collectImages(item.productImages),
      ...collectImages(item.product_images),
      ...collectImages(item.productImage),
      ...collectImages(item.product_image),
      ...collectImages(item.imageUrl),
      ...collectImages(item.image_url),
      ...collectImages((item.itemMetadata as Record<string, unknown> | undefined)?.front_image_url),
      ...collectImages((item.item_metadata as Record<string, unknown> | undefined)?.front_image_url),
    ]),
  ));
}

function hasMeasurements(order: OrderRecord) {
  const records = [
    order.measurements,
    order.measurementSnapshot,
    order.measurement_snapshot,
    ...((order.items ?? []) as Array<Record<string, unknown>>).flatMap((item) => [item.measurementSnapshot, item.measurement_snapshot, item.measurements]),
  ];
  return records.some((record) => record && typeof record === "object" && Object.values(record).some(hasValue));
}

function DocumentRow({
  doc,
  badge,
}: {
  doc: {
    label: string;
    icon: LucideIcon;
    status: boolean;
    helper: string;
    url?: string | null;
  };
  badge: "Generated" | "Uploaded";
}) {
  const Icon = doc.icon;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="break-words text-sm font-black text-slate-950">{doc.label}</p>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">{badge}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${doc.status ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {doc.status ? "Available" : "Missing"}
            </span>
          </div>
          <p className="mt-1 break-words text-xs font-semibold text-slate-500">{doc.helper}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {doc.url ? (
          <>
            <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-100">
              <Eye className="h-3.5 w-3.5" /> Preview
            </a>
            <a href={doc.url} download className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-black text-white hover:bg-slate-800">
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </>
        ) : (
          <span className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-500">
            {doc.status ? "Generated in order detail" : "Required data missing"}
          </span>
        )}
      </div>
    </div>
  );
}

export function AdminDocumentDetailWorkspace({
  initialData,
  orderId,
}: {
  initialData: AdminWorkspaceData;
  orderId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeSection, setActiveSection] = useState("view-documents");
  const [orderData, setOrderData] = useState(initialData.orders?.[0] || null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/backend/orders/${orderId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setOrderData(json.data ?? json);
      } catch (err) {
        console.error("Refresh error:", err);
      }
      router.refresh();
    });
  }, [orderId, router]);

  if (!orderData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Order not found.</p>
      </div>
    );
  }

  const order = orderData as OrderRecord;
  const isPickup = (order.fulfillmentType ?? "").toLowerCase() === "pickup";
  const shippingDocuments = (order.shippingDocuments ?? []).map((doc) => ({ ...doc, uploadedAt: doc.uploadedAt ?? undefined }));
  const pickupComplete = !isPickup || (Boolean(order.pickupIdUrl) && Boolean(order.pickupProofUrl || order.pickupSignedDocUrl));
  const docsComplete = pickupComplete && (isPickup || shippingDocuments.length > 0);
  const needsReview = !pickupComplete || order.paymentStatus === "awaiting_verification";
  const images = orderImages(order);
  const bankTransfer = order.paymentMethod === "etb_bank_transfer" || order.paymentCurrency === "ETB";
  const generatedDocs = [
    { label: "Order Item Image", icon: ImageIcon, status: images.length > 0, helper: `${images.length} image${images.length === 1 ? "" : "s"} available from order items.`, url: images[0] },
    { label: "Measurement Sheet", icon: Ruler, status: hasMeasurements(order), helper: "Generated from saved customer or group measurements.", url: null },
    { label: "Invoice", icon: ReceiptText, status: true, helper: "Generated from order items, totals, discount, shipping, and payment status.", url: null },
    { label: bankTransfer ? "Payment Proof" : "Stripe Transaction Document", icon: CreditCard, status: bankTransfer ? Boolean(order.paymentProofUrl) : Boolean(order.paymentStatus), helper: bankTransfer ? "Uploaded from the payment page for bank transfer review." : "Generated from Stripe/payment transaction status.", url: order.paymentProofUrl },
  ];
  const uploadedDocs = isPickup
    ? [
        { label: "Pickup ID", icon: FileText, status: Boolean(order.pickupIdUrl), helper: "Uploaded ID used for office pickup handover.", url: order.pickupIdUrl },
        { label: "Pickup Proof", icon: FileCheck, status: Boolean(order.pickupProofUrl || order.pickupSignedDocUrl), helper: "Uploaded signed pickup paper or handover proof.", url: order.pickupProofUrl ?? order.pickupSignedDocUrl },
      ]
    : shippingDocuments.map((doc, index) => ({
        label: doc.label || `Shipping Document ${index + 1}`,
        icon: Truck,
        status: Boolean(doc.url),
        helper: doc.uploadedAt ? `Uploaded ${new Date(doc.uploadedAt).toLocaleString()}` : "Uploaded EMS waybill, receipt, or shipping paper.",
        url: doc.url,
      }));

  const sections = [
    { id: "view-documents", label: "View Documents", icon: FileText },
    { id: "upload-documents", label: "Upload Documents", icon: UploadCloud },
  ];

  return (
    <AdminDetailLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      sections={sections}
      topHeader={
        <AdminDetailHeader
          icon={FileText}
          iconTheme={docsComplete ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}
          category="ORDER DOCUMENTS"
          title={order.orderNumber ?? `#${order.id.slice(0, 8)}`}
          subtitle={`Customer: ${order.customerName ?? "Guest"} | Fulfillment: ${isPickup ? "Pickup" : "Mailed"}`}
          onRefresh={refresh}
          onBack={() => router.push("/admin/orders/documents")}
          backLabel="All Documents"
        />
      }
      topNotice={
        needsReview ? (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Action Required</p>
              <p className="text-xs text-amber-700">This order is missing mandatory documents or requires payment verification.</p>
            </div>
          </div>
        ) : null
      }
    >
      {activeSection === "view-documents" && (
        <div className="space-y-5">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">View Documents</h2>
            <p className="text-sm font-medium text-slate-500">Generated documents and uploaded delivery documents for this order.</p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-500">Generated Documents</p>
              <div className="space-y-2">
                {generatedDocs.map((doc) => (
                  <DocumentRow key={doc.label} doc={doc} badge="Generated" />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-500">Uploaded Documents</p>
              <div className="space-y-2">
                {uploadedDocs.length ? (
                  uploadedDocs.map((doc) => <DocumentRow key={doc.label} doc={doc} badge="Uploaded" />)
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                    No uploaded delivery documents yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === "upload-documents" && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">Upload Documents</h2>
              <p className="text-sm font-medium text-slate-500">
                {isPickup ? "Upload Pickup ID and Pickup Proof for office pickup orders." : "Upload EMS waybill, receipt, tracking slip, or shipping document for mail delivery orders."}
              </p>
            </div>
            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${docsComplete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              {docsComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
              {docsComplete ? "Complete" : "Pending"}
            </span>
          </div>
          <AdminOrderDocuments
            orderId={order.id}
            pickupIdUrl={order.pickupIdUrl}
            pickupProofUrl={order.pickupProofUrl ?? order.pickupSignedDocUrl}
            shippingDocuments={shippingDocuments}
            pickup={isPickup}
          />
        </div>
      )}
    </AdminDetailLayout>
  );
}
