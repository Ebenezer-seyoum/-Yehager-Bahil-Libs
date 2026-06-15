"use client";

import { useMemo, useState } from "react";
import { BadgePercent, CalendarDays, ClipboardList, PauseCircle, Plus, RefreshCw, Search, TicketPercent } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminDetailHeader } from "@/components/admin/admin-detail-layout";
import { dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";

type Row = Record<string, any>;

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00";
}

function dateLabel(value: unknown) {
  if (!value) return "No limit";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "No limit";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusTone(status: unknown) {
  const key = String(status ?? "draft").toLowerCase();
  if (key === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (key === "scheduled") return "border-blue-200 bg-blue-50 text-blue-700";
  if (key === "paused") return "border-amber-200 bg-amber-50 text-amber-700";
  if (key === "expired" || key === "used_up") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function discountLabel(row: Row) {
  if (row.discountType === "free_shipping") return "Free shipping";
  if (row.discountType === "percentage") return `${Number(row.discountValue ?? 0).toFixed(0)}%`;
  return money(row.discountValue);
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string | number; icon: any }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <Icon className="h-5 w-5 text-blue-500" />
      </div>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function ProductDiscountForm({ products, onClose }: { products: Row[]; onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState("product");
  const [discountType, setDiscountType] = useState("percentage");

  async function submit(formData: FormData) {
    setBusy(true);
    try {
      const body = {
        name: String(formData.get("name") ?? ""),
        discountType,
        discountValue: Number(formData.get("discountValue") ?? 0),
        scope,
        productId: scope === "product" ? String(formData.get("productId") ?? "") : null,
        region: scope === "region" ? String(formData.get("region") ?? "") : null,
        category: scope === "category" ? String(formData.get("category") ?? "") : null,
        subcategory: scope === "subcategory" ? String(formData.get("subcategory") ?? "") : null,
        status: String(formData.get("status") ?? "active"),
        startsAt: String(formData.get("startsAt") ?? "") || null,
        endsAt: String(formData.get("endsAt") ?? "") || null,
        internalNote: String(formData.get("internalNote") ?? "") || null,
      };
      const res = await fetch("/api/backend/admin/discounts/product-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? json?.message ?? "Could not create product discount.");
      await dashboardSuccess("Discount Created", "Product sale pricing is now available for matching products.");
      router.refresh();
      onClose();
    } catch (error) {
      await dashboardError("Create Failed", error instanceof Error ? error.message : "Could not create product discount.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Create Product Discount" onClose={onClose}>
      <form action={(fd) => void submit(fd)} className="space-y-4">
        <Input name="name" label="Discount Name" placeholder="Summer 30% Sale" required />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Discount Type" value={discountType} onChange={setDiscountType} options={[["percentage", "Percentage"], ["fixed_amount", "Fixed Amount"]]} />
          <Input name="discountValue" label={discountType === "percentage" ? "Percent Off" : "Amount Off USD"} type="number" min="0" step="0.01" required />
        </div>
        <Select label="Applies To" value={scope} onChange={setScope} options={[["product", "Specific Product"], ["all_products", "All Products"], ["region", "Region"], ["category", "Category"], ["subcategory", "Subcategory"]]} />
        {scope === "product" ? (
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Product</span>
            <select name="productId" required className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold">
              <option value="">Select product</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
        ) : null}
        {scope === "region" ? <Input name="region" label="Region" required /> : null}
        {scope === "category" ? <Input name="category" label="Category" required /> : null}
        {scope === "subcategory" ? <Input name="subcategory" label="Subcategory" required /> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Status</span>
            <select name="status" defaultValue="active" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold">
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
            </select>
          </label>
          <Input name="startsAt" label="Start Date" type="datetime-local" />
          <Input name="endsAt" label="End Date" type="datetime-local" />
        </div>
        <Textarea name="internalNote" label="Internal Note" />
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-black">Cancel</button>
          <button disabled={busy} className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-60">Create Discount</button>
        </div>
      </form>
    </Modal>
  );
}

function CouponForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [discountType, setDiscountType] = useState("percentage");

  async function submit(formData: FormData) {
    setBusy(true);
    try {
      const body = {
        code: String(formData.get("code") ?? ""),
        name: String(formData.get("name") ?? ""),
        discountType,
        discountValue: Number(formData.get("discountValue") ?? 0),
        appliesTo: String(formData.get("appliesTo") ?? "all_orders"),
        minimumOrderUsd: Number(formData.get("minimumOrderUsd") || 0) || null,
        maxDiscountUsd: Number(formData.get("maxDiscountUsd") || 0) || null,
        usageLimit: Number(formData.get("usageLimit") || 0) || null,
        perCustomerLimit: Number(formData.get("perCustomerLimit") || 1),
        status: String(formData.get("status") ?? "active"),
        startsAt: String(formData.get("startsAt") ?? "") || null,
        endsAt: String(formData.get("endsAt") ?? "") || null,
        internalNote: String(formData.get("internalNote") ?? "") || null,
      };
      const res = await fetch("/api/backend/admin/discounts/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? json?.message ?? "Could not create coupon.");
      await dashboardSuccess("Coupon Created", "Coupon code is ready for checkout once the checkout input is enabled.");
      router.refresh();
      onClose();
    } catch (error) {
      await dashboardError("Create Failed", error instanceof Error ? error.message : "Could not create coupon.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Create Coupon Code" onClose={onClose}>
      <form action={(fd) => void submit(fd)} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="code" label="Coupon Code" placeholder="SAVE30" required />
          <Input name="name" label="Coupon Name" placeholder="VIP customer code" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Discount Type" value={discountType} onChange={setDiscountType} options={[["percentage", "Percentage"], ["fixed_amount", "Fixed Amount"], ["free_shipping", "Free Shipping"]]} />
          <Input name="discountValue" label="Value" type="number" min="0" step="0.01" disabled={discountType === "free_shipping"} />
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Applies To</span>
            <select name="appliesTo" defaultValue="all_orders" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold">
              <option value="all_orders">All Orders</option>
              <option value="catalog_orders">Catalog Orders</option>
              <option value="custom_orders">Custom Orders</option>
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input name="minimumOrderUsd" label="Min Order USD" type="number" min="0" step="0.01" />
          <Input name="maxDiscountUsd" label="Max Discount USD" type="number" min="0" step="0.01" />
          <Input name="usageLimit" label="Usage Limit" type="number" min="1" />
          <Input name="perCustomerLimit" label="Per Customer" type="number" min="1" defaultValue="1" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Status</span>
            <select name="status" defaultValue="active" className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold">
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
            </select>
          </label>
          <Input name="startsAt" label="Start Date" type="datetime-local" />
          <Input name="endsAt" label="End Date" type="datetime-local" />
        </div>
        <Textarea name="internalNote" label="Internal Note" />
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-black">Cancel</button>
          <button disabled={busy} className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-60">Create Coupon</button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h3 className="text-xl font-black text-slate-950">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black">Close</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <input {...rest} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" />
    </label>
  );
}

function Textarea({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <textarea name={name} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold">
        {options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    </label>
  );
}

export function AdminCouponsDiscountsWorkspace({ data, canEdit }: { data: Row; canEdit: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<"products" | "coupons">("products");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [modal, setModal] = useState<"product" | "coupon" | null>(null);
  const productDiscounts = Array.isArray(data.productDiscounts) ? data.productDiscounts : [];
  const coupons = Array.isArray(data.coupons) ? data.coupons : [];
  const products = Array.isArray(data.products) ? data.products : [];

  const activeProducts = productDiscounts.filter((row) => row.status === "active").length;
  const activeCoupons = coupons.filter((row) => row.status === "active").length;
  const scheduled = [...productDiscounts, ...coupons].filter((row) => row.status === "scheduled").length;
  const redemptions = [...productDiscounts, ...coupons].reduce((sum, row) => sum + Number(row.redemptionCount ?? 0), 0);

  const visibleRows = useMemo(() => {
    const rows = tab === "products" ? productDiscounts : coupons;
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesStatus = status === "all" || row.status === status;
      const haystack = [row.name, row.code, row.scope, row.appliesTo, row.region, row.category, row.subcategory].join(" ").toLowerCase();
      return matchesStatus && (!q || haystack.includes(q));
    });
  }, [coupons, productDiscounts, query, status, tab]);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <AdminDetailHeader
        icon={TicketPercent}
        iconTheme="border-blue-100 bg-blue-50 text-blue-600"
        category="Finance"
        title="Coupons & Discounts"
        subtitle="Create visible product sales and checkout coupon codes from one control center."
        onRefresh={() => router.refresh()}
        onBack={() => router.push("/admin")}
      />

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <Kpi label="Active Product Sales" value={activeProducts} icon={BadgePercent} />
        <Kpi label="Active Coupons" value={activeCoupons} icon={TicketPercent} />
        <Kpi label="Scheduled" value={scheduled} icon={CalendarDays} />
        <Kpi label="Redemptions" value={redemptions} icon={ClipboardList} />
      </div>

      <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setTab("products")} className={`h-11 rounded-xl px-5 text-sm font-black ${tab === "products" ? "bg-blue-700 text-white shadow-lg" : "bg-white text-slate-700"}`}>Product Discounts</button>
          <button onClick={() => setTab("coupons")} className={`h-11 rounded-xl px-5 text-sm font-black ${tab === "coupons" ? "bg-blue-700 text-white shadow-lg" : "bg-white text-slate-700"}`}>Coupon Codes</button>
          <div className="ml-auto flex gap-3">
            <button onClick={() => router.refresh()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black"><RefreshCw className="h-4 w-4" /> Refresh</button>
            {canEdit ? <button onClick={() => setModal(tab === "products" ? "product" : "coupon")} className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white"><Plus className="h-4 w-4" /> Create</button> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex h-11 min-w-[320px] flex-1 items-center gap-2 rounded-xl border border-slate-300 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-full flex-1 outline-none" placeholder="Search discounts, codes, scopes..." />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-black">
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
            <option value="used_up">Used Up</option>
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <table className="w-full min-w-[1000px] text-left">
          <thead className="bg-blue-50 text-xs font-black uppercase tracking-wide text-blue-950">
            <tr>
              <th className="px-5 py-4">{tab === "products" ? "Discount" : "Coupon"}</th>
              <th className="px-5 py-4">Type / Value</th>
              <th className="px-5 py-4">Scope</th>
              <th className="px-5 py-4">Usage</th>
              <th className="px-5 py-4">Schedule</th>
              <th className="px-5 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-5 py-4">
                  <p className="font-black text-slate-950">{tab === "products" ? row.name : row.code}</p>
                  <p className="text-xs font-bold text-slate-500">{tab === "products" ? row.internalNote || "Visible product sale" : row.name}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-black text-slate-950">{discountLabel(row)}</p>
                  <p className="text-xs font-bold uppercase text-slate-400">{String(row.discountType ?? "").replaceAll("_", " ")}</p>
                </td>
                <td className="px-5 py-4 text-sm font-bold text-slate-700">{tab === "products" ? String(row.scope ?? "").replaceAll("_", " ") : String(row.appliesTo ?? "").replaceAll("_", " ")}</td>
                <td className="px-5 py-4 text-sm font-bold text-slate-700">{Number(row.redemptionCount ?? 0)}{row.usageLimit || row.maxRedemptions ? ` / ${row.usageLimit ?? row.maxRedemptions}` : ""}</td>
                <td className="px-5 py-4 text-sm font-bold text-slate-700">{dateLabel(row.startsAt)} - {dateLabel(row.endsAt)}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase ${statusTone(row.status)}`}>{String(row.status ?? "draft").replaceAll("_", " ")}</span>
                </td>
              </tr>
            ))}
            {!visibleRows.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-sm font-bold text-slate-400">No records match this view.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-900">
        <div className="flex items-start gap-3">
          <PauseCircle className="mt-0.5 h-5 w-5" />
          <p>Product Discounts are live on homepage/catalog/product pages and are recalculated again during checkout. Coupon Codes are stored and managed here; checkout coupon entry can be enabled next.</p>
        </div>
      </div>

      {modal === "product" ? <ProductDiscountForm products={products} onClose={() => setModal(null)} /> : null}
      {modal === "coupon" ? <CouponForm onClose={() => setModal(null)} /> : null}
    </div>
  );
}
