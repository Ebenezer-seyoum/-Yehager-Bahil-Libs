"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, MapPin, Truck, XCircle } from "lucide-react";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import { TableHeader, TableHeadRow, TableHeadCell } from "@/components/admin/table-header";
import { ADMIN_TABLE_WRAPPER } from "@/lib/admin/admin-design-system";
import { cn } from "@/lib/utils";

type ShippingDocument = { url: string; label: string; uploadedAt?: string };
type OrderItem = {
  productName?: string | null;
  product_name?: string | null;
  productImage?: string | null;
  product_image?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  customDesignImages?: string[] | null;
  custom_design_images?: string[] | null;
  productImages?: string[] | null;
  product_images?: string[] | null;
  measurementSnapshot?: Record<string, unknown> | null;
  measurement_snapshot?: Record<string, unknown> | null;
};
type Order = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
  paymentProofUrl?: string | null;
  fulfillmentType?: string | null;
  carrier?: string | null;
  pickupIdUrl?: string | null;
  pickupSignedDocUrl?: string | null;
  pickupProofUrl?: string | null;
  shippingDocuments?: ShippingDocument[] | null;
  items?: OrderItem[] | null;
  measurements?: Record<string, unknown> | null;
  measurementSnapshot?: Record<string, unknown> | null;
  measurement_snapshot?: Record<string, unknown> | null;
  createdAt?: string | null;
  orderDate?: string | null;
  orderType?: string | null;
  orderMode?: string | null;
};

function hasImage(order: Order) {
  return (order.items ?? []).some((item) =>
    Boolean(
      item.productImage ||
        item.product_image ||
        item.imageUrl ||
        item.image_url ||
        item.customDesignImages?.length ||
        item.custom_design_images?.length ||
        item.productImages?.length ||
        item.product_images?.length,
    ),
  );
}

function hasMeasurement(order: Order) {
  const values = [order.measurements, order.measurementSnapshot, order.measurement_snapshot, ...(order.items ?? []).flatMap((item) => [item.measurementSnapshot, item.measurement_snapshot])];
  return values.some((record) => record && Object.values(record).some((value) => value !== null && value !== undefined && String(value).trim() !== ""));
}

function documentStatus(order: Order) {
  const pickup = String(order.fulfillmentType ?? order.carrier ?? "").toLowerCase() === "pickup";
  const bankTransfer = order.paymentMethod === "etb_bank_transfer" || order.paymentCurrency === "ETB";
  const generated = {
    orderImage: hasImage(order),
    measurement: hasMeasurement(order),
    invoice: true,
    payment: bankTransfer ? Boolean(order.paymentProofUrl) : Boolean(order.paymentStatus),
  };
  const uploaded = {
    pickupId: pickup ? Boolean(order.pickupIdUrl) : true,
    pickupProof: pickup ? Boolean(order.pickupProofUrl || order.pickupSignedDocUrl) : true,
    shipping: pickup ? true : Boolean(order.shippingDocuments?.length),
  };
  const missing: string[] = [];
  if (!generated.orderImage) missing.push("Order item image");
  if (!generated.measurement) missing.push("Measurement sheet");
  if (!generated.payment) missing.push(bankTransfer ? "Payment proof" : "Payment transaction");
  if (!uploaded.pickupId) missing.push("Pickup ID");
  if (!uploaded.pickupProof) missing.push("Pickup proof");
  if (!uploaded.shipping) missing.push("Shipping document");
  return {
    pickup,
    generatedReady: Object.values(generated).filter(Boolean).length,
    uploadedReady: Object.values(uploaded).filter(Boolean).length,
    missing,
    complete: missing.length === 0,
  };
}

