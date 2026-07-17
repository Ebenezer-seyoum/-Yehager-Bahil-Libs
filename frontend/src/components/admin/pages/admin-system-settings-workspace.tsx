"use client";

import { useMemo, useState } from "react";
import { Check, Info, Save, Settings2 } from "lucide-react";

type Setting = { key: string; category: string; value: string | number | boolean | null; description?: string | null };

const groups: Record<string, { title: string; intro: string; keys: string[] }> = {
  overview: { title: "Settings Overview", intro: "Manage the defaults that automatically configure your store, orders, notifications, and admin workspace.", keys: ["store.business_name", "store.default_currency", "store.timezone", "orders.default_delivery_days", "notifications.email_enabled", "appearance.brand_color"] },
  store: { title: "Organization & Store", intro: "These defaults are reused in documents, reports, and customer communication.", keys: ["store.business_name", "store.default_currency", "store.timezone"] },
  orders: { title: "Orders & Delivery", intro: "Control the defaults applied when new orders are created.", keys: ["orders.default_delivery_days"] },
  notifications: { title: "Notifications", intro: "Choose how the system communicates important business events.", keys: ["notifications.email_enabled"] },
  appearance: { title: "Appearance", intro: "Customize the administrative workspace brand presentation.", keys: ["appearance.brand_color"] },
  security: { title: "Security", intro: "Password and role controls are managed through the Profile and Team areas.", keys: [] },
  team: { title: "Team & Permissions", intro: "Employee roles and permissions continue to use the existing role management system.", keys: [] },
  integrations: { title: "Integrations", intro: "Integration credentials remain server-side and are never exposed here.", keys: [] },
  maintenance: { title: "System Maintenance", intro: "Operational tools are available in the dedicated maintenance workspace.", keys: [] },
};

function label(key: string) {
  return key.split(".")[1]?.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? key;
}

export function AdminSystemSettingsWorkspace({ initialSettings, category, canEdit }: { initialSettings: Setting[]; category: string; canEdit: boolean }) {
  const group = groups[category] ?? groups.store;
  const initial = useMemo(() => Object.fromEntries(initialSettings.map((item) => [item.key, item.value])), [initialSettings]);
  const [values, setValues] = useState<Record<string, Setting["value"]>>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const items = initialSettings.filter((item) => group.keys.includes(item.key));

  async function save() {
    setSaving(true); setMessage(null);
    try {
      const response = await fetch("/api/backend/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not save settings");
      setMessage("Settings saved and applied successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save settings"); }
    finally { setSaving(false); }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">System configuration</p><h2 className="mt-1 text-2xl font-black text-slate-950">{group.title}</h2><p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">{group.intro}</p></div>
        {items.length > 0 && canEdit && <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? "Saving..." : "Save changes"}</button>}
      </div>
      {message && <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><Check className="h-4 w-4" />{message}</div>}
      {items.length > 0 ? <div className="mt-6 grid gap-5 md:grid-cols-2">{items.map((item) => <label key={item.key} className="block rounded-2xl border border-slate-200 bg-slate-50 p-4"><span className="text-sm font-black text-slate-800">{label(item.key)}</span><span className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500"><Info className="h-3 w-3" />{item.description}</span>{typeof item.value === "boolean" ? <input type="checkbox" checked={Boolean(values[item.key])} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.checked }))} disabled={!canEdit} className="mt-4 h-5 w-5 accent-slate-900" /> : <input value={String(values[item.key] ?? "")} onChange={(event) => setValues((current) => ({ ...current, [item.key]: typeof item.value === "number" ? Number(event.target.value) : event.target.value }))} disabled={!canEdit} type={typeof item.value === "number" ? "number" : "text"} className="mt-4 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900" />}</label>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"><Settings2 className="mx-auto h-8 w-8 text-slate-400" /><p className="mt-3 text-sm font-black text-slate-800">Managed workspace</p><p className="mt-1 text-sm text-slate-500">This tab connects to the existing dedicated system area. No duplicate configuration is created here.</p></div>}
    </section>
  );
}
