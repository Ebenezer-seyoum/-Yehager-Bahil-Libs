"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Baby,
  Calculator,
  Loader2,
  RefreshCw,
  Save,
  UserRound,
  Users,
} from "lucide-react";

const RULES = {
  woman_outfit_addition: 6500,
  men_full_set_addition: 6500,
  men_pants_base: 1700,
  men_pants_addition: 4000,
  men_top_addition: 4000,
  girl_outfit_addition: 6500,
  boy_full_set_addition: 6500,
  boy_pants_base: 1000,
  boy_pants_addition: 4000,
  boy_top_addition: 4000,
} as const;

type RuleKey = keyof typeof RULES;
type RuleValues = Record<RuleKey, string>;
type ApiRule = { ruleKey: string; markupAmountEtb: string | number };

const INITIAL_VALUES = Object.fromEntries(
  Object.entries(RULES).map(([key, value]) => [key, String(value)]),
) as RuleValues;

function amount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function etb(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ETB`;
}

function responseMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const data = payload as { error?: unknown; message?: unknown };
    const message = data.error ?? data.message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function RuleInput({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <span className="mt-1 block min-h-10 text-xs font-semibold leading-5 text-slate-500">
        {description}
      </span>
      <span className="mt-3 flex h-12 items-center overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-base font-black text-slate-950 outline-none"
        />
        <span className="border-l border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-500">
          ETB
        </span>
      </span>
    </label>
  );
}

function FormulaResult({ label, formula, result }: { label: string; formula: string; result: number }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">{label}</p>
      <p className="mt-2 text-xs font-bold text-slate-500">{formula}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{etb(result)}</p>
    </div>
  );
}

export function GlobalPricingRulesClient() {
  const [values, setValues] = useState<RuleValues>(INITIAL_VALUES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch("/api/backend/admin/pricing-rules", { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { data?: ApiRule[] };
      if (!response.ok) throw new Error(responseMessage(payload, "Pricing rules could not be loaded."));
      const next = { ...INITIAL_VALUES };
      for (const rule of payload.data ?? []) {
        if (rule.ruleKey in next) next[rule.ruleKey as RuleKey] = String(rule.markupAmountEtb);
      }
      setValues(next);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Pricing rules could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  function update(key: RuleKey, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function saveRules() {
    const invalid = (Object.keys(RULES) as RuleKey[]).find(
      (key) => values[key].trim() === "" || !Number.isFinite(Number(values[key])) || Number(values[key]) < 0,
    );
    if (invalid) {
      setNotice({ tone: "error", message: "Every pricing-rule field must contain a non-negative number." });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/backend/admin/pricing-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: (Object.keys(RULES) as RuleKey[]).map((ruleKey) => ({
            ruleKey,
            markupAmountEtb: Number(values[ruleKey]),
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(responseMessage(payload, "Pricing rules could not be saved."));
      setNotice({ tone: "success", message: "All global pricing formulas were saved successfully." });
      await loadRules();
      setNotice({ tone: "success", message: "All global pricing formulas were saved successfully." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Pricing rules could not be saved." });
    } finally {
      setSaving(false);
    }
  }

  const menEstimate = 8000;
  const menPantsBase = amount(values.men_pants_base);
  const boyEstimate = 8000;
  const boyPantsBase = amount(values.boy_pants_base);
  const womanEstimate = 4000;
  const girlEstimate = 4000;

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">Admin</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Global Pricing Rules</h1>
            <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
              Convert Telegram designer estimates into official role selling prices using one consistent ETB formula.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void loadRules()} disabled={loading || saving} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button type="button" onClick={() => void saveRules()} disabled={loading || saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save All Rules"}
            </button>
          </div>
        </div>
      </div>

      {notice ? (
        <div className={`rounded-2xl border px-5 py-3 text-sm font-bold ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {notice.message}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-100 p-3 text-blue-700"><Users className="h-5 w-5" /></div>
              <div><h2 className="text-xl font-black text-slate-950">Men</h2><p className="text-sm font-semibold text-slate-500">Full set, pants, and top prices from one Telegram estimate.</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <RuleInput label="Full-set addition" description="Added to the complete men's Telegram estimate." value={values.men_full_set_addition} onChange={(value) => update("men_full_set_addition", value)} />
              <RuleInput label="Pants base cost" description="The fixed designer component assigned to pants." value={values.men_pants_base} onChange={(value) => update("men_pants_base", value)} />
              <RuleInput label="Pants addition" description="Added to the pants base cost." value={values.men_pants_addition} onChange={(value) => update("men_pants_addition", value)} />
              <RuleInput label="Top addition" description="Added after deducting the pants base from the estimate." value={values.men_top_addition} onChange={(value) => update("men_top_addition", value)} />
            </div>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-slate-50/70 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500"><Calculator className="h-4 w-4" /> Example using an 8,000 ETB Telegram estimate</p>
              <div className="grid gap-3 md:grid-cols-3">
                <FormulaResult label="Full set" formula={`8,000 + ${amount(values.men_full_set_addition).toLocaleString()}`} result={menEstimate + amount(values.men_full_set_addition)} />
                <FormulaResult label="Pants only" formula={`${menPantsBase.toLocaleString()} + ${amount(values.men_pants_addition).toLocaleString()}`} result={menPantsBase + amount(values.men_pants_addition)} />
                <FormulaResult label="Top only" formula={`8,000 − ${menPantsBase.toLocaleString()} + ${amount(values.men_top_addition).toLocaleString()}`} result={menEstimate - menPantsBase + amount(values.men_top_addition)} />
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-violet-100 p-3 text-violet-700"><Baby className="h-5 w-5" /></div>
              <div><h2 className="text-xl font-black text-slate-950">Boys</h2><p className="text-sm font-semibold text-slate-500">The men's formula with a separate lower pants base.</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <RuleInput label="Full-set addition" description="Added to the complete boys' Telegram estimate." value={values.boy_full_set_addition} onChange={(value) => update("boy_full_set_addition", value)} />
              <RuleInput label="Pants base cost" description="The fixed designer component assigned to boys' pants." value={values.boy_pants_base} onChange={(value) => update("boy_pants_base", value)} />
              <RuleInput label="Pants addition" description="Added to the boys' pants base cost." value={values.boy_pants_addition} onChange={(value) => update("boy_pants_addition", value)} />
              <RuleInput label="Top addition" description="Added after deducting the boys' pants base." value={values.boy_top_addition} onChange={(value) => update("boy_top_addition", value)} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <FormulaResult label="Full set" formula={`8,000 + ${amount(values.boy_full_set_addition).toLocaleString()}`} result={boyEstimate + amount(values.boy_full_set_addition)} />
              <FormulaResult label="Pants only" formula={`${boyPantsBase.toLocaleString()} + ${amount(values.boy_pants_addition).toLocaleString()}`} result={boyPantsBase + amount(values.boy_pants_addition)} />
              <FormulaResult label="Top only" formula={`8,000 − ${boyPantsBase.toLocaleString()} + ${amount(values.boy_top_addition).toLocaleString()}`} result={boyEstimate - boyPantsBase + amount(values.boy_top_addition)} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><div className="rounded-2xl bg-rose-100 p-3 text-rose-700"><UserRound className="h-5 w-5" /></div><div><h2 className="text-xl font-black text-slate-950">Women</h2><p className="text-sm font-semibold text-slate-500">One addition for the complete outfit.</p></div></div>
            <RuleInput label="Outfit addition" description="Added directly to the Telegram Woman estimate." value={values.woman_outfit_addition} onChange={(value) => update("woman_outfit_addition", value)} />
            <div className="mt-4"><FormulaResult label="4,000 ETB example" formula={`4,000 + ${amount(values.woman_outfit_addition).toLocaleString()}`} result={womanEstimate + amount(values.woman_outfit_addition)} /></div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><div className="rounded-2xl bg-amber-100 p-3 text-amber-700"><UserRound className="h-5 w-5" /></div><div><h2 className="text-xl font-black text-slate-950">Girls</h2><p className="text-sm font-semibold text-slate-500">One addition for the complete outfit.</p></div></div>
            <RuleInput label="Outfit addition" description="Added directly to the Telegram Girl estimate." value={values.girl_outfit_addition} onChange={(value) => update("girl_outfit_addition", value)} />
            <div className="mt-4"><FormulaResult label="4,000 ETB example" formula={`4,000 + ${amount(values.girl_outfit_addition).toLocaleString()}`} result={girlEstimate + amount(values.girl_outfit_addition)} /></div>
          </section>
        </div>
      )}
    </div>
  );
}
