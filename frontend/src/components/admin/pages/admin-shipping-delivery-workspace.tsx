"use client";

import { useEffect, useMemo, useState } from "react";
import { Truck } from "lucide-react";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import type { AdminWorkspaceData } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type OrderRow = Record<string, unknown> & {
  id?: string;
  orderNumber?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  status?: string | null;
  fulfillmentType?: string | null;
  fulfillment_type?: string | null;
  carrier?: string | null;
  shippingProvider?: string | null;
  shipping_provider?: string | null;
  shippingAddress?: Record<string, unknown> | string | null;
  shipping_address?: Record<string, unknown> | string | null;
  deliveryStatus?: string | null;
  delivery_status?: string | null;
  shippingStatus?: string | null;
  shipping_status?: string | null;
  pickupStatus?: string | null;
  pickup_status?: string | null;
  pickupLocation?: string | null;
  pickup_location?: string | null;
  trackingNumber?: string | null;
  tracking_number?: string | null;
  deliveryStatusChangedAt?: string | number | Date | null;
  delivery_status_changed_at?: string | number | Date | null;
  updatedAt?: string | number | Date | null;
  createdAt?: string | number | Date | null;
  _method?: string;
  _provider?: string;
  _fulfillmentStatus?: string;
  _scope?: "catalog" | "custom";
  _parentOrderId?: string;
  workstreams?: Array<Record<string, unknown>> | null;
};

function norm(value: unknown) {
  return String(value ?? "").toLowerCase().trim();
}

function text(value: unknown, fallback = "-") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isPickup(order: OrderRow) {
  return norm(order.fulfillmentType ?? order.fulfillment_type ?? order.carrier) === "pickup";
}

function deliveryMethod(order: OrderRow) {
  return isPickup(order) ? "Store Pickup" : "Mail Delivery";
}

function provider(order: OrderRow) {
  return isPickup(order) ? "Pickup Desk" : text(order.carrier ?? order.shippingProvider ?? order.shipping_provider, "EMS / DHL not assigned");
}

function addressOrPickup(order: OrderRow) {
  if (isPickup(order)) return text(order.pickupLocation ?? order.pickup_location, "Pickup location pending");
  const address = order.shippingAddress ?? order.shipping_address;
  if (typeof address === "string") return address;
  if (address && typeof address === "object") {
    return [address.street, address.house, address.subcity, address.city, address.state, address.postalCode ?? address.zip, address.country]
      .filter(Boolean)
      .join(", ") || "Address pending";
  }
  return "Address pending";
}

function fulfillmentStatus(order: OrderRow) {
  const explicit = norm(order.deliveryStatus ?? order.delivery_status ?? order.shippingStatus ?? order.shipping_status ?? order.pickupStatus ?? order.pickup_status);
  if (explicit) return explicit;
  const status = norm(order.status);
  if (["delivered", "picked_up"].includes(status)) return "delivered";
  if (status === "ready_for_pickup") return "ready_for_pickup";
  if (status === "shipped") return "shipped";
  if (status === "fulfilled") return isPickup(order) ? "packed" : "assigned_to_ems";
  return "not_started";
}

function readyForFulfillment(order: OrderRow) {
  const status = norm(order.status);
  const fulfillment = fulfillmentStatus(order);
  return ["fulfilled", "ready_for_pickup", "shipped", "picked_up", "delivered"].includes(status) || fulfillment !== "not_started";
}

function tone(status: string) {
  if (["delivered", "picked_up"].includes(status)) return "green";
  if (["assigned_to_ems", "handed_to_ems", "shipped", "in_transit", "at_hub", "out_for_delivery", "ready_for_pickup", "customer_notified"].includes(status)) return "blue";
  if (["not_started", "packing", "packed", "moved_to_pickup_desk", "waiting_customer"].includes(status)) return "yellow";
  if (["failed", "failed_attempt", "returned", "cancelled", "canceled", "cancelled_pickup"].includes(status)) return "red";
  return "slate";
}