function StatusBadge({ ready }: { ready: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black", ready ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
      {ready ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {ready ? "Ready" : "Missing"}
    </span>
  );
}

function AdminDocumentsTable({ orders, onFilteredCountChange }: { orders: Order[]; onFilteredCountChange?: (count: number) => void }) {
  useEffect(() => {
    onFilteredCountChange?.(orders.length);
  }, [orders.length, onFilteredCountChange]);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
        <FileText className="mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-bold text-slate-500">No orders found in this view</p>
      </div>
    );
  }

  return (
    <div className={ADMIN_TABLE_WRAPPER}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <TableHeader>
            <TableHeadRow>
              <TableHeadCell>No</TableHeadCell>
              <TableHeadCell>Order ID</TableHeadCell>
              <TableHeadCell>Customer Name</TableHeadCell>
              <TableHeadCell>Delivery</TableHeadCell>
              <TableHeadCell>Generated Docs</TableHeadCell>
              <TableHeadCell>Uploaded Docs</TableHeadCell>
              <TableHeadCell>Missing Required</TableHeadCell>
              <TableHeadCell aria-label="Action">Action</TableHeadCell>
            </TableHeadRow>
          </TableHeader>
          <tbody>
            {orders.map((order, index) => {
              const status = documentStatus(order);
              return (
                <tr key={order.id} className={cn("border-b border-slate-200 last:border-b-0 hover:bg-blue-50/70", index % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                  <td className="px-4 py-5 font-black text-slate-500">{index + 1}</td>
                  <td className="px-4 py-5">
                    <Link href={`/admin/orders/documents/${order.id}`} className="font-mono text-xs font-black text-blue-800 underline-offset-4 hover:text-blue-950 hover:underline">
                      {order.orderNumber ?? `#${order.id.slice(0, 8)}`}
                    </Link>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">{order.createdAt || order.orderDate ? new Date(String(order.createdAt ?? order.orderDate)).toLocaleDateString() : "-"}</p>
                  </td>
                  <td className="px-4 py-5">
                    <p className="font-bold text-slate-950">{order.customerName ?? "Guest"}</p>
                    <p className="text-xs font-medium text-slate-500">{order.userEmail}</p>
                  </td>
                  <td className="px-4 py-5">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold", status.pickup ? "border-violet-200 bg-violet-50 text-violet-700" : "border-blue-200 bg-blue-50 text-blue-700")}>
                      {status.pickup ? <MapPin className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                      {status.pickup ? "Store Pickup" : "Mail / EMS"}
                    </span>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-2">
                      <StatusBadge ready={status.generatedReady >= 4} />
                      <span className="text-xs font-bold text-slate-500">{status.generatedReady}/4</span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-2">
                      <StatusBadge ready={status.uploadedReady >= 3} />
                      <span className="text-xs font-bold text-slate-500">{status.uploadedReady}/3</span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    {status.missing.length ? (
                      <p className="max-w-[260px] text-xs font-bold leading-5 text-amber-700">{status.missing.join(", ")}</p>
                    ) : (
                      <p className="text-xs font-black text-emerald-700">No missing required documents</p>
                    )}
                  </td>
                  <td className="px-4 py-5">
                    <DashboardTableActions>
                      <DashboardActionButton action="view" href={`/admin/orders/documents/${order.id}`} aria-label="View document details" />
                    </DashboardTableActions>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminDocumentsWorkspace({ data }: { data: AdminWorkspaceData }) {
  const [mandatoryOnly, setMandatoryOnly] = useState(false);

  return (
    <AdminWorkspace
      pageId="documents"
      initialData={data}
      title="Order Documents"
      subtitle="Track generated documents, payment proof, pickup files, and EMS shipping documents."
      icon={FileText}
      defaultTab="all"
      filterPlaceholder="Search by order #, customer, or email..."
      showRecordsBadge={false}
      hideKpis={true}
      filterActions={({ filteredData, search }) => {
        const needle = search.trim().toLowerCase();
        const orders = ((filteredData.orders ?? []) as Order[]).filter((order) => {
          const searchable = [order.orderNumber, order.customerName, order.userEmail, order.id].filter(Boolean).join(" ").toLowerCase();
          return !needle || searchable.includes(needle);
        });
        const mandatoryCount = orders.filter((order) => !documentStatus(order).complete).length;
        return (
          <button
            type="button"
            onClick={() => setMandatoryOnly((value) => !value)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black",
              mandatoryOnly ? "border-amber-300 bg-amber-100 text-amber-800" : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            Mandatory {mandatoryCount}
          </button>
        );
      }}
    >
      {({ filteredData, search, setDisplayedRecordsCount }) => {
        const orders = (filteredData.orders ?? []) as Order[];
        const needle = search.trim().toLowerCase();
        const displayed = orders.filter((order) => {
          const status = documentStatus(order);
          const searchable = [order.orderNumber, order.customerName, order.userEmail, order.id].filter(Boolean).join(" ").toLowerCase();
          if (needle && !searchable.includes(needle)) return false;
          if (mandatoryOnly) return !status.complete;
          return true;
        });

        return (
          <div className="space-y-4">
            <AdminDocumentsTable orders={displayed} onFilteredCountChange={setDisplayedRecordsCount} />
          </div>
        );
      }}
    </AdminWorkspace>
  );
}
