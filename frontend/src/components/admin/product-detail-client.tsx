"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import { useRouter } from "next/navigation";
import { 
  Package,
  Pencil,
  Trash2,
  Star,
  Power,
  DollarSign,
  Clock,
  Shirt,
  Info,
  ShieldCheck,
  ImageIcon,
  MapPin,
  Hash,
  Save,
  X,
  ChevronDown,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardConfirm, dashboardSuccess, dashboardError } from "@/lib/dashboard-swal";
import { AdminDetailLayout, AdminDetailHeader } from "@/components/admin/admin-detail-layout";

type Product = Record<string, unknown> & {
  id: string;
  name?: string | null;
  images?: string[] | null;
  uniqueId?: string | null;
  region?: string | null;
  subcategory?: string | null;
  priceUsd?: string | number | null;
  groomPriceUsd?: string | number | null;
  tailoringDays?: string | number | null;
  isActive?: boolean | null;
  isFeatured?: boolean | null;
  description?: string | null;
  fabricType?: string | null;
  embroideryStyle?: string | null;
  gender?: string | null;
  familyRoles?: Array<{ icon?: string; label?: string; price?: string | number | null; customerType?: "woman" | "man" | "girl" | "boy"; outfitOption?: "standard" | "full_set" | "top_only" | "pants_only"; designerCostUsd?: string | number | null; taxPercent?: string | number | null; otherCostUsd?: string | number | null; description?: string | null }> | null;
  productionMaterials?: Array<{ id?: string; name: string; optionKey?: string; unit?: string; requiredQty?: string | number; availableQty?: string | number; lowStockLevel?: string | number; note?: string | null }> | null;
  profitCostSetting?: {
    designerCostUsd?: string | number | null;
    taxPercent?: string | number | null;
    otherCostUsd?: string | number | null;
  } | null;
};
type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function formatCurrency(value: string | number | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatEtb(value: string | number | null | undefined) {
  const amount = Number(value) * 156.16;
  if (!Number.isFinite(amount)) return "0 ETB";
  return `${Math.round(amount).toLocaleString()} ETB`;
}

function formatPercent(value: string | number | null | undefined) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "0%";
  return `${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 4 })}%`;
}

function Field({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: IconComponent }) {
  const display = value && String(value).trim() ? value : "Not provided";
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-3 w-3 text-slate-400" />}
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      </div>
      <div className="text-sm font-bold text-slate-900">{display}</div>
    </div>
  );
}

