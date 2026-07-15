"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";

declare global { interface Window { Telegram?: { WebApp?: { initData: string; ready(): void; close(): void } } } }

const fields = ["men", "woman", "boy", "girl"] as const;

export default function TelegramPricingPage() {
  const params = useParams<{ productId: string }>();
  const productId = params?.productId ?? "";
  const [prices, setPrices] = useState<Record<string, string>>({ men: "", woman: "", boy: "", girl: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    void fetch("/api/backend/integrations/telegram/price-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, prices: Object.fromEntries(fields.map((key) => [key, Number(prices[key])])), initData: window.Telegram?.WebApp?.initData || "" }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Submission failed"); setMessage("✅ Price submitted successfully"); window.Telegram?.WebApp?.close(); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Submission failed"))
      .finally(() => setBusy(false));
  }

  return <main className="min-h-screen bg-slate-950 p-4 text-white"><form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-3xl bg-slate-900 p-5"><h1 className="text-xl font-black">Enter product prices</h1>{fields.map((field) => <label key={field} className="block"><span className="mb-1 block text-sm font-bold capitalize">{field} price (ETB)</span><input required min="0.01" type="number" inputMode="decimal" value={prices[field]} onChange={(event) => setPrices((current) => ({ ...current, [field]: event.target.value }))} className="w-full rounded-xl bg-white px-4 py-3 text-lg font-bold text-slate-900" /></label>)}<button disabled={busy} className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-black disabled:opacity-50">{busy ? "Submitting…" : "Done"}</button>{message ? <p className="rounded-xl bg-emerald-950 p-3 font-bold">{message}</p> : null}</form></main>;
}
