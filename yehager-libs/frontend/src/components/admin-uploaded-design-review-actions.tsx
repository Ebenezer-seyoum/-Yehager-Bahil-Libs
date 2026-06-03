"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminUploadedDesignReviewActions({
  designId,
  currentStatus,
}: {
  designId: string;
  currentStatus?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const [reason, setReason] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const status = String(currentStatus ?? "").toLowerCase();
  const canReview = status === "submitted" || status === "in_review";

  async function submit(decision: "approve" | "reject") {
    setBusy(decision);
    setMessage(null);
    try {
      const response = await fetch(`/api/backend/admin/uploaded-designs/${designId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: reason || undefined,
          quotedPriceUsd: quotedPrice ? Number(quotedPrice) : undefined,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Review update failed");
      }
      const payload = await response.json();
      if (decision === "approve") {
        const orderId = payload?.data?.order?.id;
        setMessage(orderId ? `Approved and converted to order ${orderId}.` : "Approved successfully.");
      } else {
        setMessage("Rejected successfully. Dummy email placeholder has been recorded.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review update failed");
    } finally {
      setBusy(null);
    }
  }

  if (!canReview) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
        This submission is already reviewed.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold">Admin decision</h3>
      <label className="block text-sm">
        <span className="text-muted-foreground">Quoted price in USD (optional when approving)</span>
        <input
          value={quotedPrice}
          onChange={(e) => setQuotedPrice(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3"
          placeholder="e.g. 180"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">Reason / internal note</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-1 min-h-24 w-full rounded-lg border border-input bg-background p-3"
          placeholder="Explain approval/rejection rationale..."
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void submit("approve")}
          className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Approve and create order
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void submit("reject")}
          className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Reject
        </button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
