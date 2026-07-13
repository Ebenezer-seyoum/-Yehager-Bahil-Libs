"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Upload,
} from "lucide-react";
import { uploadFileToS3 } from "@/lib/uploads";

const QR_CODE_URL = "/images/bank-transfer-qr-behailu-code.jpg";
const BANK_ACCOUNT_NAME = "BEHAILU ABERA GADISA";
const BANK_ACCOUNT_NUMBER = "97584516";

export function EtbPaymentProof({
  orderId,
  orderNumber,
  totalEtb,
  etbExchangeRate,
}: {
  orderId: string;
  orderNumber: string;
  totalEtb: number | null;
  etbExchangeRate?: number | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const hasConfirmedAmount = Number.isFinite(totalEtb) && Number(totalEtb) > 0;
  const amountLabel = hasConfirmedAmount ? `${Number(totalEtb).toLocaleString()} ETB` : "Pending team confirmation";

  async function copyOrderNumber() {
    await navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function uploadProof(selected: File) {
    setBusy(true);
    setError(null);
    try {
      const uploadUrl = await uploadFileToS3(selected, "payments/etb-proofs");
      setProofUrl(uploadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitProof() {
    if (!proofUrl) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/backend/orders/${orderId}/etb-proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentProofUrl: proofUrl }),
      });
      if (!res.ok) throw new Error("Could not submit payment proof");
      router.push(`/order-confirmation?order=${orderId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 to-amber-500/5 p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
          Amount To Transfer
        </p>
        <div className="flex flex-wrap items-baseline gap-3">
          {hasConfirmedAmount ? (
            <>
              <span className="font-heading text-4xl font-bold text-foreground sm:text-5xl">
                {Number(totalEtb).toLocaleString()}
              </span>
              <span className="text-xl font-semibold text-primary">ETB</span>
            </>
          ) : (
            <span className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
              Pending team confirmation
            </span>
          )}
        </div>
        {etbExchangeRate ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Rate: 1 USD = {etbExchangeRate.toLocaleString()} ETB
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Our team will confirm the exact ETB amount before verifying payment.
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-5 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Bank Transfer QR Code
          </p>
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <img
              src={QR_CODE_URL}
              alt={`${BANK_ACCOUNT_NAME} bank transfer QR code`}
              className="h-64 w-64 object-contain"
            />
          </div>
          <div className="mt-4 w-full rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Account Name
            </p>
            <p className="mt-1 text-sm font-black uppercase tracking-wide text-foreground">
              {BANK_ACCOUNT_NAME}
            </p>
            <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Bank Account
            </p>
            <p className="mt-1 font-mono text-lg font-black text-foreground">
              {BANK_ACCOUNT_NUMBER}
            </p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Scan with your banking app to pay
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            How To Pay
          </p>
          <ol className="space-y-3 text-sm">
            {[
              `Open your mobile banking app and choose Scan QR, or transfer manually to ${BANK_ACCOUNT_NAME}.`,
              hasConfirmedAmount ? `Transfer exactly ${amountLabel}.` : "Contact support or wait for our team to confirm the exact ETB amount for this order.",
              "Use your order number below as the payment reference / remark.",
              "Take a screenshot of the successful transfer confirmation.",
              "Upload the screenshot below and confirm payment.",
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <span className="leading-relaxed text-muted-foreground">
                  {step}
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">
              Payment Reference (Order Number)
            </p>
            <button
              type="button"
              onClick={() => void copyOrderNumber()}
              className="flex w-full items-center justify-between gap-2 rounded-lg bg-secondary p-3 transition hover:bg-secondary/70"
            >
              <span className="font-mono text-sm font-bold">{orderNumber}</span>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-dashed border-border bg-card p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary">
          Step 2 · Upload Payment Proof
        </p>
        <p className="mb-4 text-sm text-muted-foreground">
          A screenshot of your bank transfer confirmation is required to process
          your order.
        </p>
        {!proofUrl ? (
          <label
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-colors ${busy ? "border-primary bg-primary/5" : "border-border hover:border-primary hover:bg-primary/5"}`}
          >
            <input
              className="hidden"
              type="file"
              accept="image/*,application/pdf"
              disabled={busy}
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                if (selected) void uploadProof(selected);
              }}
            />
            {busy ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  Uploading...
                </span>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Click to upload screenshot
                </span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG, PDF or HEIC
                </span>
              </>
            )}
          </label>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-green-600">
                Proof uploaded successfully
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {file?.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setProofUrl(null);
                setFile(null);
              }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Replace
            </button>
          </div>
        )}
        {error ? (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        ) : null}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="text-xs leading-relaxed text-amber-800">
          <p className="mb-1 font-semibold">Payment Verification</p>
          <p>
            Once you confirm, our team will verify your bank transfer, typically
            within a few hours. Tailoring begins once payment is verified.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={!proofUrl || busy}
        onClick={() => void submitProof()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-5 w-5" />
        )}
        {busy ? "Processing..." : "I have completed the payment"}
      </button>
    </div>
  );
}
