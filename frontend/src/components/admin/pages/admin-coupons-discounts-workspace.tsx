"use client";

import { useState } from "react";
import { Plus, TicketPercent } from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import {
  DashboardModalBody,
  DashboardModalFooter,
  DashboardModalFooterButton,
  DashboardModalFrame,
  DashboardModalHeader,
  DashboardModalSection,
} from "@/components/admin/dashboard-modal";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import type { AdminWorkspaceData } from "@/lib/admin/types";

type Row = {
  id?: string;
  name?: string | null;
  code?: string | null;
  discountType?: string | null;
  discountValue?: string | number | null;
  status?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  internalNote?: string | null;
  scope?: string | null;
  appliesTo?: string | null;
  productId?: string | null;
  minimumOrderUsd?: string | number | null;
  maxDiscountUsd?: string | number | null;
  region?: string | null;
  category?: string | null;
  subcategory?: string | null;
  redemptionCount?: string | number | null;
  usageLimit?: string | number | null;
  perCustomerLimit?: string | number | null;
  maxRedemptions?: string | number | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  uniqueId?: string | null;
  priceUsd?: string | number | null;
  images?: string[];
  isActive?: boolean | null;
};
type TableTab = "discounts" | "coupons";
type DetailFieldItem = { label: string; value: unknown; kind?: "money" | "date" | "discount" | "status" | "text" | "number" };

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00";
}

