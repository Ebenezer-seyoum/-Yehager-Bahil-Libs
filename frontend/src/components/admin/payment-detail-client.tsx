"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
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
import { uploadFileToS3 } from "@/lib/uploads";
import { dashboardConfirm, dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";
import { AdminDetailLayout, AdminDetailHeader } from "@/components/admin/admin-detail-layout";

type OrderValue = string | number | null | undefined;
type Order = Record<string, OrderValue> & { id: string };

function stringValue(value: OrderValue, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function formatUsd(value?: number | string | null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

export function PaymentDetailClient({
  order: initialOrder,
  canVerify: hasVerifyPermission = false,
  canRefund: hasRefundPermission = false,
}: {
  order: Order;
  canVerify?: boolean;
  canRefund?: boolean;
}) {
  const router = useRouter();
  const [order, setOrder] = useState<Order>(initialOrder);
  const [busy, setBusy] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [showFullProof, setShowFullProof] = useState(false);
  const [activeSection, setActiveSection] = useState<"summary" | "breakdown" | "proof" | "audit">("summary");
  const [manualRefundAmount, setManualRefundAmount] = useState("");

  const paymentStatus = String(order.paymentStatus ?? order.payment_status ?? "pending");
  const paymentCurrency = String(order.paymentCurrency ?? order.payment_currency ?? "USD");
  const paymentMethod = String(order.paymentMethod ?? order.payment_method ?? "stripe");
  const orderNumber = order.orderNumber ?? order.order_number ?? order.id.slice(0, 8).toUpperCase();
  const customerName = order.customerName ?? order.customer_name ?? order.userName ?? order.user_email ?? order.userEmail ?? "Customer";
  const totalUsd = order.totalUsd ?? order.total_usd;
  const subtotalUsd = order.subtotalUsd ?? order.subtotal_usd;
  const shippingCostUsd = order.shippingCostUsd ?? order.shipping_cost_usd;
  const discountAmountUsd = order.discountAmountUsd ?? order.discount_amount_usd;
  const creditUsedUsd = order.creditUsedUsd ?? order.credit_used_usd;
  const couponCode = order.couponCode ?? order.coupon_code;
  const totalEtb = order.totalEtb ?? order.total_etb;
  const isEtb = paymentMethod === "etb_bank_transfer" || paymentCurrency === "ETB";
  const proofUrl = stringValue(order.paymentProofUrl ?? order.payment_proof_url);
  const canVerify =
    hasVerifyPermission &&
    (paymentStatus === "awaiting_verification" || paymentStatus === "pending");
  const stripeReceiptUrl = stringValue(order.stripeReceiptUrl ?? order.stripe_receipt_url);
  const stripeSessionId = stringValue(order.stripeSessionId ?? order.stripe_session_id);
  const stripePaymentIntentId = stringValue(order.stripePaymentIntentId ?? order.stripe_payment_intent_id);
  const stripeChargeId = stringValue(order.stripeChargeId ?? order.stripe_charge_id);
  const stripeTransactionId = stripeChargeId || stripePaymentIntentId || stripeSessionId;
  const stripeAmountReceived = order.stripeAmountReceived ?? order.stripe_amount_received;
  const stripeCurrency = String(order.stripeCurrency ?? order.stripe_currency ?? paymentCurrency);
  const stripePaidAt = order.stripePaidAt ?? order.stripe_paid_at;
  const stripeCardBrand = stringValue(order.stripePaymentMethodBrand ?? order.stripe_payment_method_brand);
  const stripeCardLast4 = stringValue(order.stripePaymentMethodLast4 ?? order.stripe_payment_method_last4);
  const stripeCardFunding = order.stripePaymentMethodFunding ?? order.stripe_payment_method_funding;
  const stripeCardCountry = order.stripePaymentMethodCountry ?? order.stripe_payment_method_country;
  const stripeCustomerEmail = order.stripeCustomerEmail ?? order.stripe_customer_email ?? order.userEmail ?? order.user_email;
  const stripeCustomerName = order.stripeCustomerName ?? order.stripe_customer_name ?? customerName;
  const stripeFailureReason = order.stripeFailureReason ?? order.stripe_failure_reason;
  const stripeRefundStatus = stringValue(order.stripeRefundStatus ?? order.stripe_refund_status);
  const stripeRefundAmount = order.stripeRefundAmount ?? order.stripe_refund_amount;
  const refundStatus = stringValue(order.refundStatus ?? order.refund_status);
  const refundProofUrl = stringValue(order.refundProofUrl ?? order.refund_proof_url);
  const refundAmountEtb = order.refundAmountEtb ?? order.refund_amount_etb;
  const paymentProofUploadedAt = order.paymentProofUploadedAt ?? order.payment_proof_uploaded_at;
  const stripePaymentStatus = String(order.stripePaymentStatus ?? order.stripe_payment_status ?? paymentStatus).toLowerCase();
  const stripePaymentCompleted = ["paid", "succeeded", "complete", "completed"].includes(paymentStatus.toLowerCase()) || ["paid", "succeeded", "complete", "completed"].includes(stripePaymentStatus);
  const canRefund = hasRefundPermission && paymentStatus === "paid" && !stripeRefundStatus && order.refundStatus !== "completed";

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

  async function refreshStripeReceipt() {
    if (!stripePaymentCompleted || !stripeTransactionId) return;
    setReceiptBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/orders/${order.id}/stripe-receipt`, { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Could not retrieve the Stripe receipt");
      if (json?.data) setOrder((current) => ({ ...current, ...json.data }));
      await dashboardSuccess("Receipt retrieved", "The Stripe receipt details are now available.");
    } catch (error) {
      await dashboardError("Receipt unavailable", error instanceof Error ? error.message : "Could not retrieve the Stripe receipt");
    } finally {
      setReceiptBusy(false);
    }
  }

  async function updateStatus(status: "paid" | "failed") {
    if (!hasVerifyPermission) return;
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
      } catch (error) {
        dashboardError("Error", error instanceof Error ? error.message : "Update failed");
      } finally {
        setBusy(false);
      }
    }
  }

  async function refundPayment() {
    if (isEtb) return;
    const ok = await dashboardConfirm({ title: "Issue full refund?", text: `Refund ${formatUsd(totalUsd)} to the original Stripe payment method.`, confirmButtonText: "Refund payment", tone: "danger" });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/orders/${order.id}/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Refund failed");
      await dashboardSuccess("Refund completed", `${formatUsd(json?.data?.amountUsd ?? totalUsd)} was returned to the original payment method.`);
      await refresh();
      router.refresh();
    } catch (error) { await dashboardError("Refund failed", error instanceof Error ? error.message : "Refund failed"); }
    finally { setBusy(false); }
  }

  async function manualEtbRefund(file: File) {
    if (!manualRefundAmount || Number(manualRefundAmount) <= 0) { await dashboardError("Amount required", "Enter the ETB amount sent to the customer first."); return; }
    setBusy(true);
    try {
      const proofUrl = await uploadFileToS3(file, `orders/${order.id}/refunds`);
      const res = await fetch(`/api/backend/orders/${order.id}/manual-refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountEtb: Number(manualRefundAmount), proofUrl }) });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? json?.error ?? "Could not complete manual refund");
      await dashboardSuccess("ETB refund completed", "The refund proof was saved and the customer was notified.");
      await refresh();
      router.refresh();
    } catch (error) { await dashboardError("Manual refund failed", error instanceof Error ? error.message : "Manual refund failed"); }
    finally { setBusy(false); }
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
               {canRefund && (
                 isEtb ? (
                   <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2">
                     <input type="number" min="0.01" step="0.01" value={manualRefundAmount} onChange={(event) => setManualRefundAmount(event.target.value)} placeholder="ETB amount" className="h-10 w-28 rounded-lg border border-amber-200 bg-white px-2 text-sm font-bold" />
                     <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-bold text-amber-800">Upload bank proof<input type="file" accept="image/*,application/pdf" className="hidden" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void manualEtbRefund(file); event.currentTarget.value = ""; }} /></label>
                   </div>
                 ) : (
                   <button onClick={() => void refundPayment()} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-lg hover:bg-rose-700 transition-all active:scale-95 disabled:opacity-50">
                     {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Refund to Customer
                   </button>
                 )
               )}
            </div>
          </div>
        </div>
      }
      sections={[
        { id: "summary", label: "Transaction Summary", icon: History },
        { id: "breakdown", label: "Financial Breakdown", icon: Banknote },
        { id: "proof", label: "Proof of Transfer", icon: FileText },
        { id: "audit", label: "Audit & Context", icon: ShieldCheck },
      ]}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as "summary" | "breakdown" | "proof" | "audit")}
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

      {activeSection === "breakdown" && (
        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
           <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><Banknote className="h-4 w-4" /> Financial Breakdown</h2>
           <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-6">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Subtotal Before Coupon</span>
                 <p className="mt-2 text-2xl font-black text-slate-900">{formatUsd(subtotalUsd ?? Number(totalUsd ?? 0) - Number(shippingCostUsd ?? 0) + Number(discountAmountUsd ?? 0))}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-6">
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Coupon Code</span>
                 <p className="mt-2 text-2xl font-black text-slate-900">{couponCode || "None"}</p>
              </div>
              <div className="rounded-2xl bg-rose-50 p-6">
                 <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Coupon Discount</span>
                 <p className="mt-2 text-2xl font-black text-rose-700">{Number(discountAmountUsd ?? 0) > 0 ? `-${formatUsd(discountAmountUsd)}` : "$0.00"}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-6">
                 <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Final Payable</span>
                 <p className="mt-2 text-2xl font-black text-emerald-800">{formatUsd(totalUsd)}</p>
              </div>
           </div>
           <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shipping / Handling</p>
                 <p className="mt-2 text-xl font-black text-slate-900">{formatUsd(shippingCostUsd)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Verification Amount</p>
                 <p className="mt-2 text-xl font-black text-slate-900">{formatUsd(totalUsd)} {paymentCurrency}</p>
              </div>
           </div>
           <p className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-950">
             Verify payment against the final payable amount after coupon discount, not the original subtotal.
           </p>
        </section>
      )}

      {activeSection === "proof" && (
        isEtb ? (
           <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                 <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><FileText className="h-4 w-4" /> Proof of Transfer</h2>
                 {proofUrl ? <button onClick={() => setShowFullProof(true)} className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"><Maximize2 className="h-3 w-3" /> View Full Screen</button> : null}
              </div>
              <div className="rounded-2xl bg-amber-50 p-6">
                 <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Company Credit Used</span>
                 <p className="mt-2 text-2xl font-black text-amber-800">{Number(creditUsedUsd ?? 0) > 0 ? `-${formatUsd(creditUsedUsd)}` : "$0.00"}</p>
              </div>
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <ReceiptField label="Transfer Amount" value={totalEtb ? `${Number(totalEtb).toLocaleString()} ETB` : "Not available"} />
                <ReceiptField label="Payment Status" value={paymentStatus.replaceAll("_", " ")} />
                <ReceiptField label="Proof Uploaded" value={paymentProofUploadedAt ? new Date(String(paymentProofUploadedAt)).toLocaleString() : "Not uploaded"} />
                <ReceiptField label="Refund Status" value={refundStatus || "Not completed"} />
                <ReceiptField label="Refund Amount" value={refundAmountEtb ? `${Number(refundAmountEtb).toLocaleString()} ETB` : "Not recorded"} />
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
              {refundProofUrl ? <a href={refundProofUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl bg-amber-600 px-4 py-2 text-sm font-black text-white hover:bg-amber-700">View Refund Bank Proof</a> : null}
           </section>
        ) : (
           <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
                 <CreditCard className="h-12 w-12" />
              </div>
              <div className="text-center">
                <h3 className="text-2xl font-black uppercase text-slate-900">Stripe Transaction Receipt</h3>
                <p className="mx-auto mt-2 max-w-md font-medium text-slate-500">This payment was processed automatically via Stripe. The receipt data below is captured from Stripe webhooks.</p>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ReceiptField label="Payment Intent" value={stripePaymentIntentId} />
                <ReceiptField label="Charge ID" value={stripeChargeId} />
                <ReceiptField label="Checkout Session" value={stripeSessionId} />
                <ReceiptField label="Amount Received" value={stripeAmountReceived ? `${formatUsd(stripeAmountReceived)} ${stripeCurrency}` : `${formatUsd(totalUsd)} ${paymentCurrency}`} />
                <ReceiptField label="Payment Status" value={order.stripePaymentStatus ?? order.stripe_payment_status ?? paymentStatus} />
                <ReceiptField label="Paid At" value={stripePaidAt ? new Date(String(stripePaidAt)).toLocaleString() : null} />
                <ReceiptField label="Customer Name" value={stripeCustomerName} />
                <ReceiptField label="Customer Email" value={stripeCustomerEmail} />
                <ReceiptField label="Card" value={stripeCardBrand || stripeCardLast4 ? `${String(stripeCardBrand ?? "Card").toUpperCase()} ending ${stripeCardLast4 ?? "----"}` : null} />
                <ReceiptField label="Funding" value={stripeCardFunding} />
                <ReceiptField label="Card Country" value={stripeCardCountry} />
                <ReceiptField label="Refund" value={stripeRefundStatus ? `${stripeRefundStatus.replaceAll("_", " ")}${stripeRefundAmount ? ` - ${formatUsd(stripeRefundAmount)}` : ""}` : "No refund recorded"} />
              </div>
              {stripeFailureReason ? (
                <p className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{stripeFailureReason}</p>
              ) : null}
              {stripeReceiptUrl ? (
                <a href={stripeReceiptUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-black">
                  View Stripe Receipt
                </a>
              ) : stripePaymentCompleted && stripeTransactionId ? (
                <button type="button" onClick={() => void refreshStripeReceipt()} disabled={receiptBusy} className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60">
                  {receiptBusy ? "Fetching Receipt..." : "Fetch Stripe Receipt"}
                </button>
              ) : (
                <p className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                  {stripePaymentCompleted ? "Stripe receipt is not available for this transaction yet." : "A Stripe receipt is available only after the payment is completed successfully."}
                </p>
              )}
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
              <img src={proofUrl} className="h-full w-full object-contain" alt="Payment proof full screen" />
              <button className="absolute -top-6 -right-6 h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all flex items-center justify-center">
                 <XCircle className="h-6 w-6" />
              </button>
           </div>
        </div>
      )}
    </>
  );
}

function ReceiptField({ label, value }: { label: string; value?: unknown }) {
  const text = String(value ?? "").trim();
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-slate-900">{text || "Not available"}</p>
    </div>
  );
}
