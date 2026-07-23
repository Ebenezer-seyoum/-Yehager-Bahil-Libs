"use client";

import { useState } from "react";
import { RotateCcw, X } from "lucide-react";

export function RefundRequestButton({ orderId, orderNumber, customerName, customerEmail }: { orderId: string; orderNumber: string; customerName: string; customerEmail: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("refund_request");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    if (!message.trim()) { setNotice("Please explain why you are requesting a refund or return."); return; }
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/backend/support/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerName, customerEmail, subject: `Refund or return request for order ${orderNumber}`, messageBody: `Request type: ${reason}\n\n${message.trim()}`, category: "return_refund", priority: "high", orderId }) });
      if (!response.ok) throw new Error("Request could not be submitted");
      setNotice("Your request was submitted. Our team will review it and contact you.");
      setMessage("");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Request could not be submitted"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setNotice(null); }} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"><RotateCcw className="h-3.5 w-3.5" /> Request Refund / Return</button>
      {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-black">Refund or return request</h2><p className="mt-1 text-sm text-muted-foreground">Order {orderNumber}</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><label className="mt-5 block text-xs font-black uppercase tracking-wide text-muted-foreground">Request type<select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"><option value="refund_request">Refund request</option><option value="return_adjustment">Return or alteration request</option><option value="partial_adjustment">Partial adjustment request</option></select></label><label className="mt-4 block text-xs font-black uppercase tracking-wide text-muted-foreground">Explain the issue<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} placeholder="Tell us what happened and what resolution you are requesting..." className="mt-2 w-full rounded-xl border border-input bg-background p-3 text-sm" /></label>{notice ? <p className="mt-3 rounded-xl bg-secondary p-3 text-sm font-semibold text-foreground">{notice}</p> : null}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-bold">Cancel</button><button type="button" disabled={busy} onClick={() => void submit()} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">{busy ? "Submitting..." : "Submit Request"}</button></div></div></div> : null}
    </>
  );
}