function dateLabel(value: unknown) {
  if (!value) return "No limit";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "No limit";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function detailDate(value: unknown) {
  if (!value) return "Not set";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function textLabel(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text.replaceAll("_", " ") : "Not set";
}

function numberLabel(value: unknown, empty = "No limit") {
  if (value === null || value === undefined || value === "") return empty;
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString() : String(value);
}

function statusTone(status: unknown) {
  const key = String(status ?? "draft").toLowerCase();
  if (key === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (key === "scheduled") return "border-blue-200 bg-blue-50 text-blue-700";
  if (key === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (key === "expired" || key === "used_up") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function discountLabel(row: Row) {
  if (row.discountType === "free_shipping") return "Free shipping";
  if (row.discountType === "percentage") return `${Number(row.discountValue ?? 0).toFixed(0)}%`;
  return money(row.discountValue);
}

function detailValue(item: DetailFieldItem) {
  if (item.kind === "money") return item.value === null || item.value === undefined || item.value === "" ? "Not set" : money(item.value);
  if (item.kind === "date") return detailDate(item.value);
  if (item.kind === "number") return numberLabel(item.value);
  if (item.kind === "status") return textLabel(item.value);
  return textLabel(item.value);
}

function DetailField({ item }: { item: DetailFieldItem }) {
  const value = detailValue(item);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{item.label}</p>
      {item.kind === "status" ? (
        <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusTone(item.value)}`}>{value}</span>
      ) : (
        <p className="mt-1 break-words text-sm font-bold capitalize text-slate-900">{value}</p>
      )}
    </div>
  );
}

function DetailSection({ title, items }: { title: string; items: DetailFieldItem[] }) {
  return (
    <DashboardModalSection title={title}>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => <DetailField key={item.label} item={item} />)}
      </div>
    </DashboardModalSection>
  );
}

function DetailModal({ tab, row, onClose }: { tab: TableTab; row: Row; onClose: () => void }) {
  const isCoupon = tab === "coupons";
  const title = isCoupon ? "Coupon Details" : "Product Discount Details";
  const description = isCoupon ? `${row.code ?? "Coupon"} - ${row.name ?? "Checkout coupon"}` : row.name ?? "Product discount";

  const primaryItems: DetailFieldItem[] = isCoupon
    ? [
        { label: "Coupon Code", value: row.code },
        { label: "Coupon Name", value: row.name },
        { label: "Status", value: row.status ?? "draft", kind: "status" },
        { label: "Applies To", value: row.appliesTo },
      ]
    : [
        { label: "Discount Name", value: row.name },
        { label: "Status", value: row.status ?? "draft", kind: "status" },
        { label: "Applies To", value: row.scope },
        { label: "Product ID", value: row.productId },
      ];

  const valueItems: DetailFieldItem[] = isCoupon
    ? [
        { label: "Discount Type", value: row.discountType },
        { label: "Value", value: discountLabel(row) },
        { label: "Min Order USD", value: row.minimumOrderUsd, kind: "money" },
        { label: "Max Discount USD", value: row.maxDiscountUsd, kind: "money" },
        { label: "Usage Limit", value: numberLabel(row.usageLimit), kind: "text" },
        { label: "Redemption Count", value: numberLabel(row.redemptionCount, "0"), kind: "text" },
        { label: "Per Customer Limit", value: numberLabel(row.perCustomerLimit), kind: "text" },
      ]
    : [
        { label: "Discount Type", value: row.discountType },
        { label: "Value", value: discountLabel(row) },
        { label: "Category", value: row.category },
        { label: "Subcategory", value: row.subcategory },
        { label: "Region", value: row.region },
        { label: "Max Redemptions", value: numberLabel(row.maxRedemptions), kind: "text" },
        { label: "Redemption Count", value: numberLabel(row.redemptionCount, "0"), kind: "text" },
      ];

  const scheduleItems: DetailFieldItem[] = [
    { label: "Start Date", value: row.startsAt, kind: "date" },
    { label: "End Date", value: row.endsAt, kind: "date" },
    { label: "Created At", value: row.createdAt, kind: "date" },
    { label: "Updated At", value: row.updatedAt, kind: "date" },
  ];

  return (
    <DashboardModalFrame onClose={onClose} maxWidth="max-w-6xl">
      <DashboardModalHeader title={title} description={description} icon={TicketPercent} onClose={onClose} />
      <DashboardModalBody className="space-y-4">
        <DetailSection title={isCoupon ? "Coupon Setup" : "Discount Setup"} items={primaryItems} />
        <DetailSection title={isCoupon ? "Coupon Rules" : "Discount Rules"} items={valueItems} />
        <DetailSection title="Schedule & Audit" items={scheduleItems} />
        <DashboardModalSection title="Internal Note">
          <p className="mt-4 min-h-20 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
            {textLabel(row.internalNote)}
          </p>
        </DashboardModalSection>
      </DashboardModalBody>
      <DashboardModalFooter className="justify-end">
        <DashboardModalFooterButton onClick={onClose}>Close</DashboardModalFooterButton>
      </DashboardModalFooter>
    </DashboardModalFrame>
  );
}

function RecordsTable({ tab, rows, onView }: { tab: TableTab; rows: Row[]; onView: (tab: TableTab, row: Row) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1000px] w-full divide-y divide-slate-200 text-left text-sm text-slate-900">
          <TableHeader>
            <TableHeadRow>
              <TableHeadCell>{tab === "discounts" ? "Discount Name" : "Coupon Code"}</TableHeadCell>
              <TableHeadCell>Discount Type</TableHeadCell>
              <TableHeadCell>Value</TableHeadCell>
              <TableHeadCell>{tab === "discounts" ? "Applies To" : "Usage Limit"}</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>{tab === "discounts" ? "Date Range" : "Expiry Date"}</TableHeadCell>
              <TableHeadCell>Actions</TableHeadCell>
            </TableHeadRow>
          </TableHeader>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id ?? row.code ?? row.name ?? "record"} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-black text-slate-950">{tab === "discounts" ? row.name : row.code}</p>
                  <p className="text-xs font-bold text-slate-500">{tab === "discounts" ? row.internalNote || "Product discount" : row.name}</p>
                </td>
                <td className="px-5 py-4 text-sm font-bold capitalize text-slate-700">{String(row.discountType ?? "").replaceAll("_", " ")}</td>
                <td className="px-5 py-4 font-black text-slate-950">{discountLabel(row)}</td>
                <td className="px-5 py-4 text-sm font-bold capitalize text-slate-700">{tab === "discounts" ? String(row.scope ?? "").replaceAll("_", " ") : `${Number(row.redemptionCount ?? 0)} / ${row.usageLimit ?? "No limit"}`}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusTone(row.status)}`}>{String(row.status ?? "draft").replaceAll("_", " ")}</span>
                </td>
                <td className="px-5 py-4 text-sm font-bold text-slate-700">{tab === "discounts" ? `${dateLabel(row.startsAt)} - ${dateLabel(row.endsAt)}` : dateLabel(row.endsAt)}</td>
                <td className="px-5 py-4">
                  <DashboardTableActions>
                    <DashboardActionButton action="view" onClick={() => onView(tab, row)} aria-label={`View ${tab === "discounts" ? row.name ?? "discount" : row.code ?? "coupon"} details`} />
                  </DashboardTableActions>
                </td>
              </tr>
            ))}
            {!rows.length ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-sm font-bold text-slate-400">No records match this view.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminCouponsDiscountsWorkspace({ data, canEdit }: { data: AdminWorkspaceData; canEdit: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState("all");
  const [detail, setDetail] = useState<{ tab: TableTab; row: Row } | null>(null);
  const productDiscounts = (Array.isArray(data.productDiscounts) ? data.productDiscounts : []) as Row[];
  const coupons = (Array.isArray(data.coupons) ? data.coupons : []) as Row[];

  return (
    <>
      <AdminWorkspace
        pageId="coupons-discounts"
        initialData={data}
        hideKpis
        title="Coupons & Discounts"
        subtitle="Create and manage product discounts and checkout coupon codes."
        icon={TicketPercent}
        defaultTab="discounts"
        filterPlaceholder="Search discount names, coupon codes, scope, category..."
        actions={canEdit ? (
          <button
            type="button"
            onClick={() => router.push("/admin/finance/coupons-discounts/create")}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-900 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Create Coupon & Discount
          </button>
        ) : null}
        filterActions={
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
            <option value="used_up">Used Up</option>
          </select>
        }
      >
        {({ activeTab, search }) => {
          const tableTab = activeTab === "coupons" ? "coupons" : "discounts";
          const rows = tableTab === "discounts" ? productDiscounts : coupons;
          const q = search.trim().toLowerCase();
          const visibleRows = rows.filter((row) => {
            const matchesStatus = status === "all" || row.status === status;
            const haystack = [row.name, row.code, row.scope, row.appliesTo, row.region, row.category, row.subcategory].join(" ").toLowerCase();
            return matchesStatus && (!q || haystack.includes(q));
          });
          return <RecordsTable tab={tableTab} rows={visibleRows} onView={(tab, row) => setDetail({ tab, row })} />;
        }}
      </AdminWorkspace>
      {detail ? <DetailModal tab={detail.tab} row={detail.row} onClose={() => setDetail(null)} /> : null}
    </>
  );
}
