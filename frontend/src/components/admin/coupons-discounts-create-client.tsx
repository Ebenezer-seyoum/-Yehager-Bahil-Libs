"use client";

import { useMemo, useState } from "react";
import { BadgePercent, Check, Package, TicketPercent, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminDetailHeader } from "@/components/admin/admin-detail-layout";
import { TableHeadCell, TableHeadRow, TableHeader } from "@/components/admin/table-header";
import { dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";
import { cn } from "@/lib/utils";

type Row = {
  id?: string;
  name?: string | null;
  uniqueId?: string | null;
  category?: string | null;
  subcategory?: string | null;
  region?: string | null;
  priceUsd?: string | number | null;
  images?: string[];
  isActive?: boolean | null;
};

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : "$0.00";
}

function productStatus(product: Row) {
  return product.isActive === false ? "Hidden" : "Active";
}

function productImage(product: Row) {
  return Array.isArray(product.images) ? product.images[0] : null;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <input {...rest} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100" />
    </label>
  );
}

function Textarea({ label, name }: { label: string; name: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</span>
      <textarea name={name} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
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

function DiscountPreview({ name, value, appliesTo }: { name: string; value: string; appliesTo: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Discount preview</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <PreviewItem label="Name" value={name} />
        <PreviewItem label="Value" value={value} />
        <PreviewItem label="Applies to" value={appliesTo} />
      </div>
    </div>
  );
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function ProductPicker({
  products,
  selectedProduct,
  productQuery,
  categoryFilter,
  categories,
  onQueryChange,
  onCategoryChange,
  onSelect,
  onClear,
}: {
  products: Row[];
  selectedProduct?: Row;
  productQuery: string;
  categoryFilter: string;
  categories: string[];
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">Product selection</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">Search and choose the product that receives this discount.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={productQuery} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search product, SKU, category..." className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          <select value={categoryFilter} onChange={(event) => onCategoryChange(event.target.value)} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold">
            <option value="all">All categories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="max-h-80 overflow-auto">
          <table className="min-w-[760px] w-full text-left text-sm">
            <TableHeader>
              <TableHeadRow>
                <TableHeadCell className="w-14">Select</TableHeadCell>
                <TableHeadCell>Product</TableHeadCell>
                <TableHeadCell>SKU</TableHeadCell>
                <TableHeadCell>Category</TableHeadCell>
                <TableHeadCell>Price</TableHeadCell>
                <TableHeadCell>Status</TableHeadCell>
              </TableHeadRow>
            </TableHeader>
            <tbody className="divide-y divide-slate-100">
              {products.map((product) => {
                const checked = selectedProduct?.id === product.id;
                const image = productImage(product);
                return (
                  <tr key={product.id ?? product.name ?? "product"} onClick={() => onSelect(product.id ?? "")} className="cursor-pointer hover:bg-emerald-50/50">
                    <td className="px-4 py-3">
                      <span className={cn("flex h-5 w-5 items-center justify-center rounded-md border", checked ? "border-emerald-700 bg-emerald-700 text-white" : "border-slate-300 bg-white")}>
                        {checked ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[260px] items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <Package className="m-2.5 h-5 w-5 text-slate-400" />}
                        </div>
                        <span className="font-black text-slate-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-black text-slate-500">#{product.uniqueId ?? product.id?.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-600">{product.category ?? product.subcategory ?? product.region}</td>
                    <td className="px-4 py-3 font-black text-slate-900">{money(product.priceUsd)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full border px-3 py-1 text-xs font-black uppercase", product.isActive === false ? "border-slate-200 bg-slate-50 text-slate-500" : "border-emerald-200 bg-emerald-50 text-emerald-700")}>{productStatus(product)}</span>
                    </td>
                  </tr>
                );
              })}
              {!products.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm font-bold text-slate-400">No products match this search.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm font-black text-slate-800">{selectedProduct ? `1 product selected: ${selectedProduct.name}` : "No product selected"}</p>
        {selectedProduct ? <button type="button" onClick={onClear} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-black text-slate-700"><X className="h-3.5 w-3.5" /> Clear selection</button> : null}
      </div>
    </div>
  );
}

function ProductDiscountForm({ products }: { products: Row[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState("all_products");
  const [discountType, setDiscountType] = useState("percentage");
  const [productQuery, setProductQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((product) => String(product.category ?? "").trim()).filter(Boolean))).sort();
  }, [products]);

  const selectedProduct = products.find((product) => product.id === selectedProductId);
  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      const haystack = [product.name, product.uniqueId, product.category, product.subcategory, product.region].join(" ").toLowerCase();
      return matchesCategory && (!q || haystack.includes(q));
    });
  }, [categoryFilter, productQuery, products]);

  async function submit(formData: FormData) {
    if (scope === "product" && !selectedProductId) {
      await dashboardError("Product Required", "Select one product for this discount.");
      return;
    }
    if (scope === "category" && !selectedCategory) {
      await dashboardError("Category Required", "Select a category for this discount.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        name: String(formData.get("name") ?? ""),
        discountType,
        discountValue: Number(formData.get("discountValue") ?? 0),
        scope,
        productId: scope === "product" ? selectedProductId : null,
        region: scope === "region" ? String(formData.get("region") ?? "") : null,
        category: scope === "category" ? selectedCategory : null,
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
      router.push("/admin/finance/coupons-discounts?tab=discounts");
      router.refresh();
    } catch (error) {
      await dashboardError("Create Failed", error instanceof Error ? error.message : "Could not create product discount.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <form action={(fd) => void submit(fd)} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input name="name" label="Discount Name" placeholder="Summer 30% Sale" required />
          <Select label="Applies To" value={scope} onChange={setScope} options={[["all_products", "All Products"], ["product", "Specific Product"], ["category", "Specific Category"], ["region", "Region"], ["subcategory", "Subcategory"]]} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Discount Type" value={discountType} onChange={setDiscountType} options={[["percentage", "Percentage"], ["fixed_amount", "Fixed Amount"]]} />
          <Input name="discountValue" label={discountType === "percentage" ? "Percent Off" : "Amount Off USD"} type="number" min="0" step="0.01" required />
        </div>

        {scope === "product" ? (
          <ProductPicker
            products={filteredProducts}
            selectedProduct={selectedProduct}
            productQuery={productQuery}
            categoryFilter={categoryFilter}
            categories={categories}
            onQueryChange={setProductQuery}
            onCategoryChange={setCategoryFilter}
            onSelect={setSelectedProductId}
            onClear={() => setSelectedProductId("")}
          />
        ) : null}

        {scope === "category" ? (
          <label className="block">
            <span className="text-xs font-black uppercase tracking-wide text-slate-500">Category</span>
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} required className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 text-sm font-bold">
              <option value="">Select category</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
        ) : null}

        {scope === "region" ? <Input name="region" label="Region" required /> : null}
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

        <DiscountPreview
          name="Product discount"
          value={discountType === "percentage" ? "Percentage discount" : "Fixed amount discount"}
          appliesTo={scope === "product" ? selectedProduct?.name ?? "No product selected" : scope === "category" ? selectedCategory || "No category selected" : String(scope).replaceAll("_", " ")}
        />

        <Textarea name="internalNote" label="Internal Note" />
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button type="button" onClick={() => router.push("/admin/finance/coupons-discounts")} className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-black">Cancel</button>
          <button disabled={busy} className="h-11 rounded-xl bg-emerald-800 px-5 text-sm font-black text-white disabled:opacity-60">Create Discount</button>
        </div>
      </form>
    </section>
  );
}

function CouponForm() {
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
      router.push("/admin/finance/coupons-discounts?tab=coupons");
      router.refresh();
    } catch (error) {
      await dashboardError("Create Failed", error instanceof Error ? error.message : "Could not create coupon.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
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
          <button type="button" onClick={() => router.push("/admin/finance/coupons-discounts")} className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-black">Cancel</button>
          <button disabled={busy} className="h-11 rounded-xl bg-emerald-800 px-5 text-sm font-black text-white disabled:opacity-60">Create Coupon</button>
        </div>
      </form>
    </section>
  );
}

function CreateChoice({
  active,
  icon: Icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof TicketPercent;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-32 items-start gap-4 rounded-[2rem] border p-5 text-left shadow-sm transition-all",
        active ? "border-emerald-800 bg-emerald-800 text-white shadow-lg" : "border-slate-200 bg-white text-slate-900 hover:border-emerald-200 hover:bg-emerald-50",
      )}
    >
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", active ? "bg-white/15 text-white" : "bg-emerald-50 text-emerald-800")}>
        <Icon className="h-6 w-6" />
      </span>
      <span>
        <span className="block text-base font-black">{title}</span>
        <span className={cn("mt-1 block text-sm font-semibold leading-relaxed", active ? "text-emerald-50" : "text-slate-500")}>{description}</span>
      </span>
    </button>
  );
}

export function CouponsDiscountsCreateClient({ products }: { products: Row[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"coupon" | "discount">("coupon");

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8">
      <AdminDetailHeader
        icon={TicketPercent}
        iconTheme="border-emerald-100 bg-emerald-50 text-emerald-800"
        category="Finance"
        title="Create Coupon & Discount"
        subtitle="Create checkout coupons or product discounts from one setup page."
        onRefresh={() => router.refresh()}
        onBack={() => router.push("/admin/finance/coupons-discounts")}
        backLabel="Back to list"
      />

      <div className="mx-auto max-w-screen-2xl space-y-5">
        <section className="grid gap-4 lg:grid-cols-2">
          <CreateChoice
            active={mode === "coupon"}
            icon={TicketPercent}
            title="Create Coupon"
            description="Create a customer-entered checkout code with usage limits, order rules, and expiry dates."
            onClick={() => setMode("coupon")}
          />
          <CreateChoice
            active={mode === "discount"}
            icon={BadgePercent}
            title="Create Discount"
            description="Create automatic product sale pricing for all products, one product, category, region, or subcategory."
            onClick={() => setMode("discount")}
          />
        </section>

        {mode === "coupon" ? <CouponForm /> : <ProductDiscountForm products={products} />}
      </div>
    </div>
  );
}