function Badge({ status }: { status: string }) {
  const color = tone(status);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-black",
        color === "green" && "bg-emerald-100 text-emerald-700",
        color === "blue" && "bg-blue-100 text-blue-700",
        color === "yellow" && "bg-amber-100 text-amber-700",
        color === "red" && "bg-rose-100 text-rose-700",
        color === "slate" && "bg-slate-100 text-slate-700",
      )}
    >
      {titleCase(status)}
    </span>
  );
}

export function AdminShippingDeliveryWorkspace({ data }: { data: AdminWorkspaceData }) {
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewedDeliveryIds, setViewedDeliveryIds] = useState<string[]>([]);
  const statusOptions = methodFilter === "pickup"
    ? [
        ["all", "All Pickup Statuses"],
        ["not_started", "Not Started"],
        ["packing", "Packing"],
        ["packed", "Packed"],
        ["moved_to_pickup_desk", "Moved To Pickup Desk"],
        ["ready_for_pickup", "Ready For Pickup"],
        ["customer_notified", "Customer Notified"],
        ["waiting_customer", "Waiting Customer"],
        ["picked_up", "Picked Up"],
        ["delivered", "Delivered"],
        ["cancelled_pickup", "Cancelled Pickup"],
      ]
    : [
        ["all", "All Delivery Statuses"],
        ["not_started", "Not Started"],
        ["packing", "Packing"],
        ["packed", "Packed"],
        ["assigned_to_ems", "Assigned To EMS"],
        ["handed_to_ems", "Handed To EMS"],
        ["in_transit", "In Transit"],
        ["at_hub", "At Hub"],
        ["out_for_delivery", "Out For Delivery"],
        ["delivered", "Delivered"],
        ["failed_attempt", "Failed Attempt"],
        ["returned", "Returned"],
      ];

  const fulfillmentOrders = useMemo(() => {
    return ((data.orders ?? []) as OrderRow[])
      .flatMap((order) => {
        const workstreams = Array.isArray(order.workstreams) ? order.workstreams : [];
        if (!workstreams.length) return [order];
        return workstreams.map((workstream) => ({
          ...order,
          id: `${order.id}-${String(workstream.type)}`,
          _parentOrderId: order.id,
          _scope: workstream.type === "custom" ? "custom" as const : "catalog" as const,
          orderNumber: `${order.orderNumber ?? order.id}-${workstream.type === "custom" ? "CUS" : "CAT"}`,
          status: workstream.status === "ready" ? "fulfilled" : String(workstream.status ?? order.status),
          deliveryStatus: workstream.deliveryStatus ?? order.deliveryStatus,
          trackingNumber: workstream.deliveryTrackingNumber ?? order.trackingNumber,
          carrier: typeof workstream.deliveryCarrier === "string" ? workstream.deliveryCarrier : order.carrier,
        }) as OrderRow);
      })
      .filter(readyForFulfillment)
      .map((order) => ({
        ...order,
        _method: isPickup(order) ? "pickup" : "mail",
        _provider: provider(order).toLowerCase(),
        _fulfillmentStatus: fulfillmentStatus(order),
      }));
  }, [data.orders]);

  useEffect(() => {
    const key = "admin-viewed-shipping-delivery-notifications";
    const read = () => {
      try {
        const raw = window.localStorage.getItem(key);
        setViewedDeliveryIds(raw ? JSON.parse(raw) : []);
      } catch {
        setViewedDeliveryIds([]);
      }
    };
    const onViewed = (event: Event) => {
      const orderId = (event as CustomEvent<string>).detail;
      if (!orderId) return;
      setViewedDeliveryIds((current) => {
        const next = Array.from(new Set([...current, orderId]));
        try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
        return next;
      });
    };
    read();
    window.addEventListener("admin-shipping-delivery-viewed", onViewed);
    return () => window.removeEventListener("admin-shipping-delivery-viewed", onViewed);
  }, []);

  return (
    <AdminWorkspace
      pageId="shipping-delivery"
      initialData={{ ...data, orders: fulfillmentOrders }}
      hideKpis
      title="Shipping & Delivery"
      subtitle="Manage fulfillment after production is complete: packing, EMS/DHL handoff, store pickup, and delivery completion."
      icon={Truck}
      defaultTab="all"
      filterActions={
        <div className="grid w-full gap-2 md:grid-cols-2">
          <select
            value={methodFilter}
            onChange={(event) => {
              setMethodFilter(event.target.value);
              setStatusFilter("all");
            }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium"
          >
            <option value="all">All Methods</option>
            <option value="mail">Mail Delivery</option>
            <option value="pickup">Store Pickup</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      }
    >
      {({ filteredData, search, setDisplayedRecordsCount }) => (
        <ShippingDeliveryTable
          orders={(filteredData.orders ?? []) as OrderRow[]}
          search={search}
          methodFilter={methodFilter}
          statusFilter={statusFilter}
          viewedDeliveryIds={viewedDeliveryIds}
          onCount={setDisplayedRecordsCount}
        />
      )}
    </AdminWorkspace>
  );
}

