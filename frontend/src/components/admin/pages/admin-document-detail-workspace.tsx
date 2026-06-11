"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  MapPin,
  Package,
  Truck,
  User,
} from "lucide-react";
import { AdminDetailHeader, AdminDetailLayout } from "@/components/admin/admin-detail-layout";
import { AdminOrderDocuments } from "@/components/admin-order-documents";
import type { AdminWorkspaceData } from "@/lib/admin/types";

function formatCurrency(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function AdminDocumentDetailWorkspace({
  initialData,
  orderId,
}: {
  initialData: AdminWorkspaceData;
  orderId: string;
}) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [activeSection, setActiveSection] = useState("documents");
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

  const order = orderData as Record<string, any>;
  const isPickup = (order.fulfillmentType ?? "").toLowerCase() === "pickup";
  const shippingDocuments = (order.shippingDocuments ?? []).map((doc: any) => ({ ...doc, uploadedAt: doc.uploadedAt ?? undefined }));
  const pickupComplete = !isPickup || (Boolean(order.pickupIdUrl) && Boolean(order.pickupSignedDocUrl));
  const docsComplete = pickupComplete && (isPickup || shippingDocuments.length > 0);
  const needsReview = !pickupComplete || order.paymentStatus === "awaiting_verification";

  const sections = [
    { id: "documents", label: "Upload Documents", icon: FileCheck },
    { id: "fulfillment", label: "Delivery Details", icon: isPickup ? MapPin : Truck },
    { id: "payment", label: "Payment Proof", icon: Banknote },
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
      {activeSection === "documents" && (
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Required Documents</h2>
                <p className="text-sm font-medium text-slate-500">
                  {isPickup ? "Upload pickup ID and signed collection form." : "Upload waybills and shipping proofs."}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${docsComplete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                {docsComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                {docsComplete ? "Complete" : "Pending"}
              </span>
            </div>
            
            <AdminOrderDocuments
              orderId={order.id}
              pickupIdUrl={order.pickupIdUrl}
              pickupSignedDocUrl={order.pickupSignedDocUrl}
              pickupProofUrl={order.pickupProofUrl}
              shippingDocuments={shippingDocuments}
            />
          </div>
        </div>
      )}

      {activeSection === "fulfillment" && (
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 border-b border-slate-100 pb-4 text-lg font-black text-slate-900 uppercase tracking-tight">
              {isPickup ? "Pickup Details" : "Shipping Details"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {isPickup ? (
                <>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pickup Location</p>
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <MapPin className="h-4 w-4 text-violet-500" />
                      {order.pickupLocation ?? "Not set"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Pickup Person</p>
                    <p className="text-sm font-medium text-slate-900">{order.pickupPersonName ?? "Not set"}</p>
                    {order.pickupPersonPhone && <p className="text-xs text-slate-500">{order.pickupPersonPhone}</p>}
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Carrier</p>
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <Truck className="h-4 w-4 text-blue-500" />
                      {order.carrier ?? "Not specified"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Destination</p>
                    <p className="text-sm font-medium text-slate-900">
                      {order.shippingAddress?.city ?? "City not set"}
                      {order.shippingAddress?.country ? `, ${order.shippingAddress.country}` : ""}
                    </p>
                    {order.shippingAddress?.street && <p className="text-xs text-slate-500">{order.shippingAddress.street}</p>}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 border-b border-slate-100 pb-4 text-lg font-black text-slate-900 uppercase tracking-tight">
              Order Items
            </h2>
            <div className="space-y-2">
              {((order.items ?? []) as any[]).map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                  <Package className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="font-bold text-slate-900">{item.productName ?? item.product_name ?? "Item"}</span>
                  {(item.priceUsd ?? item.price) && (
                    <span className="ml-auto font-black text-blue-600">{formatCurrency(item.priceUsd ?? item.price)}</span>
                  )}
                </div>
              ))}
              {(!order.items || order.items.length === 0) && (
                <p className="text-sm text-slate-500 py-2">No items recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === "payment" && (
        <div className="space-y-4">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 border-b border-slate-100 pb-4 text-lg font-black text-slate-900 uppercase tracking-tight">ETB Payment Proof</h2>
            
            {order.paymentProofUrl ? (
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-900">Proof Submitted</p>
                  <p className="text-xs font-medium text-emerald-700 mt-1">
                    The customer has uploaded an ETB payment receipt.
                  </p>
                </div>
                <a
                  href={order.paymentProofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <FileCheck className="h-4 w-4" /> View Receipt
                </a>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                <Banknote className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No Proof Uploaded</p>
                <p className="text-xs text-slate-400 mt-1">This order does not have an ETB payment proof attached.</p>
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
               <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Value</p>
                  <p className="text-lg font-black text-slate-900">{formatCurrency(order.totalUsd)}</p>
               </div>
               <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Status</p>
                  <p className="text-sm font-bold text-slate-900 capitalize">{(order.paymentStatus ?? "pending").replace(/_/g, " ")}</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </AdminDetailLayout>
  );
}
