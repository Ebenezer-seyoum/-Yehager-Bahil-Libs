"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BadgePercent, CalendarClock, ClipboardList, Edit, FileText, Power, Save, Target, TicketPercent, X } from "lucide-react";
import { AdminDetailHeader, AdminDetailLayout } from "@/components/admin/admin-detail-layout";

export type CouponDiscountDetailKind = "coupons" | "discounts";

export type CouponDiscountRow = {
  id?: string;
  name?: string | null;
  code?: string | null;
  discountType?: string | null;
  discountValue?: string | number | null;
  status?: string | null;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  internalNote?: string | null;
  scope?: string | null;
  appliesTo?: string | null;
  productId?: string | null;
  minimumOrderUsd?: string | number | null;
  maxDiscountUsd?: string | number | null;
  region?: string | null;
  category?: string | null;
  subcategory?: string | null;
  redemptionCount?: string | number | null;
  usageLimit?: string | number | null;
  perCustomerLimit?: string | number | null;
  maxRedemptions?: string | number | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

function titleCase(value: unknown) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function text(value: unknown, fallback = "Not provided") {
  const label = titleCase(value);
  return label || fallback;
}

function scopeText(value: unknown, fallback = "Not provided") {
  if (value === "region") return "Tribe";
  if (value === "subcategory") return "Region";
  return text(value, fallback);
}

function money(value: unknown, fallback = "Not set") {
  if (value === null || value === undefined || value === "") return fallback;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return fallback;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function numberLabel(value: unknown, fallback = "No limit") {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n.toLocaleString() : String(value);
}

function dateTime(value: unknown) {
  if (!value) return "Not set";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function inputDateTime(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function discountLabel(row: CouponDiscountRow) {
  if (row.discountType === "free_shipping") return "Free shipping";
  if (row.discountType === "percentage") return `${Number(row.discountValue ?? 0).toFixed(0)}%`;
  return money(row.discountValue);
}

function statusTone(status: unknown) {
  const key = String(status ?? "draft").toLowerCase();
  if (key === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (key === "scheduled") return "border-blue-200 bg-blue-50 text-blue-700";
  if (key === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (key === "expired" || key === "used_up") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function DetailField({ label, value, mono }: { label: string; value: unknown; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-sm font-bold text-slate-950 ${mono ? "font-mono normal-case" : ""}`}>{String(value ?? "").trim() || "Not provided"}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: unknown }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusTone(status)}`}>{text(status, "Draft")}</span>;
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextInput({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
      />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
      >
        {options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    </label>
  );
}

function toNullableNumber(value: string) {
  const text = value.trim();
  return text ? Number(text) : null;
}

export function AdminCouponsDiscountsDetailClient({ row, kind }: { row: CouponDiscountRow; kind: CouponDiscountDetailKind }) {
  const router = useRouter();
  const [record, setRecord] = useState(row);
  const [activeSection, setActiveSection] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(() => ({
    code: String(row.code ?? ""),
    name: String(row.name ?? ""),
    discountType: String(row.discountType ?? "percentage"),
    discountValue: String(row.discountValue ?? ""),
    appliesTo: String(row.appliesTo ?? "all_orders"),
    scope: String(row.scope ?? "all_products"),
    productId: String(row.productId ?? ""),
    category: String(row.category ?? ""),
    subcategory: String(row.subcategory ?? ""),
    region: String(row.region ?? ""),
    minimumOrderUsd: String(row.minimumOrderUsd ?? ""),
    maxDiscountUsd: String(row.maxDiscountUsd ?? ""),
    usageLimit: String(row.usageLimit ?? ""),
    perCustomerLimit: String(row.perCustomerLimit ?? "1"),
    maxRedemptions: String(row.maxRedemptions ?? ""),
    status: String(row.status ?? "draft"),
    startsAt: inputDateTime(row.startsAt),
    endsAt: inputDateTime(row.endsAt),
    internalNote: String(row.internalNote ?? ""),
  }));
  const isCoupon = kind === "coupons";

  function updateForm(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm(next = record) {
    setForm({
      code: String(next.code ?? ""),
      name: String(next.name ?? ""),
      discountType: String(next.discountType ?? "percentage"),
      discountValue: String(next.discountValue ?? ""),
      appliesTo: String(next.appliesTo ?? "all_orders"),
      scope: String(next.scope ?? "all_products"),
      productId: String(next.productId ?? ""),
      category: String(next.category ?? ""),
      subcategory: String(next.subcategory ?? ""),
      region: String(next.region ?? ""),
      minimumOrderUsd: String(next.minimumOrderUsd ?? ""),
      maxDiscountUsd: String(next.maxDiscountUsd ?? ""),
      usageLimit: String(next.usageLimit ?? ""),
      perCustomerLimit: String(next.perCustomerLimit ?? "1"),
      maxRedemptions: String(next.maxRedemptions ?? ""),
      status: String(next.status ?? "draft"),
      startsAt: inputDateTime(next.startsAt),
      endsAt: inputDateTime(next.endsAt),
      internalNote: String(next.internalNote ?? ""),
    });
  }

  async function patchRecord(body: Record<string, unknown>) {
    if (!record.id) return;
    setBusy(true);
    setMessage("");
    try {
      const path = isCoupon
        ? `/api/backend/admin/discounts/coupons/${record.id}`
        : `/api/backend/admin/discounts/product-discounts/${record.id}`;
      const res = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Update failed");
      const next = { ...record, ...(json?.data ?? body) };
      setRecord(next);
      resetForm(next);
      setEditing(false);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  function saveInlineEdit() {
    const common = {
      name: form.name,
      discountType: form.discountType,
      discountValue: form.discountType === "free_shipping" ? 0 : Number(form.discountValue || 0),
      status: form.status,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      internalNote: form.internalNote || null,
    };

    if (isCoupon) {
      void patchRecord({
        ...common,
        code: form.code,
        appliesTo: form.appliesTo,
        minimumOrderUsd: toNullableNumber(form.minimumOrderUsd),
        maxDiscountUsd: toNullableNumber(form.maxDiscountUsd),
        usageLimit: toNullableNumber(form.usageLimit),
        perCustomerLimit: toNullableNumber(form.perCustomerLimit) ?? 1,
      });
      return;
    }

    void patchRecord({
      ...common,
      scope: form.scope,
      productId: form.scope === "product" ? form.productId || null : null,
      category: form.scope === "category" ? form.category || null : null,
      subcategory: form.scope === "subcategory" ? form.subcategory || null : null,
      region: form.scope === "region" ? form.region || null : null,
      maxRedemptions: toNullableNumber(form.maxRedemptions),
    });
  }

  function toggleActive() {
    void patchRecord({ status: record.status === "active" ? "paused" : "active" });
  }

  const sections = isCoupon
    ? [
        { id: "overview", label: "Coupon Overview", icon: TicketPercent },
        { id: "rules", label: "Discount Rules", icon: BadgePercent },
        { id: "usage", label: "Usage Limits", icon: ClipboardList },
        { id: "schedule", label: "Schedule", icon: CalendarClock },
        { id: "notes", label: "Internal Notes", icon: FileText },
      ]
    : [
        { id: "overview", label: "Discount Overview", icon: BadgePercent },
        { id: "rules", label: "Discount Rules", icon: TicketPercent },
        { id: "targeting", label: "Targeting", icon: Target },
        { id: "usage", label: "Usage Limits", icon: ClipboardList },
        { id: "schedule", label: "Schedule", icon: CalendarClock },
        { id: "notes", label: "Internal Notes", icon: FileText },
      ];

  return (
    <AdminDetailLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      sections={sections}
      topHeader={
        <AdminDetailHeader
          icon={isCoupon ? TicketPercent : BadgePercent}
          iconTheme="bg-emerald-50 text-emerald-700 border-emerald-100"
          category={isCoupon ? "Coupon Detail" : "Product Discount Detail"}
          title={isCoupon ? record.code ?? "Coupon" : record.name ?? "Discount"}
          subtitle={isCoupon ? record.name ?? "Checkout coupon rule" : "Product discount rule and targeting details."}
          onRefresh={() => router.refresh()}
          onBack={() => router.push(`/admin/finance/coupons-discounts?tab=${kind}`)}
          backLabel="Back to List"
        />
      }
      profileCard={
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{isCoupon ? "Checkout Coupon" : "Product Discount"}</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">{isCoupon ? record.code ?? "Coupon" : record.name ?? "Discount"}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{isCoupon ? record.name ?? "No coupon name" : text(record.scope, "No scope set")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge status={record.status} />
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black uppercase text-slate-700">{text(record.discountType, "Discount")}</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">{discountLabel(record)}</span>
            </div>
            {message ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{message}</p> : null}
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:min-w-80">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Actions</p>
            <div className="mt-3 grid gap-2">
              {editing ? (
                <>
                  <button disabled={busy} onClick={saveInlineEdit} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-60"><Save className="h-4 w-4" /> Save Changes</button>
                  <button disabled={busy} onClick={() => { resetForm(); setEditing(false); setMessage(""); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 disabled:opacity-60"><X className="h-4 w-4" /> Cancel</button>
                </>
              ) : (
                <>
                  <button disabled={busy} onClick={toggleActive} className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white disabled:opacity-60 ${record.status === "active" ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-700 hover:bg-emerald-800"}`}><Power className="h-4 w-4" /> {record.status === "active" ? "Deactivate" : "Activate"}</button>
                  <button disabled={busy} onClick={() => { resetForm(); setEditing(true); setMessage(""); }} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-black text-white disabled:opacity-60"><Edit className="h-4 w-4" /> Edit</button>
                </>
              )}
            </div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Current Value</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{discountLabel(record)}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{isCoupon ? text(record.appliesTo, "All orders") : text(record.scope, "All products")}</p>
          </div>
        </div>
      }
    >
      {activeSection === "overview" ? (
        <SectionCard title={isCoupon ? "Coupon Overview" : "Discount Overview"}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isCoupon ? (
              <>
                {editing ? <TextInput label="Coupon Code" value={form.code} onChange={(value) => updateForm("code", value.toUpperCase())} required /> : <DetailField label="Coupon Code" value={record.code} mono />}
                {editing ? <TextInput label="Coupon Name" value={form.name} onChange={(value) => updateForm("name", value)} required /> : <DetailField label="Coupon Name" value={record.name} />}
                {editing ? <SelectInput label="Applies To" value={form.appliesTo} onChange={(value) => updateForm("appliesTo", value)} options={[["all_orders", "All Orders"], ["catalog_orders", "Catalog Orders"], ["custom_orders", "Custom Orders"]]} /> : <DetailField label="Applies To" value={text(record.appliesTo)} />}
              </>
            ) : (
              <>
                {editing ? <TextInput label="Discount Name" value={form.name} onChange={(value) => updateForm("name", value)} required /> : <DetailField label="Discount Name" value={record.name} />}
                {editing ? <SelectInput label="Applies To" value={form.scope} onChange={(value) => updateForm("scope", value)} options={[["all_products", "All Products"], ["product", "Specific Product"], ["category", "Specific Category"], ["region", "Tribe"], ["subcategory", "Region"]]} /> : <DetailField label="Applies To" value={scopeText(record.scope)} />}
                {editing ? <TextInput label="Product ID" value={form.productId} onChange={(value) => updateForm("productId", value)} /> : <DetailField label="Product ID" value={record.productId ?? "Not set"} mono />}
              </>
            )}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</p>
              <div className="mt-2">
                {editing ? (
                  <select value={form.status} onChange={(event) => updateForm("status", event.target.value)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-950">
                    {["draft", "scheduled", "active", "paused", "expired", ...(isCoupon ? ["used_up"] : [])].map((status) => <option key={status} value={status}>{text(status)}</option>)}
                  </select>
                ) : <StatusBadge status={record.status} />}
              </div>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {activeSection === "rules" ? (
        <SectionCard title="Discount Rules">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {editing ? <SelectInput label="Discount Type" value={form.discountType} onChange={(value) => updateForm("discountType", value)} options={isCoupon ? [["percentage", "Percentage"], ["fixed_amount", "Fixed Amount"], ["free_shipping", "Free Shipping"]] : [["percentage", "Percentage"], ["fixed_amount", "Fixed Amount"]]} /> : <DetailField label="Discount Type" value={text(record.discountType)} />}
            {editing ? <TextInput label={form.discountType === "percentage" ? "Percent Off" : "Amount Off USD"} type="number" value={form.discountType === "free_shipping" ? "0" : form.discountValue} onChange={(value) => updateForm("discountValue", value)} /> : <DetailField label="Value" value={discountLabel(record)} />}
            {isCoupon ? (
              <>
                {editing ? <TextInput label="Min Order USD" type="number" value={form.minimumOrderUsd} onChange={(value) => updateForm("minimumOrderUsd", value)} /> : <DetailField label="Min Order USD" value={money(record.minimumOrderUsd)} />}
                {editing ? <TextInput label="Max Discount USD" type="number" value={form.maxDiscountUsd} onChange={(value) => updateForm("maxDiscountUsd", value)} /> : <DetailField label="Max Discount USD" value={money(record.maxDiscountUsd)} />}
              </>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {activeSection === "targeting" && !isCoupon ? (
        <SectionCard title="Targeting">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {editing ? <SelectInput label="Scope" value={form.scope} onChange={(value) => updateForm("scope", value)} options={[["all_products", "All Products"], ["product", "Specific Product"], ["category", "Specific Category"], ["region", "Tribe"], ["subcategory", "Region"]]} /> : <DetailField label="Scope" value={scopeText(record.scope)} />}
            {editing ? <TextInput label="Product ID" value={form.productId} onChange={(value) => updateForm("productId", value)} /> : <DetailField label="Product ID" value={record.productId ?? "Not set"} mono />}
            {editing ? <TextInput label="Category" value={form.category} onChange={(value) => updateForm("category", value)} /> : <DetailField label="Category" value={text(record.category)} />}
            {editing ? <TextInput label="Region" value={form.subcategory} onChange={(value) => updateForm("subcategory", value)} /> : <DetailField label="Region" value={text(record.subcategory)} />}
            {editing ? <TextInput label="Tribe" value={form.region} onChange={(value) => updateForm("region", value)} /> : <DetailField label="Tribe" value={text(record.region)} />}
          </div>
        </SectionCard>
      ) : null}

      {activeSection === "usage" ? (
        <SectionCard title="Usage Limits">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isCoupon ? (
              <>
                {editing ? <TextInput label="Usage Limit" type="number" value={form.usageLimit} onChange={(value) => updateForm("usageLimit", value)} /> : <DetailField label="Usage Limit" value={numberLabel(record.usageLimit)} />}
                {editing ? <TextInput label="Per Customer" type="number" value={form.perCustomerLimit} onChange={(value) => updateForm("perCustomerLimit", value)} /> : <DetailField label="Per Customer" value={numberLabel(record.perCustomerLimit)} />}
              </>
            ) : (
              editing ? <TextInput label="Max Redemptions" type="number" value={form.maxRedemptions} onChange={(value) => updateForm("maxRedemptions", value)} /> : <DetailField label="Max Redemptions" value={numberLabel(record.maxRedemptions)} />
            )}
            <DetailField label="Redemption Count" value={numberLabel(record.redemptionCount, "0")} />
          </div>
        </SectionCard>
      ) : null}

      {activeSection === "schedule" ? (
        <SectionCard title="Schedule & Audit">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {editing ? <TextInput label="Start Date" type="datetime-local" value={form.startsAt} onChange={(value) => updateForm("startsAt", value)} /> : <DetailField label="Start Date" value={dateTime(record.startsAt)} />}
            {editing ? <TextInput label="End Date" type="datetime-local" value={form.endsAt} onChange={(value) => updateForm("endsAt", value)} /> : <DetailField label="End Date" value={dateTime(record.endsAt)} />}
            <DetailField label="Created At" value={dateTime(record.createdAt)} />
            <DetailField label="Updated At" value={dateTime(record.updatedAt)} />
          </div>
        </SectionCard>
      ) : null}

      {activeSection === "notes" ? (
        <SectionCard title="Internal Notes">
          {editing ? (
            <textarea value={form.internalNote} onChange={(event) => updateForm("internalNote", event.target.value)} className="min-h-40 w-full rounded-2xl border border-slate-300 bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          ) : (
            <p className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-700">
              {String(record.internalNote ?? "").trim() || "No internal note provided."}
            </p>
          )}
        </SectionCard>
      ) : null}
    </AdminDetailLayout>
  );
}