function ShippingDeliveryTable({
  orders,
  search,
  methodFilter,
  statusFilter,
  viewedDeliveryIds,
  onCount,
}: {
  orders: OrderRow[];
  search: string;
  methodFilter: string;
  statusFilter: string;
  viewedDeliveryIds: string[];
  onCount: (count: number | null) => void;
}) {
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const status = order._fulfillmentStatus ?? fulfillmentStatus(order);
      const method = order._method ?? (isPickup(order) ? "pickup" : "mail");
      const providerValue = String(order._provider ?? provider(order)).toLowerCase();
      const matchesMethod = methodFilter === "all" || method === methodFilter;
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesSearch = query
        ? [order.orderNumber, order.customerName, order.userEmail, status, providerValue, addressOrPickup(order)].some((value) => String(value ?? "").toLowerCase().includes(query))
        : true;
      return matchesMethod && matchesStatus && matchesSearch;
    });
  }, [methodFilter, orders, search, statusFilter]);

  useEffect(() => {
    onCount(rows.length);
  }, [onCount, rows.length]);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">No</th>
                <th className="px-5 py-4">Order</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Method</th>
                <th className="px-5 py-4">Main Status</th>
                <th className="px-5 py-4">Delivery Status</th>
                <th className="px-5 py-4">Tracking / Pickup</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order, index) => {
                const status = order._fulfillmentStatus ?? fulfillmentStatus(order);
                const rowId = String(order.id ?? "");
                const orderId = String(order._parentOrderId ?? order.id ?? "");
                const isNew = Boolean(rowId && !viewedDeliveryIds.includes(rowId));
                return (
                  <tr key={orderId} className={cn("border-t border-slate-200 transition hover:bg-blue-50/70", isNew && "border-l-4 border-l-blue-500 bg-blue-50/70")}>
                    <td className="px-5 py-4 font-semibold text-slate-500">{index + 1}</td>
                    <td className="px-5 py-4 font-black text-slate-950">
                      <div className="flex items-center gap-2">
                        {isNew ? <span className="rounded-full border border-blue-200 bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">New</span> : null}
                        <span>#{text(order.orderNumber ?? order.id)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-900">{text(order.customerName, "Customer")}</p>
                      <p className="text-xs font-semibold text-slate-400">{text(order.userEmail, "-")}</p>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">{deliveryMethod(order)}</td>
                    <td className="px-5 py-4"><Badge status={norm(order.status) || "pending"} /></td>
                    <td className="px-5 py-4"><Badge status={status} /></td>
                    <td className="px-5 py-4 text-slate-600">{text(order.trackingNumber ?? order.tracking_number ?? order.pickupLocation, isPickup(order) ? "Office pickup" : "Tracking pending")}</td>
                    <td className="px-5 py-4">
                      <DashboardTableActions>
                        <DashboardActionButton action="view" href={`/admin/orders/shipping-delivery/${orderId}${order._scope ? `?scope=${order._scope}` : ""}`} onClick={() => markDeliveryViewed(rowId)} aria-label="Open delivery details" />
                      </DashboardTableActions>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-sm font-black uppercase tracking-widest text-slate-400">
                    No fulfillment-ready orders found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function markDeliveryViewed(orderId: string) {
  window.dispatchEvent(new CustomEvent("admin-shipping-delivery-viewed", { detail: orderId }));
  fetch(`/api/backend/orders/admin/${orderId}`).catch((error) => {
    console.error("Could not resolve shipping delivery notification:", error);
  });
}
