"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, TrendingUp } from "lucide-react";

type ExchangeRate = {
  rate?: number | string | null;
  source?: string | null;
  lastUpdated?: string | null;
  rateType?: "bank_selling" | "market_reference" | null;
  updatedBy?: string | null;
};

export function AdminExchangeRatePanel({ exchangeRate, canEdit }: { exchangeRate: ExchangeRate | null; canEdit: boolean }) {
  const router = useRouter();
  const [manualRate, setManualRate] = useState("");
  const [busy, setBusy] = useState<"refresh" | "save" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshLiveRate() {
    if (!canEdit) return;
    setBusy("refresh");
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/backend/exchange-rate/refresh", { method: "POST" });
      if (!res.ok) throw new Error("Failed to fetch live rate");
      setMessage("Live exchange rate refreshed.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setBusy(null);
    }
  }

  async function saveManualRate() {
    if (!canEdit) return;
    const rate = Number(manualRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      setError("Enter a valid positive exchange rate.");
      return;
    }
    setBusy("save");
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/backend/exchange-rate", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate, rateType: "bank_selling" }),
      });
      if (!res.ok) throw new Error("Could not save manual rate");
      setManualRate("");
      setMessage("Manual exchange rate saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-xl font-semibold">USD ↔ ETB Exchange Rate</h2>
          <p className="text-sm text-muted-foreground">Controls ETB pricing across the storefront and checkout.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Current rate</p>
          {exchangeRate?.rate ? (
            <>
              <p className="mt-2 font-heading text-3xl font-bold text-primary">1 USD = {Number(exchangeRate.rate).toFixed(2)} ETB</p>
              <p className="mt-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {exchangeRate.rateType === "bank_selling" ? "Bank selling rate" : "Live market reference"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Source: {exchangeRate.source ?? "—"} · Last updated: {exchangeRate.lastUpdated ? new Date(exchangeRate.lastUpdated).toLocaleString() : "—"}
              </p>
              {exchangeRate.lastUpdated && Date.now() - new Date(exchangeRate.lastUpdated).getTime() > 24 * 60 * 60 * 1000 ? (
                <p className="mt-2 text-xs font-bold text-amber-600">This rate is older than 24 hours. Refresh or confirm the bank selling rate before creating ETB-priced products.</p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No rate configured yet.</p>
          )}
        </div>
        {canEdit ? (
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Live refresh</p>
            <button
              type="button"
              onClick={() => void refreshLiveRate()}
              disabled={busy !== null}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${busy === "refresh" ? "animate-spin" : ""}`} />
              {busy === "refresh" ? "Fetching..." : "Fetch live rate"}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">Uses the same live source as the legacy workflow.</p>
          </div>
        ) : null}
      </div>

      {canEdit ? (
        <div className="rounded-xl border border-border p-4">
          <p className="font-medium">Bank selling-rate override</p>
          <p className="mt-1 text-sm text-muted-foreground">Enter the bank&apos;s selling rate used for ETB product pricing and bank-transfer orders.</p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2">
              <span className="text-sm text-muted-foreground">1 USD =</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={manualRate}
                onChange={(event) => setManualRate(event.target.value)}
                placeholder="125.50"
                className="h-10 flex-1 rounded-md border border-input bg-background px-3"
              />
              <span className="text-sm text-muted-foreground">ETB</span>
            </div>
            <button
              type="button"
              onClick={() => void saveManualRate()}
              disabled={busy !== null || !manualRate}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-60"
            >
              {busy === "save" ? "Saving..." : "Save rate"}
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="text-sm text-primary">{message}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
