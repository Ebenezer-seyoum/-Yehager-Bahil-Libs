"use client";

import Link from "next/link";
import { Copy, Heart, Share2 } from "lucide-react";
import { useState } from "react";

type FamilyRole = { label?: string; price?: number };
type Product = {
  id: string;
  name: string;
  region?: string | null;
  subcategory?: string | null;
  uniqueId?: string | null;
  gender?: string | null;
  images?: string[] | null;
  priceUsd?: number | null;
  familyRoles?: FamilyRole[] | null;
  isCouple?: boolean | null;
  groomPriceUsd?: number | null;
};

type ProductCardProps = {
  product: Product;
  eventId?: string | null;
  etbRate?: number | null;
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=800&fit=crop";
const REGION_BADGE: Record<string, string> = {
  Oromo: "bg-amber-100 text-amber-800",
  Amhara: "bg-rose-100 text-rose-800",
  Tigre: "bg-blue-100 text-blue-700",
  Debub: "bg-green-100 text-green-800",
  "Mila's Choice": "bg-purple-100 text-purple-800",
};

export function ProductCard({ product, eventId, etbRate }: ProductCardProps) {
  const [wished, setWished] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const href = eventId ? `/product/${product.id}?event=${encodeURIComponent(eventId)}` : `/product/${product.id}`;
  const image = product.images?.[0] ?? DEFAULT_IMAGE;
  const basePrice = Number(product.priceUsd ?? 0);
  const rolePrices =
    product.familyRoles?.map((role) => Number(role.price ?? 0)).filter((price) => price > 0) ??
    (product.isCouple && product.groomPriceUsd ? [basePrice, Number(product.groomPriceUsd)] : []);
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/product/${product.id}`;
  const minPrice = rolePrices.length ? Math.min(...rolePrices) : basePrice;
  const maxPrice = rolePrices.length ? Math.max(...rolePrices) : basePrice;

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="relative">
      <Link href={href} className="group block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-[0_0_50px_rgba(251,163,20,0.35)]">
          <img src={image} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-amber-900/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            {product.region ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${REGION_BADGE[product.region] ?? "bg-gray-100 text-gray-700"}`}>{product.region}</span>
            ) : null}
            {product.subcategory ? <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">{product.subcategory}</span> : null}
          </div>

          <div className="absolute right-3 top-3 flex flex-col gap-1.5">
            {product.uniqueId ? <span className="rounded-full bg-black/50 px-2 py-0.5 font-mono text-[9px] text-white/80 backdrop-blur-sm">#{product.uniqueId}</span> : null}
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setWished((value) => !value);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <Heart className={`h-3.5 w-3.5 ${wished ? "fill-red-500 text-red-500" : "text-white"}`} />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                setShareOpen((value) => !value);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <Share2 className="h-3.5 w-3.5 text-white" />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 translate-y-1 p-4 transition-transform duration-500 group-hover:translate-y-0">
            <h3 className="font-heading text-base font-semibold leading-tight text-white">{product.name}</h3>
            <div className="mt-1.5 flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-primary transition-colors duration-300 group-hover:text-amber-300">
                  {minPrice === maxPrice ? `$${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}`}
                </p>
                {rolePrices.length > 1 ? (
                  <p className="text-[10px] text-white/50">{product.familyRoles?.map((role) => role.label).filter(Boolean).join(" / ") || "Couple"}</p>
                ) : etbRate ? (
                  <p className="text-[11px] text-white/50">≈ {Math.round(basePrice * etbRate).toLocaleString()} ETB</p>
                ) : null}
              </div>
              <span className="text-xs capitalize text-white/60">{rolePrices.length > 1 ? "Set" : product.gender ?? ""}</span>
            </div>
          </div>
        </div>
      </Link>

      {shareOpen ? (
        <div className="absolute left-0 right-0 top-0 z-30 rounded-xl border border-border bg-card p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Share this piece</p>
            <button type="button" onClick={() => setShareOpen(false)} className="text-lg leading-none text-muted-foreground hover:text-foreground">
              ×
            </button>
          </div>
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-secondary p-2">
            <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{shareUrl}</span>
            <button type="button" onClick={() => void copyLink()} className="rounded p-1 hover:bg-border">
              <Copy className={`h-3.5 w-3.5 ${copied ? "text-green-500" : ""}`} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(shareUrl)}`, "bg-green-600"],
              ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "bg-blue-600"],
              ["X", `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, "bg-black"],
            ].map(([label, url, cls]) => (
              <a key={label} href={url} target="_blank" rel="noreferrer" className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-white hover:opacity-80 ${cls}`}>
                {label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
