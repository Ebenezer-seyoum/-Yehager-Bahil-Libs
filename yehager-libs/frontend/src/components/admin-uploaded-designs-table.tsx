"use client";

import Link from "next/link";
import { CheckCircle2, Eye, RefreshCw, XCircle } from "lucide-react";

type UploadedDesignRow = {
  id: string;
  submissionNumber?: string | null;
  designTitle?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  status?: string | null;
  fabricType?: string | null;
  createdAt?: string | null;
};

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
  if (key === "completed request") return "bg-green-500/15 text-green-400 border-green-500/30";
  if (key === "awaiting payment") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
  if (key === "declined") return "bg-red-500/15 text-red-300 border-red-500/30";
  return "bg-yellow-100 text-yellow-800 border-yellow-100";
}

export function AdminUploadedDesignsTable({ rows, search }: { rows: UploadedDesignRow[]; search: string }) {
  const term = search.trim().toLowerCase();
  const filtered = term
    ? rows.filter((row) =>
        [row.submissionNumber, row.designTitle, row.customerName, row.userEmail, row.status, row.fabricType]
          .map((value) => String(value ?? "").toLowerCase())
          .some((value) => value.includes(term)),
      )
    : rows;

  const pendingCount = rows.filter((row) => ["submitted", "in_review"].includes(String(row.status ?? "submitted"))).length;
  const awaitingCount = rows.filter((row) => row.status === "awaiting_payment").length;
  const completedCount = rows.filter((row) => ["approved", "completed_request"].includes(String(row.status))).length;
  const declinedCount = rows.filter((row) => row.status === "rejected").length;

  const chips = [
    ["Pending Review", pendingCount, true],
    ["Awaiting Payment", awaitingCount, false],
    ["Completed Requests", completedCount, false],
    ["Declined", declinedCount, false],
    ["All", rows.length, false],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map(([label, count, active]) => (
          <span
            key={label}
            className={`rounded-full border px-4 py-2 text-sm ${
              active ? "border-primary bg-primary text-black" : "border-border bg-background text-muted-foreground"
            }`}
          >
            {label}{count ? ` (${count})` : ""}
          </span>
        ))}
        <button type="button" className="ml-auto inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((row) => (
          <div key={row.id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs font-black text-primary">#{row.submissionNumber ?? "YBL-CD"}</p>
              <p className="mt-1 truncate text-base font-black text-foreground">{row.customerName ?? row.userEmail ?? "Customer"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {row.designTitle ?? "Custom Design"} · {row.fabricType ?? "Fabric pending"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(row.status)}`}>
                {normalizedStatus(row.status)}
              </span>
              <Link href={`/admin/uploaded-designs/${row.id}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <Eye className="h-4 w-4" />
                Details
              </Link>
              <Link href={`/admin/uploaded-designs/${row.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-black hover:bg-primary/90">
                <CheckCircle2 className="h-4 w-4" />
                Approve & Quote
              </Link>
              <Link href={`/admin/uploaded-designs/${row.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-bold text-white hover:bg-red-600">
                <XCircle className="h-4 w-4" />
                Decline
              </Link>
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No custom designs found for this filter.
          </div>
        ) : null}
      </div>
    </div>
  );
}
