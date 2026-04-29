import { Link } from "react-router-dom";
import { useState } from "react";
import { Heart, Share2, Copy, Check } from "lucide-react";
import { SOCIAL_SHARE_LINKS } from "@/lib/taxonomy";
import { toast } from "sonner";
import { useTranslatedProduct } from "@/hooks/useTranslatedProduct";
import { useT } from "@/lib/i18n/I18nContext";

const REGION_BADGE = {
  "Oromo": "bg-amber-100 text-amber-800",
  "Amhara": "bg-rose-100 text-rose-800",
  "Tigre": "bg-blue-100 text-blue-700",
  "Debub": "bg-green-100 text-green-800",
  "Mila's Choice": "bg-purple-100 text-purple-800",
};

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600&h=800&fit=crop",
];

export default function ProductCard({ product: rawProduct, eventId, etbRate }) {
  const { t } = useT();
  const { product } = useTranslatedProduct(rawProduct);
  const img = product.images?.[0] || DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)];
  const href = eventId ? `/product/${product.id}?event=${eventId}` : `/product/${product.id}`;
  const [wished, setWished] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/product/${product.id}`;
  const shareMsg = `${t("product.checkOutShare")} ${product.name}`;
  const shareLinks = SOCIAL_SHARE_LINKS(shareUrl, shareMsg);

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWish = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setWished((w) => !w);
    toast.success(wished ? "Removed from wishlist" : "Added to wishlist ❤️");
  };

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShareOpen((o) => !o);
  };

  return (
    <div className="relative">
      <Link to={href} className="group block">
        <div className="relative overflow-hidden rounded-xl bg-card border border-border/50 aspect-[2/3] transition-all duration-500 group-hover:border-primary/40 group-hover:shadow-[0_0_50px_rgba(251,163,20,0.35)]">
          <img
            src={img}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />

          {/* Base dark gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent transition-opacity duration-500" />

          {/* Warm golden light wash on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-amber-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Subtle top light bloom */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {product.region && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${REGION_BADGE[product.region] || "bg-gray-100 text-gray-700"}`}>
                {product.region}
              </span>
            )}
            {product.subcategory && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/40 text-white backdrop-blur-sm">
                {product.subcategory}
              </span>
            )}
          </div>

          {/* Top-right action buttons */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {product.unique_id && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-black/50 text-white/80 backdrop-blur-sm">
                #{product.unique_id}
              </span>
            )}
            <button
              onClick={handleWish}
              className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <Heart className={`w-3.5 h-3.5 transition-colors ${wished ? "fill-red-500 text-red-500" : "text-white"}`} />
            </button>
            <button
              onClick={handleShare}
              className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-white" />
            </button>
          </div>

          {/* Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-1 group-hover:translate-y-0 transition-transform duration-400">
            <h3 className="font-heading font-semibold text-white text-base leading-tight">{product.name}</h3>
            <div className="flex items-center justify-between mt-1.5">
              <div>
                {(() => {
                  const roles = product.family_roles?.length
                    ? product.family_roles
                    : (product.is_couple && product.groom_price != null
                        ? [{ price: product.price }, { price: product.groom_price }]
                        : null);
                  const prices = roles?.map(r => r?.price).filter(p => p != null);
                  if (prices && prices.length > 1) {
                    const min = Math.min(...prices);
                    const max = Math.max(...prices);
                    return (
                      <>
                        <p className="text-primary font-bold text-lg group-hover:text-amber-300 transition-colors duration-300">
                          {min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`}
                        </p>
                        <p className="text-white/50 text-[10px]">
                          {(product.family_roles || []).map(r => r.label).filter(Boolean).join(" / ") || "Couple"}
                        </p>
                      </>
                    );
                  }
                  return (
                    <>
                      <p className="text-primary font-bold text-lg group-hover:text-amber-300 transition-colors duration-300">${product.price?.toFixed(2)}</p>
                      {etbRate && <p className="text-white/50 text-[11px]">≈ {Math.round(product.price * etbRate).toLocaleString()} ETB</p>}
                    </>
                  );
                })()}
              </div>
              <span className="text-white/60 text-xs capitalize">{(product.family_roles?.length || product.is_couple) ? "Set" : product.gender}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Share panel */}
      {shareOpen && (
        <div className="absolute top-0 left-0 right-0 z-30 bg-card border border-border rounded-xl shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Share this piece</p>
            <button onClick={() => setShareOpen(false)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
          </div>
          <div className="flex items-center gap-2 p-2 bg-secondary rounded-lg mb-3">
            <span className="text-xs font-mono flex-1 truncate text-muted-foreground">{shareUrl}</span>
            <button onClick={handleCopy} className="p-1 hover:bg-border rounded transition-colors flex-shrink-0">
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {shareLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[11px] font-medium transition-opacity hover:opacity-80 ${link.bg}`}
              >
                <span className="text-sm leading-none">{link.icon}</span>
                <span>{link.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}