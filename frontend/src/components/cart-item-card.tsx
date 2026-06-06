"use client";

import { useState } from "react";
import { Eye, Trash2, Users, X } from "lucide-react";

type CartItemCardProps = {
  item: {
    id: string;
    productName: string;
    productImage?: string | null;
    priceUsd?: number | null;
    quantity?: number | null;
    itemType?: string | null;
    itemMetadata?: Record<string, unknown> | null;
    eventName?: string | null;
    measurementSnapshot?: {
      chest?: number | string | null;
      waist?: number | string | null;
      hips?: number | string | null;
      shoulderWidth?: number | string | null;
      armLength?: number | string | null;
      torsoLength?: number | string | null;
    } | null;
  };
  removeItem: (formData: FormData) => Promise<void>;
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&h=200&fit=crop";

export function CartItemCard({ item, removeItem }: CartItemCardProps) {
  const [showDesign, setShowDesign] = useState(false);
  const quantity = Number(item.quantity ?? 1);
  const isCustomDesign = item.itemType === "custom_design" || item.productName.toLowerCase().includes("custom design");
  const isLockedDirectCustomDesign = item.itemType === "custom_design";
  const metadata = item.itemMetadata ?? {};
  const measurements = [
    ["Chest", item.measurementSnapshot?.chest],
    ["Waist", item.measurementSnapshot?.waist],
    ["Hips", item.measurementSnapshot?.hips],
    ["Shoulder", item.measurementSnapshot?.shoulderWidth],
    ["Arm", item.measurementSnapshot?.armLength],
    ["Torso", item.measurementSnapshot?.torsoLength],
  ].filter(([, value]) => value != null && value !== "");

  return (
    <div className="flex gap-6 rounded-2xl border border-border bg-card p-6">
      <img
        src={item.productImage || DEFAULT_IMAGE}
        alt={item.productName}
        className="h-36 w-36 flex-shrink-0 rounded-xl object-cover"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-lg font-semibold">{item.productName}</h3>
          {isCustomDesign ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Custom Design
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-2xl font-bold text-primary">${Number(item.priceUsd ?? 0).toFixed(2)}</p>
        {isCustomDesign ? (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Request: <strong className="text-foreground">#{String(metadata.submission_number ?? "Custom")}</strong></span>
            <span>Estimate: <strong className="text-foreground">{String(metadata.estimated_delivery_label ?? "To be confirmed")}</strong></span>
          </div>
        ) : null}

        {item.eventName ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-accent">
            <Users className="h-3 w-3" />
            <span>Group: {item.eventName}</span>
          </div>
        ) : null}

        {measurements.length > 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Measurements locked:{" "}
            {measurements.map(([label, value], index) => (
              <span key={label}>
                {index > 0 ? " | " : ""}
                {label} {value} cm
              </span>
            ))}
          </p>
        ) : null}
        {quantity > 1 ? <p className="mt-2 text-sm text-muted-foreground">Qty {quantity}</p> : null}
        {isCustomDesign ? (
          <button type="button" onClick={() => setShowDesign((value) => !value)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:bg-secondary">
            {showDesign ? <X className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showDesign ? "Hide Design" : "View Design"}
          </button>
        ) : null}

        {isCustomDesign && showDesign ? (
          <div className="mt-3 rounded-xl border border-border bg-secondary/30 p-3">
            <div className="grid gap-2 text-xs sm:grid-cols-3">
              <p><span className="text-muted-foreground">Fabric:</span> {String(metadata.fabric_type ?? "Not provided")}</p>
              <p><span className="text-muted-foreground">Embroidery:</span> {String(metadata.embroidery_style ?? "Not provided")}</p>
              <p><span className="text-muted-foreground">Color:</span> {String(metadata.color_preference ?? "Not provided")}</p>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {["front_image_url", "side_image_url", "back_image_url", "detail_image_url"].map((key) =>
                metadata[key] ? <img key={key} src={String(metadata[key])} alt="Custom design reference" className="h-20 w-20 rounded-lg object-cover" /> : null,
              )}
            </div>
          </div>
        ) : null}
      </div>

      {!isLockedDirectCustomDesign ? (
        <form action={removeItem} className="flex-shrink-0">
          <input type="hidden" name="itemId" value={item.id} />
          <button type="submit" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive" aria-label={`Remove ${item.productName}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <span className="max-w-24 text-right text-[10px] leading-tight text-muted-foreground">Contact support to change this approved quote.</span>
      )}
    </div>
  );
}
