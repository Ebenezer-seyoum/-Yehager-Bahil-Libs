"use client";

import { useState } from "react";
import { Save, Settings, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";
import type { AdminWorkspaceData } from "@/lib/admin/types";

type ProfitRow = {
  entityType: "product" | "custom_order";
  entityId: string;
  title: string;
  customerName?: string | null;
  customerEmail?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  revenueUsd?: string | number | null;
  productCostUsd?: string | number | null;
  taxPercent?: string | number | null;
  taxAmountUsd?: string | number | null;
  designerCostUsd?: string | number | null;
  otherCostUsd?: string | number | null;
  totalCostUsd?: string | number | null;
  netProfitUsd?: string | number | null;
  marginPercent?: string | number | null;
  designerPaymentPolicy?: string | null;
  designerPaymentStatus?: string | null;
  designerPaidUsd?: string | number | null;
  designerRemainingUsd?: string | number | null;
  internalNote?: string | null;
  hasCustomCost?: boolean | null;
  updatedAt?: string | Date | null;
};

type CostSetting = {
  entityType?: "default" | "product" | "custom_order";
  entityId?: string | null;
  productCostUsd?: string | number | null;
  taxPercent?: string | number | null;
  designerCostUsd?: string | number | null;
  otherCostUsd?: string | number | null;
  designerPaymentPolicy?: string | null;
  designerPaymentStatus?: string | null;
  designerPaidUsd?: string | number | null;
  internalNote?: string | null;
  updatedAt?: string | Date | null;
};

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00";
}

function percent(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `${n.toFixed(2)}%` : "0.00%";
}

function dateLabel(value: unknown) {
  if (!value) return "Not updated";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not updated";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function policyLabel(value: unknown) {
  if (value === "fifty_fifty") return "50% Advance / 50% Completion";
  if (value === "paid_100") return "100% Paid";
  return "No Designer Payment";
}

function statusLabel(value: unknown) {
  if (value === "advance_paid") return "Advance Paid";
  if (value === "fully_paid") return "Fully Paid";
  return "Unpaid";
}

function recalculate(row: CostSetting & { revenueUsd?: unknown }) {
  const revenue = Number(row.revenueUsd ?? 0) || 0;
  const productCost = Number(row.productCostUsd ?? 0) || 0;
  const taxPercent = Number(row.taxPercent ?? 0) || 0;
  const taxAmount = revenue * (taxPercent / 100);
  const designerCost = Number(row.designerCostUsd ?? 0) || 0;
  const otherCost = Number(row.otherCostUsd ?? 0) || 0;
  const totalCost = productCost + taxAmount + designerCost + otherCost;
  const netProfit = revenue - totalCost;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  return { taxAmount, totalCost, netProfit, margin };
}

