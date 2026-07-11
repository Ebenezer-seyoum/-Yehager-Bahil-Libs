"use client";

import Link from "next/link";
import { Copy, Heart, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  originalPriceUsd?: number | string | null;
  finalPriceUsd?: number | string | null;
  effectivePriceUsd?: number | string | null;
  discount?: { label?: string | null; savingsUsd?: number | string | null } | null;
  familyRoles?: FamilyRole[] | null;
  isCouple?: boolean | null;
  groomPriceUsd?: number | null;
};

type ProductCardProps = {
  product: Product;
  eventId?: string | null;
  groupId?: string | null;
  selectionMode?: string | null;
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

export function ProductCard({ product, eventId, groupId, selectionMode, etbRate }: ProductCardProps) {
  const [wished, setWished] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const context = new URLSearchParams();
  if (eventId) context.set(selectionMode === "event" ? "eventId" : "event", eventId);
  if (groupId) context.set("groupId", groupId);
  if (selectionMode) context.set("selectionMode", selectionMode);
  const href = `/product/${product.id}${context.size ? `?${context}` : ""}`;
  const images = useMemo(() => product.images?.filter(Boolean) ?? [], [product.images]);
  const image = images[imageIndex % Math.max(images.length, 1)] ?? DEFAULT_IMAGE;
  const basePrice = Number(product.effectivePriceUsd ?? product.finalPriceUsd ?? product.priceUsd ?? 0);
  const originalPrice = Number(product.originalPriceUsd ?? product.priceUsd ?? basePrice);
  const hasDiscount = Boolean(product.discount && originalPrice > basePrice);
  const explicitRolePrices = product.familyRoles?.map((role) => Number(role.price ?? 0)).filter((price) => price > 0) ?? [];
  const rolePrices = explicitRolePrices.length > 0 ? explicitRolePrices : product.isCouple && product.groomPriceUsd ? [basePrice, Number(product.groomPriceUsd)] : [];
  const shareUrl = typeof window === "undefined" ? "" : `${window.location.origin}/product/${product.id}`;
  const minPrice = rolePrices.length ? Math.min(...rolePrices) : basePrice;
  const maxPrice = rolePrices.length ? Math.max(...rolePrices) : basePrice;
  const usdPriceText = minPrice === maxPrice ? `$${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
  const etbPriceText = etbRate
    ? minPrice === maxPrice
      ? `≈ ${Math.round(minPrice * etbRate).toLocaleString()} ETB`
      : `≈ ${Math.round(minPrice * etbRate).toLocaleString()} - ${Math.round(maxPrice * etbRate).toLocaleString()} ETB`
    : null;

  useEffect(() => {
    if (images.length < 2) return;
    const intervalId = window.setInterval(() => {
      setImageIndex((current) => (current + 1) % images.length);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [images.length]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="relative">
      <Link href={href} className="group block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-[0_0_50px_rgba(251,163,20,0.35)]">
          <img key={image} src={image} alt={product.name} className="h-full w-full object-cover animate-in fade-in duration-700 transition-transform group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-amber-900/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            {product.region ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${REGION_BADGE[product.region] ?? "bg-gray-100 text-gray-700"}`}>{product.region}</span>
            ) : null}
            {product.subcategory ? <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">{product.subcategory}</span> : null}
            {hasDiscount ? <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white shadow-lg">{product.discount?.label ?? "SALE"}</span> : null}
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
                  {usdPriceText}
                </p>
                {etbPriceText ? <p className="text-[11px] text-white/55">{etbPriceText}</p> : null}
                {hasDiscount ? <p className="text-xs font-bold text-white/60 line-through">${originalPrice.toFixed(2)}</p> : null}
                {rolePrices.length > 1 ? (
                  <p className="text-[10px] text-white/50">{product.familyRoles?.map((role) => role.label).filter(Boolean).join(" / ") || "Couple"}</p>
                ) : null}
              </div>
              <span className="text-[11px] capitalize text-white/60 sm:text-xs">{rolePrices.length > 1 ? "Set" : product.gender ?? ""}</span>
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
