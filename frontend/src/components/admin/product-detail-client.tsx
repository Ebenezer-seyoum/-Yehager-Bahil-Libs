"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  RefreshCw, 
  Loader2,
  Package,
  Pencil,
  Trash2,
  Star,
  Power,
  DollarSign,
  Clock,
  Shirt,
  Info,
  ChevronRight,
  ShieldCheck,
  ImageIcon,
  MapPin,
  Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardConfirm, dashboardError, dashboardSuccess } from "@/lib/dashboard-swal";

type Product = Record<string, any>;

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

function Field({ label, value, icon: Icon }: { label: string; value?: string | number | null; icon?: any }) {
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

export function ProductDetailClient({ initialProduct }: { initialProduct: Product }) {
  const router = useRouter();
  const [product, setProduct] = useState<Product>(initialProduct);
  const [busy, setBusy] = useState(false);
  const [activeImage, setActiveImage] = useState(product.images?.[0] || "");
  const [activeSection, setActiveSection] = useState<"general" | "pricing" | "garment" | "inventory">("general");

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

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6 pb-20">
      <header className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl border-l-4 border-l-primary">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-2xl shadow-sm overflow-hidden">
               {product.images?.[0] ? <img src={product.images[0]} className="h-full w-full object-cover" /> : <Package className="h-10 w-10" />}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Catalog / Inventory</p>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight line-clamp-1">{product.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-xs font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">#{product.uniqueId}</span>
                <span className="text-sm font-medium text-slate-500">{product.region} • {product.subcategory}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <button onClick={() => refresh()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 group transition-all">
                <RefreshCw className={cn("h-4 w-4 text-slate-400 group-hover:rotate-180 transition-transform duration-500", busy && "animate-spin")} /> Refresh
              </button>
              <button onClick={() => router.back()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition-all active:scale-95">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            </div>
            <div className="flex gap-2">
              <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", product.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100")}>{product.isActive ? "Active" : "Draft"}</span>
              {product.isFeatured && <span className="inline-flex items-center gap-1 rounded-full border bg-amber-50 text-amber-700 border-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest"><Star className="h-3 w-3 fill-amber-700" /> Featured</span>}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-100 bg-slate-50/50 p-4 px-8 shadow-inner">
         <div className="flex items-center gap-10">
            <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Base Price</span><span className="text-xl font-black text-slate-900">{formatCurrency(product.priceUsd)}</span></div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Tailoring</span><span className="text-xl font-black text-slate-900">{product.tailoringDays || 30} Days</span></div>
         </div>
         <div className="flex flex-wrap gap-2">
            <button className="inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 transition-all active:scale-95"><Pencil className="h-4 w-4" /> Edit Item</button>
            <div className="h-8 w-px bg-slate-200 mx-1" />
            <button onClick={() => toggleStatus()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all"><Power className={cn("h-4 w-4", product.isActive ? "text-emerald-500" : "text-slate-400")} /> {product.isActive ? "Deactivate" : "Activate"}</button>
            <button onClick={() => remove()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-rose-200 bg-white px-5 text-sm font-bold text-rose-700 hover:bg-rose-50 transition-all active:scale-95"><Trash2 className="h-4 w-4" /> Delete</button>
         </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="lg:col-span-4 space-y-6">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
             <div className="aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-slate-100 border border-slate-200">
                {activeImage ? <img src={activeImage} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate-300"><ImageIcon className="h-20 w-20" /></div>}
             </div>
             <div className="mt-4 flex flex-wrap gap-2">
                {product.images?.map((img: string, i: number) => (
                  <button key={i} onClick={() => setActiveImage(img)} className={cn("h-16 w-16 overflow-hidden rounded-xl border-2 transition-all", activeImage === img ? "border-primary shadow-md" : "border-transparent opacity-60 hover:opacity-100")}>
                    <img src={img} className="h-full w-full object-cover" />
                  </button>
                ))}
             </div>
          </section>

          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <nav className="space-y-1">
              {[
                { id: "general", label: "Catalog Identity", icon: Info },
                { id: "pricing", label: "Financial Data", icon: DollarSign },
                { id: "garment", label: "Craft & Tailoring", icon: Shirt },
                { id: "inventory", label: "Stock & Settings", icon: Package },
              ].map((item) => {
                 const isSelected = activeSection === item.id;
                 return (
                  <button key={item.id} onClick={() => setActiveSection(item.id as any)} className={cn("flex w-full items-center gap-4 rounded-3xl px-5 py-4 text-left transition-all", isSelected ? "bg-slate-900 text-white shadow-xl" : "text-slate-600 hover:bg-slate-50 group")}>
                    <item.icon className={cn("h-5 w-5", isSelected ? "text-white" : "text-slate-400 group-hover:text-slate-600 transition-colors")} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                    {isSelected && <ChevronRight className="ml-auto h-4 w-4 text-white/50" />}
                  </button>
                 );
              })}
            </nav>
          </section>
        </aside>

        <main className="lg:col-span-8 space-y-6">
          {activeSection === "general" && (
            <div className="space-y-6">
              <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><Info className="h-4 w-4" /> Identity Profile</h2>
                <div className="grid gap-4 md:grid-cols-2">
                   <Field label="Catalog Name" value={product.name} icon={Shirt} />
                   <Field label="Unique Identifier" value={product.uniqueId} icon={Hash} />
                   <Field label="Geographic Region" value={product.region} icon={MapPin} />
                   <Field label="Culture / Style" value={product.subcategory} icon={Star} />
                </div>
                <div className="mt-4">
                   <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Description / Background</div>
                      <p className="text-sm font-bold text-slate-600 leading-relaxed italic">{product.description || "No description provided for this item."}</p>
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
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
                     <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Groom Add-on</div>
                     <div className="text-2xl font-black text-slate-900">{formatCurrency(product.groomPriceUsd)}</div>
                     <div className="mt-1 text-xs font-bold text-slate-400">Exclusive Male Attire Link</div>
                  </div>
               </div>
               <div className="mt-6 rounded-2xl border border-slate-100 p-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Family Bundle Estimation</h4>
                  <div className="grid gap-3 sm:grid-cols-3">
                     {product.familyRoles?.map((role: any, i: number) => (
                       <div key={i} className="flex flex-col rounded-xl bg-slate-50 p-4 text-center">
                          <span className="text-lg mb-1">{role.icon}</span>
                          <span className="text-[10px] font-black uppercase text-slate-500 mb-1">{role.label}</span>
                          <span className="text-sm font-black text-slate-900">{formatCurrency(role.price)}</span>
                       </div>
                     ))}
                  </div>
               </div>
            </section>
          )}

          {activeSection === "garment" && (
            <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
               <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><Shirt className="h-4 w-4" /> Physical Attributes</h2>
               <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Fabric Texture" value={product.fabricType} />
                  <Field label="Artisan Style" value={product.embroideryStyle} />
                  <Field label="Craftsmanship Period" value={`${product.tailoringDays || 30} Days`} icon={Clock} />
                  <Field label="Target Gender" value={product.gender} />
               </div>
            </section>
          )}

          {activeSection === "inventory" && (
             <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-sm">
                <h2 className="mb-8 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><ShieldCheck className="h-4 w-4" /> Management Controls</h2>
                <div className="space-y-4">
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
        </main>
      </div>
    </div>
  );
}