function CostEditor({
  row,
  defaults,
  canManage,
  onSaved,
}: {
  row: ProfitRow | null;
  defaults: CostSetting | null;
  canManage: boolean;
  onSaved: () => void;
}) {
  const target = row ?? {
    entityType: "default" as const,
    entityId: "default",
    title: "Cost Defaults",
    revenueUsd: 0,
    productCostUsd: defaults?.productCostUsd ?? 0,
    taxPercent: defaults?.taxPercent ?? 0,
    designerCostUsd: defaults?.designerCostUsd ?? 0,
    otherCostUsd: defaults?.otherCostUsd ?? 0,
    designerPaymentPolicy: defaults?.designerPaymentPolicy ?? "none",
    designerPaymentStatus: defaults?.designerPaymentStatus ?? "unpaid",
    designerPaidUsd: defaults?.designerPaidUsd ?? 0,
    internalNote: defaults?.internalNote ?? "",
  };
  const [editing, setEditing] = useState(!row);
  const [productCostUsd, setProductCostUsd] = useState(String(target.productCostUsd ?? "0"));
  const [taxPercent, setTaxPercent] = useState(String(target.taxPercent ?? "0"));
  const [designerCostUsd, setDesignerCostUsd] = useState(String(target.designerCostUsd ?? "0"));
  const [otherCostUsd, setOtherCostUsd] = useState(String(target.otherCostUsd ?? "0"));
  const [designerPaymentPolicy, setDesignerPaymentPolicy] = useState(String(target.designerPaymentPolicy ?? "none"));
  const [designerPaymentStatus, setDesignerPaymentStatus] = useState(String(target.designerPaymentStatus ?? "unpaid"));
  const [designerPaidUsd, setDesignerPaidUsd] = useState(String(target.designerPaidUsd ?? "0"));
  const [internalNote, setInternalNote] = useState(String(target.internalNote ?? ""));
  const [busy, setBusy] = useState(false);
  const calculated = recalculate({ revenueUsd: target.revenueUsd, productCostUsd, taxPercent, designerCostUsd, otherCostUsd });
  const isCustomOrder = target.entityType === "custom_order";

  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/backend/admin/profit-costs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: row ? target.entityType : "default",
          entityId: row ? target.entityId : "default",
          productCostUsd: Number(productCostUsd),
          taxPercent: Number(taxPercent),
          designerCostUsd: Number(designerCostUsd),
          otherCostUsd: Number(otherCostUsd),
          designerPaymentPolicy: isCustomOrder ? designerPaymentPolicy : "none",
          designerPaymentStatus: isCustomOrder ? designerPaymentStatus : "unpaid",
          designerPaidUsd: isCustomOrder ? Number(designerPaidUsd) : 0,
          internalNote: internalNote || null,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || "Could not save cost settings");
      await dashboardSuccess("Cost Settings Saved", "Profit calculations have been updated.");
      setEditing(false);
      onSaved();
    } catch (error) {
      await dashboardError("Save Failed", error instanceof Error ? error.message : "Could not save cost settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">{row ? "Cost Breakdown" : "Manage Cost Defaults"}</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{target.title}</h3>
          {row?.customerName ? <p className="text-sm font-bold text-slate-500">{row.customerName} - {row.customerEmail}</p> : null}
        </div>
        {canManage && row ? (
          <button type="button" onClick={() => setEditing((value) => !value)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            {editing ? "Cancel Edit" : "Edit Cost Settings"}
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Revenue</p><p className="mt-1 text-lg font-black">{money(target.revenueUsd)}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Total Cost</p><p className="mt-1 text-lg font-black">{money(calculated.totalCost)}</p></div>
        <div className="rounded-xl bg-emerald-50 p-4"><p className="text-xs font-black uppercase text-emerald-700">Net Profit</p><p className="mt-1 text-lg font-black text-emerald-900">{money(calculated.netProfit)}</p></div>
        <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Margin</p><p className="mt-1 text-lg font-black">{percent(calculated.margin)}</p></div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Product / Material Cost", productCostUsd, setProductCostUsd],
          ["Tax Percent", taxPercent, setTaxPercent],
          ["Designer / Contractor Cost", designerCostUsd, setDesignerCostUsd],
          ["Other Cost", otherCostUsd, setOtherCostUsd],
        ].map(([label, value, setter]) => (
          <label key={String(label)} className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">{String(label)}</span>
            <input
              type="number"
              value={String(value)}
              readOnly={!editing || !canManage}
              onChange={(event) => (setter as (value: string) => void)(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none read-only:bg-slate-50"
            />
          </label>
        ))}
      </div>

      {isCustomOrder ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Designer Payment Policy</span>
            <select value={designerPaymentPolicy} disabled={!editing || !canManage} onChange={(event) => setDesignerPaymentPolicy(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-50">
              <option value="none">No Designer Payment</option>
              <option value="fifty_fifty">50% Advance / 50% Completion</option>
              <option value="paid_100">100% Paid</option>
            </select>
          </label>
          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Payment Status</span>
            <select value={designerPaymentStatus} disabled={!editing || !canManage} onChange={(event) => setDesignerPaymentStatus(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none disabled:bg-slate-50">
              <option value="unpaid">Unpaid</option>
              <option value="advance_paid">Advance Paid</option>
              <option value="fully_paid">Fully Paid</option>
            </select>
          </label>
          <label>
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Designer Paid Amount</span>
            <input type="number" value={designerPaidUsd} readOnly={!editing || !canManage} onChange={(event) => setDesignerPaidUsd(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none read-only:bg-slate-50" />
          </label>
        </div>
      ) : null}

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-3 text-sm font-bold md:grid-cols-5">
          <span>Tax Amount: {money(calculated.taxAmount)}</span>
          <span>Designer Remaining: {money(Math.max((Number(designerCostUsd) || 0) - (Number(designerPaidUsd) || 0), 0))}</span>
          <span>Policy: {policyLabel(designerPaymentPolicy)}</span>
          <span>Status: {statusLabel(designerPaymentStatus)}</span>
          <span>Updated: {dateLabel(row?.updatedAt ?? defaults?.updatedAt)}</span>
        </div>
      </div>

      <textarea value={internalNote} readOnly={!editing || !canManage} onChange={(event) => setInternalNote(event.target.value)} placeholder="Internal cost note" className="mt-4 min-h-20 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none read-only:bg-slate-50" />

      {editing && canManage ? (
        <div className="mt-4 flex justify-end">
          <button type="button" disabled={busy} onClick={() => void save()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-black text-white hover:bg-emerald-900 disabled:opacity-60">
            <Save className="h-4 w-4" />
            Save Cost Settings
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ProfitTable({ rows, onView }: { rows: ProfitRow[]; onView: (row: ProfitRow) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <TableHeader>
          <TableHeadRow>
            <TableHeadCell>Item</TableHeadCell>
            <TableHeadCell>Revenue</TableHeadCell>
            <TableHeadCell>Total Cost</TableHeadCell>
            <TableHeadCell>Net Profit</TableHeadCell>
            <TableHeadCell>Margin</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Actions</TableHeadCell>
          </TableHeadRow>
        </TableHeader>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={`${row.entityType}-${row.entityId}`} className="hover:bg-slate-50">
              <td className="px-5 py-4"><p className="font-black text-slate-950">{row.title}</p><p className="text-xs font-bold text-slate-500">{row.customerName || (row.hasCustomCost ? "Custom cost set" : "Using defaults")}</p></td>
              <td className="px-5 py-4 font-black">{money(row.revenueUsd)}</td>
              <td className="px-5 py-4 font-bold">{money(row.totalCostUsd)}</td>
              <td className={`px-5 py-4 font-black ${Number(row.netProfitUsd) >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{money(row.netProfitUsd)}</td>
              <td className="px-5 py-4 font-bold">{percent(row.marginPercent)}</td>
              <td className="px-5 py-4"><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase">{row.status ?? "active"}</span></td>
              <td className="px-5 py-4"><DashboardTableActions><DashboardActionButton action="view" onClick={() => onView(row)} /></DashboardTableActions></td>
            </tr>
          ))}
          {!rows.length ? <tr><td colSpan={7} className="px-5 py-14 text-center text-sm font-bold text-slate-400">No profit records match this view.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export function AdminProfitCostsWorkspace({ data, canManage = false }: { data: AdminWorkspaceData; canManage?: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ProfitRow | null>(null);
  const catalogRows = (data.catalogProfitRows ?? []) as ProfitRow[];
  const customRows = (data.customProfitRows ?? []) as ProfitRow[];
  const designerRows = (data.designerPayments ?? []) as ProfitRow[];
  const defaults = (data.profitDefaults ?? null) as CostSetting | null;

  return (
    <AdminWorkspace
      pageId="profit-costs"
      initialData={data}
      hideKpis
      title="Profit & Cost Analysis"
      subtitle="Manage product costs, tax percent, designer payments, other costs, and net profit."
      icon={Wallet}
      defaultTab="catalog"
      actions={canManage ? (
        <button type="button" onClick={() => setSelected(null)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-800 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-900 active:scale-95">
          <Settings className="h-4 w-4" />
          Manage Cost Defaults
        </button>
      ) : null}
    >
      {({ activeTab, search }) => {
        const q = search.trim().toLowerCase();
        const filterRows = (rows: ProfitRow[]) => rows.filter((row) => [row.title, row.customerName, row.customerEmail, row.orderNumber, row.status].join(" ").toLowerCase().includes(q));

        return (
          <div className="space-y-5">
            {activeTab === "defaults" ? <CostEditor row={null} defaults={defaults} canManage={canManage} onSaved={() => router.refresh()} /> : null}
            {activeTab === "catalog" ? <ProfitTable rows={filterRows(catalogRows)} onView={setSelected} /> : null}
            {activeTab === "custom" ? <ProfitTable rows={filterRows(customRows)} onView={setSelected} /> : null}
            {activeTab === "designer" ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <TableHeader>
                    <TableHeadRow>
                      <TableHeadCell>Custom Order</TableHeadCell>
                      <TableHeadCell>Policy</TableHeadCell>
                      <TableHeadCell>Status</TableHeadCell>
                      <TableHeadCell>Designer Cost</TableHeadCell>
                      <TableHeadCell>Paid</TableHeadCell>
                      <TableHeadCell>Remaining</TableHeadCell>
                      <TableHeadCell>Actions</TableHeadCell>
                    </TableHeadRow>
                  </TableHeader>
                  <tbody className="divide-y divide-slate-100">
                    {filterRows(designerRows).map((row) => (
                      <tr key={`${row.entityType}-${row.entityId}`} className="hover:bg-slate-50">
                        <td className="px-5 py-4"><p className="font-black">{row.orderNumber ?? row.title}</p><p className="text-xs font-bold text-slate-500">{row.customerName}</p></td>
                        <td className="px-5 py-4 font-bold">{policyLabel(row.designerPaymentPolicy)}</td>
                        <td className="px-5 py-4 font-bold">{statusLabel(row.designerPaymentStatus)}</td>
                        <td className="px-5 py-4 font-black">{money(row.designerCostUsd)}</td>
                        <td className="px-5 py-4 font-bold text-emerald-700">{money(row.designerPaidUsd)}</td>
                        <td className="px-5 py-4 font-bold text-rose-700">{money(row.designerRemainingUsd)}</td>
                        <td className="px-5 py-4"><DashboardTableActions><DashboardActionButton action="view" onClick={() => setSelected(row)} /></DashboardTableActions></td>
                      </tr>
                    ))}
                    {!filterRows(designerRows).length ? <tr><td colSpan={7} className="px-5 py-14 text-center text-sm font-bold text-slate-400">No designer payment records match this view.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            ) : null}
            {selected ? <CostEditor key={`${selected.entityType}-${selected.entityId}`} row={selected} defaults={defaults} canManage={canManage} onSaved={() => router.refresh()} /> : null}
          </div>
        );
      }}
    </AdminWorkspace>
  );
}
