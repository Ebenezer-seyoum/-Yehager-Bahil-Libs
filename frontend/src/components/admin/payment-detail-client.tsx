"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  RefreshCw, 
  Loader2,
  Banknote,
  CheckCircle2,
  XCircle,
  Landmark,
  CreditCard,
  History,
  Info,
  ShieldCheck,
  AlertCircle,
  Maximize2,
  FileText,
  User,
  ShoppingBag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardConfirm, dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";

type Order = Record<string, any>;

function formatUsd(value?: number | string | null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

export function PaymentDetailClient({ order: initialOrder }: { order: Order }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [busy, setBusy] = useState(false);
  const [showFullProof, setShowFullProof] = useState(false);

  const isEtb = order.paymentMethod === "etb_bank_transfer" || order.payment_currency === "ETB";
  const proofUrl = order.paymentProofUrl || order.payment_proof_url;
  const canVerify = order.paymentStatus === "awaiting_verification" || order.paymentStatus === "pending";

  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/orders/${order.id}`);
      const json = await res.json();
      if (res.ok && json.data) setOrder(json.data);
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  async function updateStatus(status: "paid" | "failed") {
    const ok = await dashboardConfirm({
      title: status === "paid" ? "Verify Payment?" : "Reject Payment?",
      text: status === "paid" ? "Confirm that the bank transfer has been received." : "Reject this proof and mark as failed.",
      confirmButtonText: status === "paid" ? "Yes, Verify" : "Yes, Reject",
      tone: status === "paid" ? "success" : "danger"
    });

    if (ok) {
      setBusy(true);
      try {
        const res = await fetch(`/api/backend/orders/${order.id}/admin-state`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: status })
        });
        if (res.ok) {
          dashboardSuccess("Updated", `Payment marked as ${status}.`);
          refresh();
        } else {
          const err = await res.json();
          throw new Error(err.message || "Update failed");
        }
      } catch (error: any) {
        dashboardError("Error", error.message);
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6 pb-20">
      <header className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl border-l-4 border-l-primary">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-black text-2xl shadow-sm border border-emerald-100">
               <Banknote className="h-10 w-10" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Financial / Verification</p>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Payment Verification</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-xs font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">#{order.orderNumber || order.id.slice(0,8).toUpperCase()}</span>
                <span className="text-sm font-medium text-slate-500">{isEtb ? "ETB Bank Transfer" : "Stripe Transaction"}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
             <div className="flex items-center gap-2">
                <button onClick={() => refresh()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 group transition-all">
                  <RefreshCw className={cn("h-4 w-4 text-slate-400 group-hover:rotate-180 transition-transform duration-500", busy && "animate-spin")} /> Refresh
                </button>
                <button onClick={() => router.back()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition-all active:scale-95">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
             </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-12">
        <main className="lg:col-span-8 space-y-6">
           {isEtb ? (
             <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><FileText className="h-4 w-4" /> Proof of Transfer</h2>
                   <button onClick={() => setShowFullProof(true)} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"><Maximize2 className="h-3 w-3" /> View Full Screen</button>
                </div>
                <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] border border-slate-100 bg-slate-50 group cursor-zoom-in" onClick={() => setShowFullProof(true)}>
                   {proofUrl ? (
                     <img src={proofUrl} className="h-full w-full object-contain" alt="Payment Proof" />
                   ) : (
                     <div className="flex h-full w-full flex-col items-center justify-center text-slate-300">
                        <AlertCircle className="h-16 w-16 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No proof image uploaded by customer</p>
                     </div>
                   )}
                   <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/5 transition-all" />
                </div>
             </section>
           ) : (
             <section className="rounded-[2.5rem] border border-slate-200 bg-white p-20 shadow-sm text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-50 text-blue-600 mb-6">
                   <CreditCard className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase">Stripe Transaction</h3>
                <p className="mt-2 text-slate-500 font-medium max-w-md mx-auto">This payment was processed automatically via Stripe. Verification is handled by the payment gateway provider.</p>
             </section>
           )}

           <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><History className="h-4 w-4" /> Transaction Summary</h2>
              <div className="grid gap-4 md:grid-cols-3">
                 <div className="rounded-2xl bg-slate-50 p-6 flex flex-col items-center text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total USD</span>
                    <span className="text-2xl font-black text-slate-900">{formatUsd(order.totalUsd)}</span>
                 </div>
                 <div className="rounded-2xl bg-slate-50 p-6 flex flex-col items-center text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total ETB</span>
                    <span className="text-2xl font-black text-primary">{order.totalEtb ? `${Number(order.totalEtb).toLocaleString()} ETB` : "N/A"}</span>
                 </div>
                 <div className="rounded-2xl bg-slate-50 p-6 flex flex-col items-center text-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Method</span>
                    <span className="text-xs font-black uppercase text-slate-900">{isEtb ? "Bank Transfer" : "Stripe"}</span>
                 </div>
              </div>
           </section>
        </main>

        <aside className="lg:col-span-4 space-y-6">
           <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
             <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><ShieldCheck className="h-4 w-4" /> Audit Status</h3>
             <div className="space-y-4">
                <div className={cn(
                  "p-6 rounded-2xl border flex flex-col items-center text-center gap-2",
                  order.paymentStatus === "paid" ? "bg-emerald-50 border-emerald-100 text-emerald-900" : 
                  order.paymentStatus === "failed" ? "bg-rose-50 border-rose-100 text-rose-900" :
                  "bg-amber-50 border-amber-100 text-amber-900"
                )}>
                   {order.paymentStatus === "paid" ? <CheckCircle2 className="h-8 w-8" /> : 
                    order.paymentStatus === "failed" ? <XCircle className="h-8 w-8" /> : 
                    <Clock className="h-8 w-8 animate-pulse" />}
                   <span className="text-sm font-black uppercase tracking-widest">{order.paymentStatus?.replaceAll("_", " ") || "Pending"}</span>
                </div>

                {canVerify && isEtb && (
                  <div className="space-y-2 pt-2">
                     <button onClick={() => updateStatus("paid")} disabled={busy} className="w-full flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-black text-white uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />} Verify Proof
                     </button>
                     <button onClick={() => updateStatus("failed")} disabled={busy} className="w-full flex h-14 items-center justify-center gap-2 rounded-2xl bg-rose-600 font-black text-white uppercase tracking-widest shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-5 w-5" />} Reject Proof
                     </button>
                  </div>
                )}
             </div>
           </section>

           <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
             <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><Info className="h-4 w-4" /> Context</h3>
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400"><User className="h-5 w-5" /></div>
                   <div><p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Customer</p><p className="text-sm font-bold text-slate-900">{order.userName || order.userEmail || "Customer"}</p></div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400"><ShoppingBag className="h-5 w-5" /></div>
                   <div><p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Order Link</p><button onClick={() => router.push(`/admin/orders?order=${order.id}`)} className="text-sm font-bold text-primary hover:underline">View Order details</button></div>
                </div>
             </div>
           </section>
        </aside>
      </div>

      {showFullProof && proofUrl && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 p-10 animate-in fade-in duration-300" onClick={() => setShowFullProof(false)}>
           <div className="relative h-full w-full">
              <img src={proofUrl} className="h-full w-full object-contain" />
              <button className="absolute -top-6 -right-6 h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center">
                 <XCircle className="h-6 w-6" />
              </button>
           </div>
        </div>
      )}
    </div>
  );
}
