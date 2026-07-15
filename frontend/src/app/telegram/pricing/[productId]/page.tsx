"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

declare global { interface Window { Telegram?: { WebApp?: { initData: string; ready(): void; close(): void } } } }

const fields = ["men", "woman", "boy", "girl"] as const;

export function TelegramPricingPage() {
  const params = useParams<{ productId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? searchParams?.get("startapp") ?? "";
  const productId = params?.productId ?? token.split(".")[0] ?? "";
  const [prices, setPrices] = useState<Record<string, string>>({ men: "", woman: "", boy: "", girl: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { window.Telegram?.WebApp?.ready(); }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    void fetch("/api/backend/integrations/telegram/price-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, token, prices: Object.fromEntries(fields.map((key) => [key, Number(prices[key])])), initData: window.Telegram?.WebApp?.initData || "" }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Submission failed"); setMessage("✅ Price submitted successfully"); window.Telegram?.WebApp?.close(); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Submission failed"))
      .finally(() => setBusy(false));
  }

  return <main className="min-h-screen bg-[#0d1b2a] p-4 text-white"><form onSubmit={submit} className="mx-auto grid max-w-md grid-cols-2 gap-4 pt-4">{fields.map((field) => <label key={field} className="block"><span className="mb-2 block text-sm font-black capitalize">{field} (ETB)</span><input required min="0.01" step="0.01" type="number" inputMode="decimal" placeholder="0.00" value={prices[field]} onChange={(event) => setPrices((current) => ({ ...current, [field]: event.target.value }))} className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-xl font-black text-slate-900 outline-none focus:border-sky-400" /></label>)}<button disabled={busy} className="col-span-2 mt-3 w-full rounded-2xl bg-emerald-500 px-4 py-4 text-xl font-black shadow-lg shadow-emerald-950 disabled:opacity-50">{busy ? "Submitting…" : "Submit Prices"}</button>{message ? <p className="col-span-2 rounded-2xl bg-emerald-950 p-4 text-center font-black text-emerald-300">{message}</p> : null}</form></main>;
}

export default TelegramPricingPage;
