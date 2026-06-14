"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, MapPin, Package, Truck, XCircle } from "lucide-react";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type OrderRow = Record<string, any>;

function norm(value: unknown) {
  return String(value ?? "").toLowerCase().trim();
}

function text(value: unknown, fallback = "-") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function dateLabel(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
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
  const explicit = norm(order.shippingStatus ?? order.shipping_status ?? order.pickupStatus ?? order.pickup_status);
  if (explicit) return explicit;
  const status = norm(order.status);
  if (["delivered", "picked_up"].includes(status)) return "delivered";
  if (status === "ready_for_pickup") return "ready_for_pickup";
  if (status === "shipped") return "shipped";
  if (status === "fulfilled") return "shipping_assigned";
  if (status === "quality_check") return "quality_check";
  return "pending";
}

function readyForFulfillment(order: OrderRow) {
  const status = norm(order.status);
  const fulfillment = fulfillmentStatus(order);
  return [
    "fulfilled",
    "ready_for_pickup",
    "shipped",
    "picked_up",
    "delivered",
  ].includes(status) || !["pending", "processing", "tailoring", "quality_check"].includes(fulfillment);
}

function tone(status: string) {
  if (["delivered", "picked_up"].includes(status)) return "green";
  if (["shipped", "in_transit", "out_for_delivery", "shipping_assigned", "ready_for_pickup"].includes(status)) return "blue";
  if (["pending", "packed", "quality_check"].includes(status)) return "yellow";
  if (["failed", "cancelled", "canceled"].includes(status)) return "red";
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
  const [providerFilter, setProviderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fulfillmentOrders = useMemo(() => {
    return ((data.orders ?? []) as OrderRow[])
      .filter(readyForFulfillment)
      .map((order) => ({
        ...order,
        _method: isPickup(order) ? "pickup" : "mail",
        _provider: provider(order).toLowerCase(),
        _fulfillmentStatus: fulfillmentStatus(order),
      }));
  }, [data.orders]);

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
        <div className="grid w-full gap-2 lg:grid-cols-3">
          <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All Methods</option>
            <option value="mail">Mail Delivery</option>
            <option value="pickup">Store Pickup</option>
          </select>
          <select value={providerFilter} onChange={(event) => setProviderFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All Providers</option>
            <option value="ems">EMS</option>
            <option value="dhl">DHL</option>
            <option value="pickup">Pickup Desk</option>
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="packed">Packed</option>
            <option value="shipping_assigned">Shipping Assigned</option>
            <option value="ready_for_pickup">Ready For Pickup</option>
            <option value="shipped">Shipped</option>
            <option value="out_for_delivery">Out For Delivery</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      }
    >
      {({ filteredData, search, setDisplayedRecordsCount }) => (
        <ShippingDeliveryTable
          orders={(filteredData.orders ?? []) as OrderRow[]}
          search={search}
          methodFilter={methodFilter}
          providerFilter={providerFilter}
          statusFilter={statusFilter}
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
  providerFilter,
  statusFilter,
  onCount,
}: {
  orders: OrderRow[];
  search: string;
  methodFilter: string;
  providerFilter: string;
  statusFilter: string;
  onCount: (count: number | null) => void;
}) {
  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const status = order._fulfillmentStatus ?? fulfillmentStatus(order);
      const method = order._method ?? (isPickup(order) ? "pickup" : "mail");
      const providerValue = String(order._provider ?? provider(order)).toLowerCase();
      const matchesMethod = methodFilter === "all" || method === methodFilter;
      const matchesProvider = providerFilter === "all" || providerValue.includes(providerFilter);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesSearch = query
        ? [order.orderNumber, order.customerName, order.userEmail, status, providerValue, addressOrPickup(order)].some((value) => String(value ?? "").toLowerCase().includes(query))
        : true;
      return matchesMethod && matchesProvider && matchesStatus && matchesSearch;
    });
  }, [methodFilter, orders, providerFilter, search, statusFilter]);

  useEffect(() => {
    onCount(rows.length);
  }, [onCount, rows.length]);

  const packed = rows.filter((order) => ["packed", "shipping_assigned", "ready_for_pickup", "shipped"].includes(order._fulfillmentStatus)).length;
  const delivered = rows.filter((order) => order._fulfillmentStatus === "delivered").length;
  const pickup = rows.filter((order) => order._method === "pickup").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Fulfillment Orders" value={rows.length} icon={Package} />
        <Metric label="Packed / Assigned" value={packed} icon={Truck} />
        <Metric label="Store Pickup" value={pickup} icon={MapPin} />
        <Metric label="Delivered" value={delivered} icon={CheckCircle2} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Order</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Method</th>
                <th className="px-5 py-4">Provider</th>
                <th className="px-5 py-4">Fulfillment Status</th>
                <th className="px-5 py-4">Tracking / Pickup</th>
                <th className="px-5 py-4">Last Update</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((order) => {
                const status = order._fulfillmentStatus ?? fulfillmentStatus(order);
                return (
                  <tr key={String(order.id)} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="px-5 py-4 font-black text-slate-950">#{text(order.orderNumber ?? order.id)}</td>
                    <td className="px-5 py-4">
                      <p className="font-black text-slate-900">{text(order.customerName, "Customer")}</p>
                      <p className="text-xs font-semibold text-slate-400">{text(order.userEmail, "-")}</p>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-700">{deliveryMethod(order)}</td>
                    <td className="px-5 py-4 font-bold text-slate-700">{provider(order)}</td>
                    <td className="px-5 py-4"><Badge status={status} /></td>
                    <td className="px-5 py-4 text-slate-600">{text(order.trackingNumber ?? order.tracking_number ?? order.pickupLocation, isPickup(order) ? "Pickup code pending" : "Tracking pending")}</td>
                    <td className="px-5 py-4 text-slate-500">{dateLabel(order.updatedAt ?? order.createdAt)}</td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/orders/shipping-delivery/${order.id}`} className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-800 hover:bg-slate-100">
                        View
                      </Link>
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

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}
