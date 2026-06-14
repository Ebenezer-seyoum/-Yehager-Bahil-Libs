"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import type { UploadedDesign } from "@/components/admin-uploaded-design-dialogs";
import { DashboardActionButton, DashboardTableActions } from "@/components/admin/dashboard-action-button";

const STATUS_OPTIONS = ["submitted", "in_review", "awaiting_payment", "approved", "rejected", "pending", "tailoring", "quality_check", "shipped", "delivered", "ready_for_pickup", "picked_up"];
const PAYMENT_OPTIONS = ["pending", "awaiting_verification", "paid", "failed", "refunded", "unpaid"];

function normalizedStatus(status?: string | null) {
  const key = String(status ?? "submitted").toLowerCase();
  if (key === "submitted" || key === "in_review") return "pending review";
  if (key === "awaiting_payment") return "awaiting payment";
  if (key === "completed_request") return "completed request";
  if (key === "approved") return "completed request";
  if (key === "rejected") return "declined";
  return key.replaceAll("_", " ");
}

function statusClass(status?: string | null) {
  const key = String(status ?? "submitted").toLowerCase();
  if (key === "submitted" || key === "in_review") return "bg-amber-100 text-amber-900 border-amber-200";
  if (key === "awaiting_payment" || key === "approved" || key === "completed_request") return "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (key === "rejected") return "bg-rose-100 text-rose-900 border-rose-200";
  
  // Fulfillment statuses
  if (key === "pending") return "bg-yellow-100 text-yellow-900 border-yellow-200";
  if (key === "tailoring") return "bg-blue-100 text-blue-800 border-blue-200";
  if (key === "quality_check") return "bg-purple-100 text-purple-800 border-purple-200";
  if (key === "shipped") return "bg-cyan-100 text-cyan-800 border-cyan-200";
  if (key === "delivered") return "bg-green-100 text-green-800 border-green-200";
  if (key === "ready_for_pickup") return "bg-orange-100 text-orange-800 border-orange-200";
  if (key === "picked_up") return "bg-green-100 text-green-900 border-green-200";
  
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function paymentClass(status?: string | null) {
  const key = String(status ?? "pending").toLowerCase();
  if (key === "pending") return "bg-yellow-100 text-yellow-900 border-yellow-200";
  if (key === "awaiting_verification") return "bg-orange-100 text-orange-800 border-orange-200";
  if (key === "paid") return "bg-green-100 text-green-800 border-green-200";
  if (key === "failed") return "bg-red-100 text-red-800 border-red-200";
  if (key === "refunded") return "bg-slate-100 text-slate-800 border-slate-200";
  if (key === "unpaid") return "bg-orange-100 text-orange-800 border-orange-200";
  return "border-slate-200 bg-slate-50 text-slate-800";
}

function prettyLabel(value?: string | null) {
  return (value ?? "submitted").replaceAll("_", " ");
}

function needsReview(row: UploadedDesign) {
  return ["submitted", "in_review", "under_review", "needs_changes"].includes(String(row.status ?? "").toLowerCase());
}

export function AdminUploadedDesignsTable({ rows: initialRows, search, onFilteredCountChange }: { rows: UploadedDesign[]; search: string; onFilteredCountChange?: (count: number) => void }) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [statusFilter, setStatusFilter] = useState("all");
  const [fabricFilter, setFabricFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [viewedDesignIdsLocal, setViewedDesignIdsLocal] = useState<string[]>([]);

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setCurrentTime(Date.now()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const key = "admin-viewed-custom-design-notifications";
    const read = () => {
      try {
        const raw = window.localStorage.getItem(key);
        setViewedDesignIdsLocal(raw ? JSON.parse(raw) : []);
      } catch {
        setViewedDesignIdsLocal([]);
      }
    };
    const onViewed = (event: Event) => {
      const id = (event as CustomEvent<string>).detail;
      if (!id) return;
      setViewedDesignIdsLocal((current) => {
        const next = Array.from(new Set([...current, id]));
        try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
        return next;
      });
    };
    read();
    window.addEventListener("admin-custom-design-viewed", onViewed);
    return () => window.removeEventListener("admin-custom-design-viewed", onViewed);
  }, []);

  async function updateDesign(id: string, patch: { status: string }) {
    setBusyKey(id + "-status");
    try {
      const res = await fetch(`/api/backend/admin/uploaded-designs/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: patch.status,
          remarks: `Order status updated to ${patch.status} from table view.`
        }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: patch.status } : r)));
    } catch (err) {
      console.error(err);
    } finally {
      setBusyKey(null);
    }
  }

  async function updateDesignPayment(id: string, patch: { paymentStatus: string }) {
    setBusyKey(id + "-payment");
    try {
      let targetStatus = rows.find(r => r.id === id)?.status ?? "submitted";
      if (patch.paymentStatus === 'paid') targetStatus = 'awaiting_payment';
      if (patch.paymentStatus === 'unpaid') targetStatus = 'submitted';

      const res = await fetch(`/api/backend/admin/uploaded-designs/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: targetStatus,
          remarks: `Payment status updated to ${patch.paymentStatus} from table view.`
        }),
      });
      if (!res.ok) throw new Error("Failed to update payment status");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: targetStatus, paymentStatus: patch.paymentStatus } : r)));
    } catch (err) {
      console.error(err);
    } finally {
      setBusyKey(null);
    }
  }

  const fabricOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((row) => String(row.fabricType ?? "").trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [rows],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        [row.submissionNumber, row.designTitle, row.customerName, row.userEmail, row.status, row.fabricType]
          .map((value) => String(value ?? "").toLowerCase())
          .some((value) => value.includes(term));
      const status = normalizedStatus(row.status).replaceAll(" ", "_");
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const fabric = String(row.fabricType ?? "").trim();
      const matchesFabric = fabricFilter === "all" || fabric === fabricFilter;
      const submitted = row.submittedAt ?? row.createdAt;
      const submittedTime = submitted ? new Date(String(submitted)).getTime() : 0;
      const days = submittedTime && currentTime ? (currentTime - submittedTime) / (1000 * 60 * 60 * 24) : Number.POSITIVE_INFINITY;
      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "today" && days <= 1) ||
        (dateFilter === "week" && days <= 7) ||
        (dateFilter === "month" && days <= 30);
      return matchesSearch && matchesStatus && matchesFabric && matchesDate;
    });
  }, [currentTime, dateFilter, fabricFilter, rows, search, statusFilter]);

  useEffect(() => {
    onFilteredCountChange?.(filtered.length);
  }, [filtered.length, onFilteredCountChange]);

  function markDesignViewed(row: UploadedDesign) {
    window.dispatchEvent(new CustomEvent("admin-custom-design-viewed", { detail: row.id }));
    fetch(`/api/backend/admin/uploaded-designs/${row.id}`).catch(err => {
      console.error("Alert resolution failed:", err);
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-2 border-b border-slate-200 bg-white p-3 sm:grid-cols-3">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
          >
            <option value="all">All Statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="awaiting_payment">Awaiting Payment</option>
            <option value="completed_request">Completed Request</option>
            <option value="declined">Declined</option>
          </select>
          <select
            value={fabricFilter}
            onChange={(event) => setFabricFilter(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
          >
            <option value="all">All Fabrics</option>
            {fabricOptions.map((fabric) => (
              <option key={fabric} value={fabric}>
                {fabric}
              </option>
            ))}
          </select>
          <select
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-4 font-bold text-xs uppercase w-14">No</th>
                <th className="px-4 py-4 font-bold text-xs uppercase">Request #</th>
                <th className="px-4 py-4 font-bold text-xs uppercase">Mode</th>
                <th className="px-4 py-4 font-bold text-xs uppercase">Customer Name</th>
                <th className="px-4 py-4 font-bold text-xs uppercase">Request Status</th>
                <th className="px-4 py-4 font-bold text-xs uppercase">Checkout State</th>
                <th className="px-4 py-4 text-right font-bold text-xs uppercase">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => {
                const highlightRow = needsReview(row) && !viewedDesignIdsLocal.includes(row.id);
                return (
                <tr key={row.id} className={`border-b border-slate-200 last:border-b-0 hover:bg-blue-50/70 ${highlightRow ? "border-l-4 border-l-blue-500 bg-blue-50/70" : index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                  <td className="px-4 py-5 align-middle">
                    <a href={`/admin/uploaded-designs/${row.id}`} onClick={() => markDesignViewed(row)} className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors inline-block">
                      {index + 1}
                    </a>
                  </td>
                  <td className="px-4 py-5 align-middle">
                    <a href={`/admin/uploaded-designs/${row.id}`} onClick={() => markDesignViewed(row)} className="text-left group inline-block w-full">
                      <div className="flex items-center gap-2">
                        {highlightRow ? <span className="rounded-full border border-blue-200 bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">New</span> : null}
                        <p className="font-mono text-xs font-black text-blue-900 leading-none group-hover:text-blue-600 transition-colors">#{row.submissionNumber ?? "YBL-CD"}</p>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 font-medium">
                        {row.submittedAt || row.createdAt ? new Date(String(row.submittedAt ?? row.createdAt)).toLocaleDateString() : "-"}
                      </p>
                    </a>
                  </td>
                  <td className="px-4 py-5 align-middle">
                    <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-black text-primary uppercase">
                      { (row as any).familyGroupId || (row as any).eventId ? "Group" : "Individual" }
                    </span>
                  </td>
                  <td className="px-4 py-5 align-middle">
                    <p className="font-bold text-slate-950">{row.customerName ?? "Guest Customer"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.userEmail ?? "Unregistered"}</p>
                  </td>
                  <td className="px-4 py-5 align-middle">
                    <select
                      disabled={busyKey !== null}
                      value={row.status ?? "submitted"}
                      onChange={(e) => void updateDesign(row.id, { status: e.target.value })}
                      className={`h-9 min-w-[190px] rounded-full border px-4 text-sm font-bold capitalize outline-none transition-all shadow-sm ${statusClass(row.status)}`}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {prettyLabel(opt)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-5 align-middle">
                    <select
                      disabled={busyKey !== null}
                      value={(row as any).paymentStatus ?? (row.status === 'awaiting_payment' || row.status === 'approved' ? 'paid' : 'pending')}
                      onChange={(e) => void updateDesignPayment(row.id, { paymentStatus: e.target.value })}
                      className={`h-9 min-w-[170px] rounded-full border px-4 text-sm font-bold capitalize outline-none transition-all shadow-sm ${paymentClass((row as any).paymentStatus ?? (row.status === 'awaiting_payment' || row.status === 'approved' ? 'paid' : 'pending'))}`}
                    >
                       {PAYMENT_OPTIONS.map((opt) => (
                         <option key={opt} value={opt}>
                            {prettyLabel(opt)}
                         </option>
                       ))}
                    </select>
                  </td>
                  <td className="px-4 py-5 align-middle text-right">
                    <DashboardTableActions className="justify-end">
                      <DashboardActionButton action="view" href={`/admin/uploaded-designs/${row.id}`} onClick={() => markDesignViewed(row)} aria-label="View custom design request" />
                    </DashboardTableActions>
                  </td>
                </tr>
              );
              })}
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No custom designs found for this filter.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