function productionStatus(materials: Product["productionMaterials"]) {
  if (!materials?.length) return { label: "Material Not Assigned", tone: "bg-blue-50 text-blue-800 border-blue-200" };
  if (materials.some((m) => Number(m.availableQty ?? 0) < Number(m.requiredQty ?? 0))) {
    return { label: "Material Shortage", tone: "bg-rose-50 text-rose-800 border-rose-200" };
  }
  if (materials.some((m) => Number(m.availableQty ?? 0) <= Number(m.lowStockLevel ?? 0))) {
    return { label: "Low Material", tone: "bg-amber-50 text-amber-800 border-amber-200" };
  }
  return { label: "Ready to Produce", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" };
}

export function ProductDetailClient({ initialProduct }: { initialProduct: Product }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product>(initialProduct);
  const [, setBusy] = useState(false);
  const [activeImage, setActiveImage] = useState(product.images?.[0] || "");
  const [activeSection, setActiveSection] = useState<"general" | "pricing" | "garment" | "inventory">("general");
  const [openPriceGroups, setOpenPriceGroups] = useState<Record<string, boolean>>({ man: true, woman: true, boy: false, girl: false });
  const [editingCost, setEditingCost] = useState(false);
  const [costForm, setCostForm] = useState({
    designerCostUsd: String(product.profitCostSetting?.designerCostUsd ?? ""),
    taxPercent: String(product.profitCostSetting?.taxPercent ?? ""),
    otherCostUsd: String(product.profitCostSetting?.otherCostUsd ?? ""),
  });

  const productionUnitCost =
    (Number(product.profitCostSetting?.designerCostUsd ?? 0) || 0) +
    ((Number(product.priceUsd ?? 0) || 0) * ((Number(product.profitCostSetting?.taxPercent ?? 0) || 0) / 100)) +
    (Number(product.profitCostSetting?.otherCostUsd ?? 0) || 0);
  const readiness = productionStatus(product.productionMaterials);
  const priceGroups = [
    { key: "man", label: "Men" },
    { key: "woman", label: "Women" },
    { key: "boy", label: "Boy" },
    { key: "girl", label: "Girl" },
  ] as const;

  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/products/${product.id}`);
      const json = await res.json();
      if (res.ok && json.data) setProduct(json.data);
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  async function toggleStatus() {
    const next = !product.isActive;
    const ok = await dashboardConfirm({
      title: next ? "Activate?" : "Deactivate?",
      text: next ? "Show on storefront." : "Hide from storefront.",
      confirmButtonText: "Yes, Update",
      tone: next ? "success" : "warning"
    });
    if (ok) {
      setBusy(true);
      try {
        const res = await fetch(`/api/backend/admin/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: next })
        });
        if (res.ok) {
          dashboardSuccess("Updated", "Product visibility changed.");
          refresh();
        }
      } catch { /* ignore */ } finally { setBusy(false); }
    }
  }

  async function remove() {
    const ok = await dashboardConfirm({
      title: "Delete Product?",
      text: "This will permanently remove the item from the catalog.",
      confirmButtonText: "Yes, Delete",
      tone: "danger"
    });
    if (ok) {
      setBusy(true);
      try {
        const res = await fetch(`/api/backend/admin/products/${product.id}`, { method: "DELETE" });
        if (res.ok) {
          dashboardSuccess("Deleted", "Product removed.");
          router.push("/admin/inventory");
        }
      } catch { /* ignore */ } finally { setBusy(false); }
    }
  }

  function startCostEdit() {
    setCostForm({
      designerCostUsd: String(product.profitCostSetting?.designerCostUsd ?? ""),
      taxPercent: String(product.profitCostSetting?.taxPercent ?? ""),
      otherCostUsd: String(product.profitCostSetting?.otherCostUsd ?? ""),
    });
    setEditingCost(true);
  }

  async function saveProductionCost() {
    if (costForm.designerCostUsd === "" || costForm.taxPercent === "" || costForm.otherCostUsd === "") {
      void dashboardError("Missing Production Cost", "Designer labor cost, tax rate, and other production costs are mandatory.");
      return;
    }
    const ok = await dashboardConfirm({
      title: "Update Production Cost?",
      text: "This will update the product cost settings used for profit calculations.",
      confirmButtonText: "Yes, Update",
      tone: "success",
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/backend/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designerCostUsd: costForm.designerCostUsd,
          taxPercent: costForm.taxPercent,
          otherCostUsd: costForm.otherCostUsd,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.message || "Failed to update production cost");
      if (json.data) setProduct(json.data);
      else await refresh();
      setEditingCost(false);
      void dashboardSuccess("Updated", "Production cost settings saved.");
    } catch (error) {
      void dashboardError("Update Failed", error instanceof Error ? error.message : "Could not update production cost settings.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminDetailLayout
      topHeader={
        <AdminDetailHeader
          icon={Package}
          iconTheme="bg-primary/10 text-primary"
          category="Catalog / Inventory"
          title={product.name ?? "Product detail"}
          subtitle={`${product.region ?? "No tribe"} • ${product.subcategory ?? "No region"}`}
          onRefresh={refresh}
          onBack={() => router.back()}
        />
      }
      profileCard={
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-2xl shadow-sm overflow-hidden border border-slate-100">
               {product.images?.[0] ? <img src={product.images[0]} className="h-full w-full object-cover" alt={product.name ?? "Product image"} /> : <Package className="h-10 w-10" />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight line-clamp-1">{product.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="font-mono text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">#{product.uniqueId}</span>
                <span className={cn("inline-flex items-center rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-widest", product.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100")}>{product.isActive ? "Active" : "Draft"}</span>
                {product.isFeatured && <span className="inline-flex items-center gap-1 rounded-full border bg-amber-50 text-amber-700 border-amber-100 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest"><Star className="h-3 w-3 fill-amber-700" /> Featured</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 items-end">
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 p-4 px-8 shadow-inner w-full md:w-auto">
               <div className="flex items-center gap-10">
                  <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Base Price</span><span className="text-xl font-black text-slate-900">{formatCurrency(product.priceUsd)}</span></div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Delivery Window</span><span className="text-xl font-black text-slate-900">{product.tailoringDays || 30} Days</span></div>
               </div>
            </div>
            <div className="flex flex-wrap gap-2">
               <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 transition-all active:scale-95"><Pencil className="h-4 w-4" /> Edit Item</button>
               <div className="h-8 w-px bg-slate-200 mx-1" />
               <button onClick={() => toggleStatus()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all"><Power className={cn("h-4 w-4", product.isActive ? "text-emerald-500" : "text-slate-400")} /> {product.isActive ? "Deactivate" : "Activate"}</button>
               <button onClick={() => remove()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-5 text-sm font-bold text-rose-700 hover:bg-rose-50 transition-all active:scale-95"><Trash2 className="h-4 w-4" /> Delete</button>
            </div>
          </div>
        </div>
      }
      sections={[
        { id: "general", label: "Catalog Identity", icon: Info },
        { id: "pricing", label: "Financial Data", icon: DollarSign },
        { id: "garment", label: "Garment Specs", icon: Shirt },
        { id: "inventory", label: "Stock & Settings", icon: Package },
      ]}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as "general" | "pricing" | "garment" | "inventory")}
    >
          {activeSection === "general" && (
            <div className="space-y-6">
              <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><Info className="h-4 w-4" /> Identity Profile</h2>
                <div className="grid gap-4 md:grid-cols-2">
                   <Field label="Catalog Name" value={product.name} icon={Shirt} />
                   <Field label="Product ID" value={product.uniqueId} icon={Hash} />
                   <Field label="Tribe" value={product.region} icon={MapPin} />
                   <Field label="Region" value={product.subcategory} icon={Star} />
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                   <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Description / Background</div>
                      <p className="text-sm font-bold text-slate-600 leading-relaxed italic">{product.description || "No description provided for this item."}</p>
                   </div>
                   <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                     <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Media Gallery</div>
                     <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-200">
                        {activeImage ? <img src={activeImage} className="h-full w-full object-cover" alt={product.name ?? "Product gallery image"} /> : <div className="flex h-full w-full items-center justify-center text-slate-300"><ImageIcon className="h-10 w-10" /></div>}
                     </div>
                     <div className="mt-3 flex flex-wrap gap-2">
                        {product.images?.map((img: string, i: number) => (
                          <button key={i} onClick={() => setActiveImage(img)} className={cn("h-12 w-12 overflow-hidden rounded-lg border transition-all", activeImage === img ? "border-primary shadow-sm" : "border-slate-200 opacity-60 hover:opacity-100")}>
                            <img src={img} className="h-full w-full object-cover" alt={`${product.name ?? "Product"} thumbnail ${i + 1}`} />
                          </button>
                        ))}
                     </div>
                   </div>
                </div>
              </section>
            </div>
          )}

          {activeSection === "pricing" && (
            <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
               <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><DollarSign className="h-4 w-4" /> Financial Configuration</h2>
               <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-6 shadow-sm">
                     <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Base Price (USD)</div>
                     <div className="text-3xl font-black text-slate-900">{formatCurrency(product.priceUsd)}</div>
                     <div className="mt-1 text-xs font-bold text-slate-400">≈ {formatEtb(product.priceUsd)}</div>
                  </div>
                  <div className={cn("rounded-2xl border p-6 shadow-sm", readiness.tone)}>
                     <div className="text-[10px] font-black uppercase tracking-widest mb-1">Production Status</div>
                     <div className="text-2xl font-black">{readiness.label}</div>
                     <div className="mt-1 text-xs font-bold opacity-75">Calculated from Production Materials</div>
                  </div>
               </div>
               <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Production Cost Setup</h4>
                    {editingCost ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingCost(false)}
                          className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-50"
                        >
                          <X className="h-4 w-4" /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveProductionCost()}
                          className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-black text-white shadow-sm hover:bg-emerald-800"
                        >
                          <Save className="h-4 w-4" /> Save Cost
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={startCostEdit}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-xs font-black text-emerald-700 hover:bg-emerald-50"
                      >
                        <Pencil className="h-4 w-4" /> Edit Cost
                      </button>
                    )}
                  </div>
                  {editingCost ? (
                    <div className="grid gap-4 md:grid-cols-4">
                      <label className="rounded-2xl border border-emerald-100 bg-white p-5">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Designer Labor Cost</span>
                        <input
                          type="number"
                          value={costForm.designerCostUsd}
                          onChange={e => setCostForm(prev => ({ ...prev, designerCostUsd: e.target.value }))}
                          className="h-10 w-full rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 text-sm font-black outline-none focus:border-emerald-400"
                          placeholder="0"
                        />
                      </label>
                      <label className="rounded-2xl border border-emerald-100 bg-white p-5">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Production Tax Rate</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={costForm.taxPercent}
                            onChange={e => setCostForm(prev => ({ ...prev, taxPercent: e.target.value }))}
                            className="h-10 min-w-0 flex-1 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 text-sm font-black outline-none focus:border-emerald-400"
                            placeholder="0"
                          />
                          <span className="text-xs font-black text-slate-400">%</span>
                        </div>
                      </label>
                      <label className="rounded-2xl border border-emerald-100 bg-white p-5">
                        <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Other Production Costs</span>
                        <input
                          type="number"
                          value={costForm.otherCostUsd}
                          onChange={e => setCostForm(prev => ({ ...prev, otherCostUsd: e.target.value }))}
                          className="h-10 w-full rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 text-sm font-black outline-none focus:border-emerald-400"
                          placeholder="0"
                        />
                      </label>
                      <Field
                        label="Estimated Unit Cost"
                        value={formatCurrency(
                          (Number(costForm.designerCostUsd || 0) || 0) +
                          ((Number(product.priceUsd ?? 0) || 0) * ((Number(costForm.taxPercent || 0) || 0) / 100)) +
                          (Number(costForm.otherCostUsd || 0) || 0)
                        )}
                      />
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-4">
                      <Field label="Designer Labor Cost" value={formatCurrency(product.profitCostSetting?.designerCostUsd)} />
                      <Field label="Production Tax Rate" value={formatPercent(product.profitCostSetting?.taxPercent)} />
                      <Field label="Other Production Costs" value={formatCurrency(product.profitCostSetting?.otherCostUsd)} />
                      <Field label="Estimated Unit Cost" value={formatCurrency(productionUnitCost)} />
                    </div>
                  )}
               </div>
               <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Customer Option Pricing</h4>
                  <div className="space-y-3">
                     {priceGroups.map((group) => {
                       const roles = (product.familyRoles ?? []).filter((role) => (role.customerType ?? "").toLowerCase() === group.key);
                       if (!roles.length) return null;
                       const isOpen = openPriceGroups[group.key] ?? false;
                       return (
                         <div key={group.key} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                           <button
                             type="button"
                             onClick={() => setOpenPriceGroups((current) => ({ ...current, [group.key]: !isOpen }))}
                             className="flex w-full items-center justify-between bg-white px-4 py-3 text-left"
                           >
                             <span className="text-xs font-black uppercase tracking-widest text-slate-900">{group.label}</span>
                             <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", isOpen && "rotate-180")} />
                           </button>
                           {isOpen ? (
                             <div className="grid gap-3 p-3 md:grid-cols-3">
                               {roles.map((role, i) => (
                                 <div key={`${group.key}-${i}`} className="rounded-xl border border-slate-200 bg-white p-4">
                                   <p className="text-sm font-black text-slate-900">{role.label?.replace("Men - ", "").replace("Boy - ", "")}</p>
                                   <p className="mt-1 text-[11px] font-semibold text-slate-500">{role.description || "Standard outfit option"}</p>
                                   <p className="mt-3 text-xl font-black text-blue-900">{formatCurrency(role.price)}</p>
                                   <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-black uppercase text-slate-400">
                                     <span>Cost {formatCurrency(role.designerCostUsd)}</span>
                                     <span>Tax {formatPercent(role.taxPercent)}</span>
                                     <span>Other {formatCurrency(role.otherCostUsd)}</span>
                                   </div>
                                 </div>
                               ))}
                             </div>
                           ) : null}
                         </div>
                       );
                     })}
                  </div>
               </div>
            </section>
          )}

          {activeSection === "garment" && (
            <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
               <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><Shirt className="h-4 w-4" /> Garment Specifications</h2>
               <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Product ID" value={product.uniqueId} icon={Hash} />
                  <Field label="Fabric Texture" value={product.fabricType} />
                  <Field label="Artisan Style" value={product.embroideryStyle} />
                  <Field label="Estimated Delivery Days" value={`${product.tailoringDays || 30} Days`} icon={Clock} />
                  <Field label="Target Gender" value={product.gender} />
               </div>
            </section>
          )}

          {activeSection === "inventory" && (
             <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500"><ShieldCheck className="h-4 w-4" /> Production Readiness</h2>
                <div className="space-y-4">
                   <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black uppercase text-slate-900">Production Status</p>
                          <p className="mt-1 text-xs font-bold text-slate-500">Made after order, based on assigned material availability.</p>
                        </div>
                        <span className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-1 text-[10px] font-black uppercase tracking-widest", readiness.tone)}>
                          <AlertTriangle className="h-3.5 w-3.5" /> {readiness.label}
                        </span>
                      </div>
                   </div>
                   <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="text-sm font-black uppercase text-slate-900">Production Materials</h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">Default recipe used to estimate if this product can be produced before a customer orders.</p>
                      <div className="mt-4 space-y-3">
                        {product.productionMaterials?.length ? product.productionMaterials.map((material, index) => {
                          const required = Number(material.requiredQty ?? 0);
                          const available = Number(material.availableQty ?? 0);
                          const low = Number(material.lowStockLevel ?? 0);
                          const shortage = available < required;
                          const lowMaterial = !shortage && available <= low;
                          return (
                            <div key={material.id ?? index} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
                              <div>
                                <p className="text-sm font-black text-slate-900">{material.name}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  Required {required} {material.unit} / Available {available} {material.unit} / Low stock level {low} {material.unit}
                                </p>
                                {material.note ? <p className="mt-1 text-xs font-semibold text-slate-400">{material.note}</p> : null}
                              </div>
                              <span className={cn("w-fit rounded-full border px-3 py-1 text-[10px] font-black uppercase", shortage ? "border-rose-200 bg-rose-50 text-rose-800" : lowMaterial ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
                                {shortage ? "Shortage" : lowMaterial ? "Low Material" : "Enough"}
                              </span>
                            </div>
                          );
                        }) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold text-slate-500">No production materials assigned yet.</div>
                        )}
                      </div>
                   </div>
                   <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-6">
                      <div className="space-y-1"><p className="text-sm font-black uppercase text-slate-900">Featured Placement</p><p className="text-xs font-bold text-slate-400">Highlight this item on the dashboard hero sections.</p></div>
                      <span className={cn("inline-flex items-center rounded-full border px-4 py-1 text-[10px] font-black uppercase tracking-widest", product.isFeatured ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-400 border-slate-100")}>{product.isFeatured ? "Enabled" : "Disabled"}</span>
                   </div>
                   <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-6">
                      <div className="space-y-1"><p className="text-sm font-black uppercase text-slate-900">Visibility Status</p><p className="text-xs font-bold text-slate-400">Live on storefront and available for search.</p></div>
                      <span className={cn("inline-flex items-center rounded-full border px-4 py-1 text-[10px] font-black uppercase tracking-widest", product.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100")}>{product.isActive ? "Public" : "Private"}</span>
                   </div>
                </div>
             </section>
          )}
    </AdminDetailLayout>
  );
}
