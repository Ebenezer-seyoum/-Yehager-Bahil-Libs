"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  MapPin,
  Truck,
} from "lucide-react";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import { TableHeader, TableHeadRow, TableHeadCell } from "@/components/admin/table-header";
import { ADMIN_TABLE_WRAPPER } from "@/lib/admin/admin-design-system";

type ShippingDocument = { url: string; label: string; uploadedAt?: string };
type Order = {
  id: string;
  orderNumber?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  totalUsd?: number | string | null;
  status?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentCurrency?: string | null;
  paymentProofUrl?: string | null;
  fulfillmentType?: string | null;
  carrier?: string | null;
  shippingAddress?: { street?: string | null; city?: string | null; country?: string | null } | null;
  pickupLocation?: string | null;
  pickupPersonName?: string | null;
  pickupPersonPhone?: string | null;
  pickupIdUrl?: string | null;
  pickupSignedDocUrl?: string | null;
  pickupProofUrl?: string | null;
  shippingDocuments?: ShippingDocument[] | null;
  items?: { productName?: string | null; product_name?: string | null; priceUsd?: number | string | null; price?: number | string | null; familyMemberName?: string | null; family_member_name?: string | null }[] | null;
  createdAt?: string | null;
  orderDate?: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:          { label: "Pending",          cls: "bg-amber-100 text-amber-800 border-amber-200" },
  tailoring:        { label: "Tailoring",         cls: "bg-violet-100 text-violet-800 border-violet-200" },
  quality_check:    { label: "Quality Check",     cls: "bg-purple-100 text-purple-800 border-purple-200" },
  shipped:          { label: "Shipped",           cls: "bg-blue-100 text-blue-800 border-blue-200" },
  delivered:        { label: "Delivered",         cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  ready_for_pickup: { label: "Ready for Pickup",  cls: "bg-orange-100 text-orange-800 border-orange-200" },
  picked_up:        { label: "Picked Up",         cls: "bg-green-200 text-green-900 border-green-300" },
  cancelled:        { label: "Cancelled",         cls: "bg-red-100 text-red-700 border-red-200" },
};

const PAYMENT_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:               { label: "Pending",            cls: "bg-amber-100 text-amber-800 border-amber-200" },
  awaiting_verification: { label: "Awaiting Verify",    cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  paid:                  { label: "Paid",               cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  failed:                { label: "Failed",             cls: "bg-red-100 text-red-700 border-red-200" },
  refunded:              { label: "Refunded",           cls: "bg-gray-100 text-gray-700 border-gray-200" },
  unpaid:                { label: "Unpaid",             cls: "bg-orange-100 text-orange-800 border-orange-200" },
};

function formatCurrency(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function badge(config: Record<string, { label: string; cls: string }>, key?: string | null) {
  const k = (key ?? "pending").toLowerCase();
  const found = config[k] ?? { label: k.replace(/_/g, " "), cls: "bg-gray-100 text-gray-700 border-gray-200" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${found.cls}`}>
      {found.label}
    </span>
  );
}

function AdminDocumentsTable({ orders, onFilteredCountChange }: { orders: Order[]; onFilteredCountChange?: (count: number) => void }) {
  useEffect(() => {
    onFilteredCountChange?.(orders.length);
  }, [orders.length, onFilteredCountChange]);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">No orders found in this view</p>
        <p className="mt-1 text-xs text-muted-foreground/60">Try switching tabs or clearing filters</p>
      </div>
    );
  }

  return (
    <div className={ADMIN_TABLE_WRAPPER}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1240px] border-collapse text-left text-sm">
          <TableHeader>
            <TableHeadRow>
              <TableHeadCell className="w-14">No</TableHeadCell>
              <TableHeadCell>Order Details</TableHeadCell>
              <TableHeadCell>Customer</TableHeadCell>
              <TableHeadCell>Fulfillment</TableHeadCell>
              <TableHeadCell>Order Status</TableHeadCell>
              <TableHeadCell>Payment Status</TableHeadCell>
              <TableHeadCell aria-label="Action">Action</TableHeadCell>
            </TableHeadRow>
          </TableHeader>
          <tbody>
            {orders.map((order, index) => {
              const isPickup = (order.fulfillmentType ?? "").toLowerCase() === "pickup";
              const shippingDocuments = (order.shippingDocuments ?? []);
              const pickupComplete = !isPickup || (Boolean(order.pickupIdUrl) && Boolean(order.pickupSignedDocUrl));
              const docsComplete = pickupComplete && (isPickup || shippingDocuments.length > 0);
              const needsReview = !pickupComplete || order.paymentStatus === "awaiting_verification";

              return (
                <tr key={order.id} className={`border-b border-slate-200 last:border-b-0 hover:bg-blue-50/70 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                  <td className="px-4 py-5 align-middle">
                    <span className="text-sm font-semibold text-slate-600 inline-block">
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-5 align-middle">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-black text-blue-900">
                        {order.orderNumber ?? `#${order.id.slice(0, 8)}`}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium mt-1">
                        {order.createdAt || order.orderDate ? new Date(String(order.createdAt ?? order.orderDate)).toLocaleDateString() : "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-5 align-middle">
                    <p className="font-bold text-slate-950">{order.customerName ?? "Guest"}</p>
                    {order.userEmail && <p className="mt-0.5 text-xs text-slate-500">{order.userEmail}</p>}
                  </td>
                  <td className="px-4 py-5 align-middle">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold ${isPickup ? "border-violet-200 bg-violet-50 text-violet-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>
                      {isPickup ? <MapPin className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                      {isPickup ? "In-Store Pickup" : "Mailed"}
                    </span>
                  </td>
                  <td className="px-4 py-5 align-middle">
                    {badge(STATUS_CONFIG, order.status)}
                  </td>
                  <td className="px-4 py-5 align-middle">
                    {badge(PAYMENT_CONFIG, order.paymentStatus)}
                  </td>
                  <td className="px-4 py-5 align-middle">
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
  return (
    <AdminWorkspace
      pageId="documents"
      initialData={data}
      title="Order Documents"
      subtitle="Track, review, and manage all order-related documents — pickup IDs, signed forms, shipping proofs, and ETB payment receipts."
      icon={FileText}
      defaultTab="all"
      filterPlaceholder="Search by order #, customer, or email..."
      showRecordsBadge={false}
      hideKpis={true}
    >
      {({ filteredData, activeTab, search, setDisplayedRecordsCount }) => {
        const orders = (filteredData.orders ?? []) as Order[];

        // Client-side search within the active tab's results
        const needle = search.trim().toLowerCase();
        const displayed = needle
          ? orders.filter((o) =>
              [o.orderNumber, o.customerName, o.userEmail, o.id]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(needle)),
            )
          : orders;

        return (
          <div className="space-y-4">
            <AdminDocumentsTable orders={displayed} onFilteredCountChange={setDisplayedRecordsCount} />
          </div>
        );
      }}
    </AdminWorkspace>
  );
}
