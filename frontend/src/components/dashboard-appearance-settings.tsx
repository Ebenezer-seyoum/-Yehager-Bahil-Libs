"use client";

import { useEffect, useState } from "react";
import { Check, Palette, RotateCcw, Save } from "lucide-react";

const defaults = { topBarColor: "#0f172a", sidebarColor: "#0f172a" };

export function DashboardAppearanceSettings() {
  const [colors, setColors] = useState(defaults);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/backend/users/me/dashboard-preferences", { cache: "no-store" }).then((response) => response.json()).then((payload) => {
      if (payload?.data?.topBarColor && payload?.data?.sidebarColor) setColors({ topBarColor: payload.data.topBarColor, sidebarColor: payload.data.sidebarColor });
    }).catch(() => undefined).finally(() => setBusy(false));
  }, []);

  function preview(next: typeof colors) {
    setColors(next);
    window.dispatchEvent(new CustomEvent("dashboard-theme-updated", { detail: next }));
  }

  async function save() {
    setSaving(true); setNotice(null);
    try {
      const response = await fetch("/api/backend/users/me/dashboard-preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(colors) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not save colors");
      setNotice("Dashboard colors saved for your account.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save colors"); }
    finally { setSaving(false); }
  }

  async function reset() {
    preview(defaults); setNotice(null); setSaving(true);
    try {
      const response = await fetch("/api/backend/users/me/dashboard-preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(defaults) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? "Could not reset colors");
      setNotice("Dashboard colors reset to the default for your account.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not reset colors"); }
    finally { setSaving(false); }
  }

  return <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-slate-100 p-2"><Palette className="h-5 w-5 text-slate-800" /></div><div><h2 className="text-xl font-black text-slate-950">Dashboard Appearance</h2><p className="mt-1 text-sm font-medium text-slate-500">Customize the top bar and sidebar for your account only. Other users will not be affected.</p></div></div><div className="mt-6 grid gap-5 sm:grid-cols-2">{([['topBarColor', 'Top bar color'], ['sidebarColor', 'Sidebar color']] as const).map(([key, title]) => <label key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="text-sm font-black text-slate-800">{title}</span><div className="mt-3 flex items-center gap-3"><input type="color" value={colors[key]} onChange={(event) => preview({ ...colors, [key]: event.target.value })} disabled={busy} className="h-12 w-16 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" /><input value={colors[key]} onChange={(event) => preview({ ...colors, [key]: event.target.value })} disabled={busy} className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold uppercase" /></div></label>)}</div><div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" onClick={() => void save()} disabled={busy || saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save colors"}</button><button type="button" onClick={reset} disabled={busy || saving} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-black text-slate-700"><RotateCcw className="h-4 w-4" />Reset defaults</button>{notice && <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700"><Check className="h-4 w-4" />{notice}</span>}</div></section>;
}
