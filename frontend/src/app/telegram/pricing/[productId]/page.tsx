"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Script from "next/script";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: { start_param?: string };
        ready(): void;
        close(): void;
      };
    };
  }
}

const fields = ["men", "woman", "boy", "girl"] as const;

function productIdFromLaunchToken(token: string) {
  if (!token) return "";
  if (token.includes(".")) return token.split(".")[0] || "";
  try {
    if (typeof atob !== "function") return "";
    const normalized = token.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(token.length / 4) * 4, "=");
    const decoded = atob(normalized);
    if (decoded.length !== 36) return "";
    const hex = Array.from(decoded.slice(0, 16), (character) => character.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return "";
  }
}

export function TelegramPricingPage() {
  const params = useParams<{ productId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? searchParams?.get("startapp") ?? searchParams?.get("tgWebAppStartParam") ?? "";
  const [startParam, setStartParam] = useState("");
  const [telegramReady, setTelegramReady] = useState(false);
  const launchToken = token || startParam;
  const productId = params?.productId || productIdFromLaunchToken(launchToken);
  const [prices, setPrices] = useState<Record<string, string>>({ men: "", woman: "", boy: "", girl: "" });
  const [message, setMessage] = useState("");
  const [productName, setProductName] = useState("");
  const [busy, setBusy] = useState(false);
  const loadedProductRef = useRef("");

  useEffect(() => {
    let attempts = 0;
    const notifyTelegram = () => {
      const webApp = window.Telegram?.WebApp;
      if (webApp) {
        setStartParam(webApp.initDataUnsafe?.start_param || "");
        setTelegramReady(true);
        webApp.ready();
        return true;
      }
      return false;
    };
    if (notifyTelegram()) return;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (notifyTelegram() || attempts >= 20) {
        setTelegramReady(true);
        window.clearInterval(timer);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!productId || loadedProductRef.current === productId || (!launchToken && !telegramReady)) return;
    loadedProductRef.current = productId;
    let cancelled = false;
    void fetch("/api/backend/integrations/telegram/price-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, token: launchToken, initData: window.Telegram?.WebApp?.initData || "" }),
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Price form lookup failed");
      if (cancelled) return;
      const existing = payload.data?.prices as Record<string, number> | undefined;
      setProductName(String(payload.data?.productName || payload.data?.uniqueId || ""));
      if (existing) {
        setPrices({
          men: Number(existing.men) > 0 ? String(existing.men) : "",
          woman: Number(existing.woman) > 0 ? String(existing.woman) : "",
          boy: Number(existing.boy) > 0 ? String(existing.boy) : "",
          girl: Number(existing.girl) > 0 ? String(existing.girl) : "",
        });
      }
    }).catch((error) => {
      loadedProductRef.current = "";
      if (!cancelled) setMessage(error instanceof Error ? error.message : "Price form lookup failed");
    });
    return () => { cancelled = true; };
  }, [launchToken, productId, telegramReady]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    void fetch("/api/backend/integrations/telegram/price-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, token: launchToken, prices: Object.fromEntries(fields.map((key) => [key, Number(prices[key])])), initData: window.Telegram?.WebApp?.initData || "" }) })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Submission failed"); if (!data.telegramUpdated) throw new Error("Prices were saved, but the Telegram post could not be updated. Please contact an administrator."); window.Telegram?.WebApp?.close(); })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Submission failed"))
      .finally(() => setBusy(false));
  }

  if (!productId && !telegramReady) return <><Script src="https://telegram.org/js/telegram-web-app.js?57" strategy="afterInteractive" onLoad={() => window.Telegram?.WebApp?.ready()} /><main className="flex min-h-screen items-center justify-center bg-[#0d1b2a] px-6 text-center text-white"><p className="text-lg font-bold text-white">Loading price form…</p></main></>;
  if (!productId) return <main className="flex min-h-screen items-center justify-center bg-[#0d1b2a] px-6 text-center text-white"><p className="max-w-md text-lg font-bold">This price form could not identify the product. Please reopen it from Telegram.</p></main>;

  return <>
    <Script src="https://telegram.org/js/telegram-web-app.js?57" strategy="afterInteractive" onLoad={() => window.Telegram?.WebApp?.ready()} />
    <main className="min-h-screen bg-[#0d1b2a] px-4 py-8 text-white sm:px-6 sm:py-12"><section className="mx-auto w-full max-w-2xl"><h1 className="text-center text-2xl font-black tracking-tight sm:text-3xl">Enter Product Prices</h1>{productName ? <p className="mb-8 mt-2 text-center text-sm font-bold text-slate-300">{productName}</p> : <div className="mb-8" />}<form onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">{fields.map((field) => <label key={field} className="block"><span className="mb-2 block text-base font-black capitalize sm:text-lg">{field} (ETB)</span><input required min="0.01" step="0.01" type="number" inputMode="decimal" placeholder="0.00" value={prices[field]} onChange={(event) => setPrices((current) => ({ ...current, [field]: event.target.value }))} className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-xl font-black text-slate-900 outline-none focus:border-sky-400 sm:py-5" /></label>)}<button disabled={busy} className="mt-1 w-full rounded-2xl bg-emerald-500 px-4 py-4 text-xl font-black shadow-lg shadow-emerald-950 disabled:opacity-50 sm:col-span-2 sm:py-5">{busy ? "Submitting…" : "Submit Prices"}</button>{message ? <p className="rounded-2xl bg-emerald-950 p-4 text-center font-black text-emerald-300 sm:col-span-2">{message}</p> : null}</form></section></main>
  </>;
}

export default TelegramPricingPage;
