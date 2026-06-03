"use client";

import Link from "next/link";

type UploadedDesignRow = {
  id: string;
  submissionNumber?: string | null;
  designTitle?: string | null;
  customerName?: string | null;
  userEmail?: string | null;
  status?: string | null;
  createdAt?: string | null;
  approvedOrderId?: string | null;
};

function statusClass(status?: string | null) {
  const key = String(status ?? "").toLowerCase();
  if (key === "approved") return "bg-green-500/15 text-green-600 border-green-500/30";
  if (key === "rejected") return "bg-red-500/15 text-red-600 border-red-500/30";
  if (key === "in_review") return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  return "bg-amber-500/15 text-amber-600 border-amber-500/30";
}

export function AdminUploadedDesignsTable({ rows, search }: { rows: UploadedDesignRow[]; search: string }) {
  const term = search.trim().toLowerCase();
  const filtered = term
    ? rows.filter((row) =>
        [row.submissionNumber, row.designTitle, row.customerName, row.userEmail, row.status]
          .map((v) => String(v ?? "").toLowerCase())
          .some((value) => value.includes(term)),
      )
    : rows;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-secondary/50">
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Submission</th>
              <th className="px-4 py-3">Design</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-border/70">
                <td className="px-4 py-3 font-mono text-xs">{row.submissionNumber ?? "—"}</td>
                <td className="px-4 py-3 font-medium">{row.designTitle ?? "Untitled design"}</td>
                <td className="px-4 py-3">
                  <div>{row.customerName ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{row.userEmail ?? "—"}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(row.status)}`}>
                    {String(row.status ?? "submitted")}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {row.approvedOrderId ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/uploaded-designs/${row.id}`} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    View details
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={7}>
                  No uploaded designs found for this filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
