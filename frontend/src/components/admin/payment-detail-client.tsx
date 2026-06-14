"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  RefreshCw, 
  Loader2,
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
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
import { AdminDetailLayout, AdminDetailHeader } from "@/components/admin/admin-detail-layout";

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
  const [activeSection, setActiveSection] = useState<"summary" | "proof" | "audit">("summary");

  const paymentStatus = order.paymentStatus ?? order.payment_status ?? "pending";
  const paymentCurrency = order.paymentCurrency ?? order.payment_currency ?? "USD";
  const paymentMethod = order.paymentMethod ?? order.payment_method ?? "stripe";
  const orderNumber = order.orderNumber ?? order.order_number ?? order.id.slice(0, 8).toUpperCase();
  const customerName = order.customerName ?? order.customer_name ?? order.userName ?? order.user_email ?? order.userEmail ?? "Customer";
  const totalUsd = order.totalUsd ?? order.total_usd;
  const totalEtb = order.totalEtb ?? order.total_etb;
  const isEtb = paymentMethod === "etb_bank_transfer" || paymentCurrency === "ETB";
  const proofUrl = order.paymentProofUrl || order.payment_proof_url;
  const canVerify = paymentStatus === "awaiting_verification" || paymentStatus === "pending";

  useEffect(() => {
    if (!order.id) return;
    window.dispatchEvent(new CustomEvent("admin-payment-viewed", { detail: order.id }));
  }, [order.id]);

  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/orders/${order.id}`);
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
          router.refresh();
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
    <>
    <AdminDetailLayout
      topHeader={
        <AdminDetailHeader
          icon={Banknote}
          iconTheme="bg-emerald-50 text-emerald-600 border-emerald-100"
          category="Financial / Verification"
          title="Payment Verification"
          subtitle={isEtb ? "ETB Bank Transfer" : "Stripe Transaction"}
          onRefresh={refresh}
          onBack={() => router.back()}
        />
      }
      profileCard={
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => proofUrl && setShowFullProof(true)}
              className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-emerald-600"
            >
              {proofUrl ? (
                <img src={proofUrl} alt="Payment proof preview" className="h-full w-full object-cover" />
              ) : isEtb ? (
                <Landmark className="h-14 w-14" />
              ) : (
                <CreditCard className="h-14 w-14 text-blue-500" />
              )}
            </button>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payment #{orderNumber}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{customerName} - {isEtb ? "Bank Transfer" : "Stripe Card"}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="font-mono text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{order.id.slice(0, 8).toUpperCase()}</span>
                <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-0.5 text-[10px] font-black uppercase text-slate-600">{paymentStatus.replaceAll("_", " ")}</span>
                <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-0.5 text-[10px] font-black uppercase text-slate-600">{paymentCurrency}</span>
              </div>
              <p className="mt-4 text-3xl font-black text-slate-950">{formatUsd(totalUsd)}</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-end">
            <div className="flex flex-wrap gap-2">
               {canVerify && (
                  <>
                     <button onClick={() => updateStatus("paid")} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Approve Payment
                     </button>
                     <button onClick={() => updateStatus("failed")} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-lg hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Reject Payment
                     </button>
                  </>
               )}
            </div>
          </div>
        </div>
      }
      sections={[
        { id: "summary", label: "Transaction Summary", icon: History },
        { id: "proof", label: "Proof of Transfer", icon: FileText },
        { id: "audit", label: "Audit & Context", icon: ShieldCheck },
      ]}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as any)}
    >
      {activeSection === "summary" && (
        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
           <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><History className="h-4 w-4" /> Transaction Summary</h2>
           <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-6 flex flex-col items-center text-center">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total USD</span>
                 <span className="text-2xl font-black text-slate-900">{formatUsd(totalUsd)}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 p-6 flex flex-col items-center text-center">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total ETB</span>
                 <span className="text-2xl font-black text-primary">{totalEtb ? `${Number(totalEtb).toLocaleString()} ETB` : "N/A"}</span>
              </div>
              <div className="rounded-2xl bg-slate-50 p-6 flex flex-col items-center text-center">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Method</span>
                 <span className="text-xs font-black uppercase text-slate-900">{isEtb ? "Bank Transfer" : "Stripe"}</span>
              </div>
           </div>
        </section>
      )}

      {activeSection === "proof" && (
        isEtb ? (
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
        )
      )}

      {activeSection === "audit" && (
         <div className="space-y-6">
           <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
             <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><ShieldCheck className="h-4 w-4" /> Audit Status</h3>
             <div className="space-y-4">
                <div className={cn(
                  "p-6 rounded-2xl border flex flex-col items-center text-center gap-2",
                  paymentStatus === "paid" ? "bg-emerald-50 border-emerald-100 text-emerald-900" : 
                  paymentStatus === "failed" ? "bg-rose-50 border-rose-100 text-rose-900" :
                  "bg-amber-50 border-amber-100 text-amber-900"
                )}>
                   {paymentStatus === "paid" ? <CheckCircle2 className="h-8 w-8" /> : 
                    paymentStatus === "failed" ? <XCircle className="h-8 w-8" /> : 
                    <Clock className="h-8 w-8 animate-pulse" />}
                   <span className="text-sm font-black uppercase tracking-widest">{paymentStatus.replaceAll("_", " ")}</span>
                </div>
             </div>
           </section>

           <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
             <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><Info className="h-4 w-4" /> Context</h3>
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400"><User className="h-5 w-5" /></div>
                   <div><p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Customer</p><p className="text-sm font-bold text-slate-900">{customerName}</p></div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400"><ShoppingBag className="h-5 w-5" /></div>
                   <div><p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Order Link</p><button onClick={() => router.push(`/admin/orders?order=${order.id}`)} className="text-sm font-bold text-primary hover:underline">View Order details</button></div>
                </div>
             </div>
           </section>
         </div>
      )}
    </AdminDetailLayout>

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
    </>
  );
}
