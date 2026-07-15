"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";

type Rule = { ruleKey: string; label: string; markupAmountEtb: string | number; isActive: boolean };

export default function PricingRulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/backend/admin/pricing-rules").then((r) => r.json()).then((j) => setRules(j.data ?? [])).finally(() => setBusy(false)); }, []);
  async function save(rule: Rule) {
    setMessage("");
    const response = await fetch(`/api/backend/admin/pricing-rules/${rule.ruleKey}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markupAmountEtb: Number(rule.markupAmountEtb), isActive: rule.isActive }) });
    setMessage(response.ok ? `${rule.label} saved.` : "Could not save pricing rule.");
  }
  return <main className="mx-auto max-w-4xl space-y-6 p-6"><div><p className="text-xs font-black uppercase tracking-widest text-slate-400">Admin Settings</p><h1 className="mt-2 text-3xl font-black text-slate-900">Global Markup Matrix</h1><p className="mt-2 text-sm text-slate-500">These fixed ETB markups are applied when a designer price is submitted.</p></div>{message ? <p className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}<div className="space-y-3">{busy ? <p>Loading pricing rules…</p> : rules.map((rule) => <div key={rule.ruleKey} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4"><div className="min-w-0 flex-1"><p className="font-black text-slate-900">{rule.label}</p><p className="text-xs font-bold text-slate-400">Global rule · ETB</p></div><input type="number" min="0" value={rule.markupAmountEtb} onChange={(e) => setRules((items) => items.map((item) => item.ruleKey === rule.ruleKey ? { ...item, markupAmountEtb: e.target.value } : item))} className="w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right font-black" /><button type="button" onClick={() => void save(rule)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-3 py-2 text-xs font-black text-white"><Save className="h-4 w-4" /> Save</button></div>)}</div></main>;
}
