"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { AdminUploadedDesignDialogs, type UploadedDesign } from "@/components/admin-uploaded-design-dialogs";

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
  const key = normalizedStatus(status);
  if (key === "completed request") return "border-emerald-200 bg-emerald-50 text-emerald-700 before:bg-emerald-500";
  if (key === "awaiting payment") return "border-blue-200 bg-blue-50 text-blue-800 before:bg-blue-500";
  if (key === "declined") return "border-rose-200 bg-rose-50 text-rose-700 before:bg-rose-500";
  return "border-amber-200 bg-amber-50 text-amber-800 before:bg-amber-500";
}

export function AdminUploadedDesignsTable({ rows, search }: { rows: UploadedDesign[]; search: string }) {
  const [selected, setSelected] = useState<UploadedDesign | null>(null);
  const [dialog, setDialog] = useState<"view" | null>(null);
  const term = search.trim().toLowerCase();
  const filtered = term
    ? rows.filter((row) =>
        [row.submissionNumber, row.designTitle, row.customerName, row.userEmail, row.status, row.fabricType]
          .map((value) => String(value ?? "").toLowerCase())
          .some((value) => value.includes(term)),
      )
    : rows;

  function open(row: UploadedDesign) {
    setSelected(row);
    setDialog("view");
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-4 font-bold">Request ID</th>
                <th className="px-4 py-4 font-bold">Customer</th>
                <th className="px-4 py-4 font-bold">Submitted</th>
                <th className="px-4 py-4 font-bold">Status</th>
                <th className="px-4 py-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr key={row.id} className={`border-b border-slate-200 last:border-b-0 hover:bg-blue-50/70 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                  <td className="px-4 py-4 font-mono text-xs font-black text-blue-900">#{row.submissionNumber ?? "YBL-CD"}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-950">{row.customerName ?? "Customer"}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{row.userEmail ?? "No email"}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{row.submittedAt || row.createdAt ? new Date(String(row.submittedAt ?? row.createdAt)).toLocaleDateString() : "Not provided"}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex min-w-32 items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold capitalize shadow-sm before:h-2 before:w-2 before:rounded-full before:content-[''] ${statusClass(row.status)}`}>
                      {normalizedStatus(row.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button type="button" onClick={() => open(row)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-900 px-4 text-sm font-bold text-white shadow-sm shadow-blue-900/20 hover:bg-blue-950">
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">No custom designs found for this filter.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <AdminUploadedDesignDialogs design={selected} kind={dialog} onClose={() => { setDialog(null); setSelected(null); }} />
    </div>
  );
}
