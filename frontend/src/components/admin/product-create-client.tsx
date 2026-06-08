"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  RefreshCw, 
  Loader2,
  Package,
  Plus,
  Trash2,
  Star,
  DollarSign,
  Clock,
  Shirt,
  Info,
  ShieldCheck,
  ImageIcon,
  CheckCircle2,
  XCircle,
  Hash,
  MapPin,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { REGIONS, TAXONOMY } from "@/lib/taxonomy";

export function ProductCreateClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [formNotice, setFormNotice] = useState<{ tone: "success" | "error"; title: string; message: string } | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState(REGIONS[0]);
  const [subcategory, setSubcategory] = useState(TAXONOMY[REGIONS[0]]?.[0] || "");
  const [priceUsd, setPriceUsd] = useState("");
  const [groomPriceUsd, setGroomPriceUsd] = useState("");
  const [gender, setGender] = useState("female");
  const [fabricType, setFabricType] = useState("");
  const [embroideryStyle, setEmbroideryStyle] = useState("");
  const [tailoringDays, setTailoringDays] = useState("30");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [newImage, setNewImage] = useState("");

  const subsections = TAXONOMY[region] ?? [];

  async function handleCreate() {
    if (!name.trim() || !priceUsd) {
      setFormNotice({ tone: "error", title: "Missing Data", message: "Please enter product name and base price." });
      return;
    }

    setBusy(true);
    setFormNotice(null);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        region,
        subcategory,
        priceUsd: Number(priceUsd),
        groomPriceUsd: groomPriceUsd ? Number(groomPriceUsd) : null,
        gender,
        fabricType,
        embroideryStyle,
        tailoringDays: Number(tailoringDays),
        isActive,
        isFeatured,
        images
      };

      const res = await fetch("/api/backend/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create product");
      }

      setFormNotice({ tone: "success", title: "Success", message: "Product added to catalog successfully" });
      setTimeout(() => router.push("/admin/inventory"), 1000);
    } catch (error: any) {
      setFormNotice({ tone: "error", title: "Error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  function addImage() {
    if (newImage && !images.includes(newImage)) {
      setImages([...images, newImage]);
      setNewImage("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-20">
      <header className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-xl border-l-4 border-l-primary">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm font-black text-2xl">
              <Package className="h-10 w-10" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Catalog / Inventory</p>
              <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Add New Outfit</h1>
              <p className="text-sm font-medium text-slate-500 mt-1">Register a new heritage clothing item to the storefront.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50 transition-all active:scale-95">
              Discard
            </button>
            <button onClick={handleCreate} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Product
            </button>
          </div>
        </div>
      </header>

      {formNotice && (
        <div className={cn(
          "flex items-center gap-4 rounded-[2rem] p-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300",
          formNotice.tone === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        )}>
          {formNotice.tone === "success" ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
          <div>
             <p className="font-black uppercase tracking-tight text-xl">{formNotice.title}</p>
             <p className="font-bold opacity-90">{formNotice.message}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <main className="lg:col-span-8 space-y-6">
           {/* Section 1: Core Info */}
           <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
             <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><Info className="h-4 w-4" /> Basic Information</h3>
             </div>
             <div className="p-8 space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400">Product Name <span className="text-rose-500">*</span></label>
                   <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Habesha Kemis — G-001" className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400">Detailed Description</label>
                   <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Background, cultural significance, and design details..." className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-6 font-bold outline-none" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Region / Traditional Source</label>
                      <select value={region} onChange={e => { setRegion(e.target.value); setSubcategory(TAXONOMY[e.target.value]?.[0] || ""); }} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none appearance-none">
                         {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400">Specific Sub-category</label>
                      <select value={subcategory} onChange={e => setSubcategory(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none appearance-none">
                         {subsections.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                   </div>
                </div>
             </div>
           </section>

           {/* Section 2: Garment Attributes */}
           <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
             <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><Shirt className="h-4 w-4" /> Craftsmanship Details</h3>
             </div>
             <div className="p-8 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400">Garment Gender</label>
                   <select value={gender} onChange={e => setGender(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none appearance-none">
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="unisex">Unisex</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400">Tailoring Days <span className="text-rose-500">*</span></label>
                   <input type="number" value={tailoringDays} onChange={e => setTailoringDays(e.target.value)} className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400">Fabric Type</label>
                   <input value={fabricType} onChange={e => setFabricType(e.target.value)} placeholder="Pure Cotton, Shemma..." className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400">Embroidery Style</label>
                   <input value={embroideryStyle} onChange={e => setEmbroideryStyle(e.target.value)} placeholder="Tilet, Cross-stitch..." className="w-full rounded-2xl border border-slate-100 bg-slate-50/50 p-4 font-bold outline-none" />
                </div>
             </div>
           </section>

           {/* Section 3: Visuals */}
           <section className="rounded-[2.5rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
             <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><ImageIcon className="h-4 w-4" /> Gallery Management</h3>
             </div>
             <div className="p-8 space-y-6">
                <div className="flex gap-2">
                   <input value={newImage} onChange={e => setNewImage(e.target.value)} placeholder="Paste image CDN URL here..." className="flex-1 rounded-2xl border border-slate-100 bg-slate-50/50 px-6 font-bold outline-none" />
                   <button onClick={addImage} className="h-14 w-14 shrink-0 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-all"><Plus className="h-6 w-6" /></button>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                   {images.map((img, i) => (
                     <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                        <img src={img} className="h-full w-full object-cover" />
                        <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 h-8 w-8 rounded-xl bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-4 w-4" /></button>
                     </div>
                   ))}
                   {images.length === 0 && (
                     <div className="col-span-4 py-10 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300">
                        <Upload className="h-10 w-10 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No images linked yet</p>
                     </div>
                   )}
                </div>
             </div>
           </section>
        </main>

        <aside className="lg:col-span-4 space-y-6">
           <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
             <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><DollarSign className="h-4 w-4" /> Pricing Data</h3>
             <div className="space-y-4">
                <div className="rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-4">
                   <label className="mb-1 block text-[10px] font-black uppercase text-slate-400 tracking-widest">Base Price (USD)</label>
                   <input type="number" value={priceUsd} onChange={e => setPriceUsd(e.target.value)} className="w-full bg-transparent text-xl font-black outline-none" placeholder="0.00" />
                </div>
                <div className="rounded-2xl border border-slate-100 p-4">
                   <label className="mb-1 block text-[10px] font-black uppercase text-slate-400 tracking-widest">Groom Price (Optional)</label>
                   <input type="number" value={groomPriceUsd} onChange={e => setGroomPriceUsd(e.target.value)} className="w-full bg-transparent text-lg font-black outline-none" placeholder="0.00" />
                </div>
             </div>
           </section>

           <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
             <h3 className="mb-6 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400"><ShieldCheck className="h-4 w-4" /> Visibility Controls</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-2">
                   <div className="space-y-1"><p className="text-xs font-black uppercase text-slate-900 leading-none">Featured Product</p><p className="text-[10px] font-bold text-slate-400">Home page hero boost</p></div>
                   <button onClick={() => setIsFeatured(!isFeatured)} className={cn("relative inline-flex h-6 w-11 rounded-full p-1 transition-all", isFeatured ? "bg-amber-500" : "bg-slate-200")}><span className={cn("h-4 w-4 rounded-full bg-white transition-all", isFeatured ? "translate-x-5" : "translate-x-0")} /></button>
                </div>
                <div className="flex items-center justify-between p-2">
                   <div className="space-y-1"><p className="text-xs font-black uppercase text-slate-900 leading-none">Publicly Active</p><p className="text-[10px] font-bold text-slate-400">Visible for customers</p></div>
                   <button onClick={() => setIsActive(!isActive)} className={cn("relative inline-flex h-6 w-11 rounded-full p-1 transition-all", isActive ? "bg-emerald-500" : "bg-slate-200")}><span className={cn("h-4 w-4 rounded-full bg-white transition-all", isActive ? "translate-x-5" : "translate-x-0")} /></button>
                </div>
             </div>
           </section>
        </aside>
      </div>
    </div>
  );
}
