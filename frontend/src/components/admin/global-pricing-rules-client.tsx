"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calculator,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react";
import { RolePricingAccordion } from "@/components/admin/role-pricing-accordion";
import { hardRefreshPage, UNSAVED_REFRESH_WARNING } from "@/lib/hard-refresh";

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
type ScopeType = "global" | "tribe" | "region";
type ApiRule = { ruleKey: string; markupAmountEtb: string | number; isOverride?: boolean };
type ApiTribe = { name: string; regions: string[] };

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
  disabled,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
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
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-base font-black text-slate-950 outline-none disabled:cursor-not-allowed disabled:text-slate-500"
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

export function GlobalPricingRulesClient({ canEdit }: { canEdit: boolean }) {
  const [values, setValues] = useState<RuleValues>(INITIAL_VALUES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [scopeType, setScopeType] = useState<ScopeType>("global");
  const [tribeName, setTribeName] = useState("");
  const [regionName, setRegionName] = useState("");
  const [tribes, setTribes] = useState<ApiTribe[]>([]);
  const [hasOverrides, setHasOverrides] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const params = new URLSearchParams({ scopeType });
      if (scopeType !== "global" && tribeName) params.set("tribeName", tribeName);
      if (scopeType === "region" && regionName) params.set("regionName", regionName);
      const response = await fetch(`/api/backend/admin/pricing-rules?${params}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as { data?: ApiRule[]; tribes?: ApiTribe[] };
      if (!response.ok) throw new Error(responseMessage(payload, "Pricing rules could not be loaded."));
      setTribes(payload.tribes ?? []);
      setHasOverrides((payload.data ?? []).some((rule) => rule.isOverride));
      const next = { ...INITIAL_VALUES };
      for (const rule of payload.data ?? []) {
        if (rule.ruleKey in next) next[rule.ruleKey as RuleKey] = String(rule.markupAmountEtb);
      }
      setValues(next);
      setDirty(false);
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Pricing rules could not be loaded." });
    } finally {
      setLoading(false);
    }
  }, [regionName, scopeType, tribeName]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  function update(key: RuleKey, value: string) {
    if (!canEdit) return;
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function saveRules() {
    if (!canEdit) return;
    if ((scopeType !== "global" && !tribeName) || (scopeType === "region" && !regionName)) {
      setNotice({ tone: "error", message: "Choose the tribe and region before saving scoped pricing rules." });
      return;
    }
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
          scopeType,
          tribeName: scopeType === "global" ? undefined : tribeName,
          regionName: scopeType === "region" ? regionName : undefined,
          rules: (Object.keys(RULES) as RuleKey[]).map((ruleKey) => ({
            ruleKey,
            markupAmountEtb: Number(values[ruleKey]),
          })),
        }),
      });
      const payload = await response.json().catch(() => ({})) as { recalculation?: { affected?: number; updated?: number; skipped?: number; failed?: number } };
      if (!response.ok) throw new Error(responseMessage(payload, "Pricing rules could not be saved."));
      const result = payload.recalculation;
      const scopeLabel = scopeType === "global" ? "global" : scopeType === "tribe" ? `${tribeName} tribe` : `${tribeName} / ${regionName} region`;
      const resultMessage = result
        ? ` ${result.updated ?? 0} of ${result.affected ?? 0} approved products were updated${result.skipped ? `; ${result.skipped} had no approved estimate` : ""}${result.failed ? `; ${result.failed} require review` : ""}.`
        : "";
      setNotice({ tone: "success", message: `The ${scopeLabel} pricing formulas were saved.${resultMessage}` });
      await loadRules();
      setNotice({ tone: "success", message: `The ${scopeLabel} pricing formulas were saved.${resultMessage}` });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Pricing rules could not be saved." });
    } finally {
      setSaving(false);
    }
  }

  async function resetOverrides() {
    if (!canEdit) return;
    if (scopeType === "global") return;
    setSaving(true);
    setNotice(null);
    try {
      const params = new URLSearchParams({ scopeType, tribeName });
      if (scopeType === "region") params.set("regionName", regionName);
      const response = await fetch(`/api/backend/admin/pricing-rules?${params}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({})) as { recalculation?: { affected?: number; updated?: number } };
      if (!response.ok) throw new Error(responseMessage(payload, "Pricing overrides could not be reset."));
      await loadRules();
      setNotice({ tone: "success", message: `Scope overrides were removed. ${payload.recalculation?.updated ?? 0} approved products now use inherited pricing.` });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Pricing overrides could not be reset." });
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
  const selectedTribe = tribes.find((tribe) => tribe.name === tribeName);
  const regionOptions = selectedTribe?.regions ?? [];

  function changeScope(nextScope: ScopeType) {
    setHasOverrides(false);
    setScopeType(nextScope);
    if (nextScope === "global") {
      setTribeName("");
      setRegionName("");
      return;
    }
    const nextTribe = tribeName || tribes[0]?.name || "";
    setTribeName(nextTribe);
    const nextRegions = tribes.find((tribe) => tribe.name === nextTribe)?.regions ?? [];
    setRegionName(nextScope === "region" ? regionName || nextRegions[0] || "" : "");
  }

  const scopeReady = scopeType === "global" || Boolean(tribeName && (scopeType !== "region" || regionName));

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-5">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => hardRefreshPage(dirty ? UNSAVED_REFRESH_WARNING : undefined)} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-60">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            {canEdit && scopeType !== "global" ? (
              <button type="button" onClick={() => void resetOverrides()} disabled={loading || saving || !hasOverrides} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                <RotateCcw className="h-4 w-4" />
                Use Inherited Rules
              </button>
            ) : null}
            {canEdit ? <button type="button" onClick={() => void saveRules()} disabled={loading || saving || !scopeReady} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving..." : "Save All Rules"}
            </button> : null}
          </div>
        </div>
      </div>

      {notice ? (
        <div className={`rounded-2xl border px-5 py-3 text-sm font-bold ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {notice.message}
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Pricing scope</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Choose which products receive these rules</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Region rules override tribe rules, and tribe rules override the global defaults.</p>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-3 xl:min-w-[720px]">
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Apply to</span>
              <select value={scopeType} onChange={(event) => changeScope(event.target.value as ScopeType)} disabled={saving} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none focus:border-blue-500">
                <option value="global">All Products</option>
                <option value="tribe">Selected Tribe</option>
                <option value="region">Selected Region</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Tribe</span>
              <select value={tribeName} onChange={(event) => {
                const nextTribe = event.target.value;
                setTribeName(nextTribe);
                const nextRegions = tribes.find((tribe) => tribe.name === nextTribe)?.regions ?? [];
                setRegionName(scopeType === "region" ? nextRegions[0] ?? "" : "");
              }} disabled={scopeType === "global" || saving} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-500">
                <option value="">Choose tribe</option>
                {tribes.map((tribe) => <option key={tribe.name} value={tribe.name}>{tribe.name}</option>)}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Region</span>
              <select value={regionName} onChange={(event) => setRegionName(event.target.value)} disabled={scopeType !== "region" || saving} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-blue-500">
                <option value="">Choose region</option>
                {regionOptions.map((region) => <option key={region} value={region}>{region}</option>)}
              </select>
            </label>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm font-bold text-blue-900">
          {canEdit ? "Editing" : "Viewing"}: {scopeType === "global" ? "all products" : scopeType === "tribe" ? tribeName || "select a tribe" : tribeName && regionName ? `${tribeName} / ${regionName}` : "select a tribe and region"}.{canEdit ? " Saving automatically recalculates approved products in this scope." : " Editing requires the settings.edit permission."}
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
        </div>
      ) : (
        <RolePricingAccordion
          defaultValue="man"
          groups={[
            {
              value: "man",
              label: "Men",
              description: "4 rules · Full set, pants, and top from one Telegram estimate",
              content: <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <RuleInput disabled={!canEdit} label="Full-set addition" description="Added to the complete men's Telegram estimate." value={values.men_full_set_addition} onChange={(value) => update("men_full_set_addition", value)} />
                  <RuleInput disabled={!canEdit} label="Pants base cost" description="The fixed designer component assigned to pants." value={values.men_pants_base} onChange={(value) => update("men_pants_base", value)} />
                  <RuleInput disabled={!canEdit} label="Pants addition" description="Added to the pants base cost." value={values.men_pants_addition} onChange={(value) => update("men_pants_addition", value)} />
                  <RuleInput disabled={!canEdit} label="Top addition" description="Added after deducting the pants base from the estimate." value={values.men_top_addition} onChange={(value) => update("men_top_addition", value)} />
                </div>
                <div className="rounded-2xl border border-blue-100 bg-slate-50/70 p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500"><Calculator className="h-4 w-4" /> Example using an 8,000 ETB Telegram estimate</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <FormulaResult label="Full set" formula={`8,000 + ${amount(values.men_full_set_addition).toLocaleString()}`} result={menEstimate + amount(values.men_full_set_addition)} />
                    <FormulaResult label="Pants only" formula={`${menPantsBase.toLocaleString()} + ${amount(values.men_pants_addition).toLocaleString()}`} result={menPantsBase + amount(values.men_pants_addition)} />
                    <FormulaResult label="Top only" formula={`8,000 − ${menPantsBase.toLocaleString()} + ${amount(values.men_top_addition).toLocaleString()}`} result={menEstimate - menPantsBase + amount(values.men_top_addition)} />
                  </div>
                </div>
              </div>,
            },
            {
              value: "woman",
              label: "Women",
              description: "1 rule · One addition for the complete outfit",
              content: <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(280px,1fr)]">
                <RuleInput disabled={!canEdit} label="Outfit addition" description="Added directly to the Telegram Woman estimate." value={values.woman_outfit_addition} onChange={(value) => update("woman_outfit_addition", value)} />
                <FormulaResult label="4,000 ETB example" formula={`4,000 + ${amount(values.woman_outfit_addition).toLocaleString()}`} result={womanEstimate + amount(values.woman_outfit_addition)} />
              </div>,
            },
            {
              value: "boy",
              label: "Boys",
              description: "4 rules · Men's formula with a lower pants base",
              content: <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <RuleInput disabled={!canEdit} label="Full-set addition" description="Added to the complete boys' Telegram estimate." value={values.boy_full_set_addition} onChange={(value) => update("boy_full_set_addition", value)} />
                  <RuleInput disabled={!canEdit} label="Pants base cost" description="The fixed designer component assigned to boys' pants." value={values.boy_pants_base} onChange={(value) => update("boy_pants_base", value)} />
                  <RuleInput disabled={!canEdit} label="Pants addition" description="Added to the boys' pants base cost." value={values.boy_pants_addition} onChange={(value) => update("boy_pants_addition", value)} />
                  <RuleInput disabled={!canEdit} label="Top addition" description="Added after deducting the boys' pants base." value={values.boy_top_addition} onChange={(value) => update("boy_top_addition", value)} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <FormulaResult label="Full set" formula={`8,000 + ${amount(values.boy_full_set_addition).toLocaleString()}`} result={boyEstimate + amount(values.boy_full_set_addition)} />
                  <FormulaResult label="Pants only" formula={`${boyPantsBase.toLocaleString()} + ${amount(values.boy_pants_addition).toLocaleString()}`} result={boyPantsBase + amount(values.boy_pants_addition)} />
                  <FormulaResult label="Top only" formula={`8,000 − ${boyPantsBase.toLocaleString()} + ${amount(values.boy_top_addition).toLocaleString()}`} result={boyEstimate - boyPantsBase + amount(values.boy_top_addition)} />
                </div>
              </div>,
            },
            {
              value: "girl",
              label: "Girls",
              description: "1 rule · One addition for the complete outfit",
              content: <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(280px,1fr)]">
                <RuleInput disabled={!canEdit} label="Outfit addition" description="Added directly to the Telegram Girl estimate." value={values.girl_outfit_addition} onChange={(value) => update("girl_outfit_addition", value)} />
                <FormulaResult label="4,000 ETB example" formula={`4,000 + ${amount(values.girl_outfit_addition).toLocaleString()}`} result={girlEstimate + amount(values.girl_outfit_addition)} />
              </div>,
            },
          ]}
        />
      )}
    </div>
  );
}
