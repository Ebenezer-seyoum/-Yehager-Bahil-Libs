import { Trash2, Users } from "lucide-react";

type CartItemCardProps = {
  item: {
    id: string;
    productName: string;
    productImage?: string | null;
    priceUsd?: number | null;
    quantity?: number | null;
    itemType?: string | null;
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
  const quantity = Number(item.quantity ?? 1);
  const isCustomDesign = item.itemType === "custom_design" || item.productName.toLowerCase().includes("custom design");
  const measurements = [
    ["Chest", item.measurementSnapshot?.chest],
    ["Waist", item.measurementSnapshot?.waist],
    ["Hips", item.measurementSnapshot?.hips],
    ["Shoulder", item.measurementSnapshot?.shoulderWidth],
    ["Arm", item.measurementSnapshot?.armLength],
    ["Torso", item.measurementSnapshot?.torsoLength],
  ].filter(([, value]) => value != null && value !== "");

  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
      <img
        src={item.productImage || DEFAULT_IMAGE}
        alt={item.productName}
        className="h-24 w-24 flex-shrink-0 rounded-lg object-cover"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-heading text-sm font-semibold">{item.productName}</h3>
          {isCustomDesign ? (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Custom Design
            </span>
          ) : null}
        </div>
        <p className="mt-1 font-bold text-primary">${Number(item.priceUsd ?? 0).toFixed(2)}</p>

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
      </div>

      <form action={removeItem} className="flex-shrink-0">
        <input type="hidden" name="itemId" value={item.id} />
        <button type="submit" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive" aria-label={`Remove ${item.productName}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
