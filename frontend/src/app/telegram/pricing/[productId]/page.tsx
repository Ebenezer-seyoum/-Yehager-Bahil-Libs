"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

declare global { interface Window { Telegram?: { WebApp?: { initData: string; ready(): void; close(): void } } } }

const fields = ["men", "woman", "boy", "girl"] as const;

export default function TelegramPricingPage() {
  const params = useParams<{ productId: string }>();
  const productId = params?.productId ?? "";
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
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

  return <main className="min-h-screen bg-[#0d1b2a] px-4 py-6 text-white"><form onSubmit={submit} className="mx-auto max-w-md space-y-6"><header className="border-b border-slate-700 pb-5"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-2xl">✈</div><div><p className="text-2xl font-black">Product Pricing</p><p className="text-sm font-semibold text-slate-400">Secure pricing · Telegram</p></div></div></header><section className="rounded-2xl border border-slate-700 bg-[#12263a] p-4"><p className="text-xs font-black uppercase tracking-widest text-sky-300">Product</p><p className="mt-2 text-xl font-black">{productId}</p><p className="mt-1 text-sm font-semibold text-slate-300">Enter prices in Ethiopian Birr (ETB)</p></section><div className="grid grid-cols-2 gap-4">{fields.map((field) => <label key={field} className="block"><span className="mb-2 block text-sm font-black capitalize">{field} (ETB)</span><input required min="0.01" step="0.01" type="number" inputMode="decimal" placeholder="0.00" value={prices[field]} onChange={(event) => setPrices((current) => ({ ...current, [field]: event.target.value }))} className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-xl font-black text-slate-900 outline-none focus:border-sky-400" /></label>)}</div><section className="flex gap-3 rounded-2xl border border-sky-900 bg-[#12263a] p-4"><span className="text-3xl">🔒</span><div><p className="font-black">Secure price submission</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-400">Your pricing data is transmitted securely.</p></div></section><button disabled={busy} className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-xl font-black shadow-lg shadow-emerald-950 transition hover:bg-emerald-400 disabled:opacity-50">{busy ? "Submitting…" : "✓  Done"}</button>{message ? <p className="rounded-2xl bg-emerald-950 p-4 text-center font-black text-emerald-300">{message}</p> : null}</form></main>;
}
