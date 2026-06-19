"use client";

import { useState } from "react";
import { Plus, TicketPercent } from "lucide-react";
import { useRouter } from "next/navigation";
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
  region?: string | null;
  category?: string | null;
  subcategory?: string | null;
  redemptionCount?: string | number | null;
  usageLimit?: string | number | null;
  maxRedemptions?: string | number | null;
  uniqueId?: string | null;
  priceUsd?: string | number | null;
  images?: string[];
  isActive?: boolean | null;
};

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

function RecordsTable({ tab, rows }: { tab: "discounts" | "coupons"; rows: Row[] }) {
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
                <td className="px-5 py-4 text-xs font-black uppercase text-slate-400">Managed</td>
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
          return <RecordsTable tab={tableTab} rows={visibleRows} />;
        }}
      </AdminWorkspace>
    </>
  );
}
