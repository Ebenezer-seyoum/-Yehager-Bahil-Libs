import { Minus, Plus, Ruler, Trash2, Users } from "lucide-react";

type CartItemCardProps = {
  item: {
    id: string;
    productName: string;
    productImage?: string | null;
    priceUsd?: number | null;
    quantity?: number | null;
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
  updateItemQuantity: (formData: FormData) => Promise<void>;
  removeItem: (formData: FormData) => Promise<void>;
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&h=200&fit=crop";

export function CartItemCard({ item, updateItemQuantity, removeItem }: CartItemCardProps) {
  const quantity = Number(item.quantity ?? 1);
  const lineTotal = Number(item.priceUsd ?? 0) * quantity;
  const measurements = [
    ["Chest", item.measurementSnapshot?.chest],
    ["Waist", item.measurementSnapshot?.waist],
    ["Hips", item.measurementSnapshot?.hips],
    ["Shoulder", item.measurementSnapshot?.shoulderWidth],
    ["Arm", item.measurementSnapshot?.armLength],
    ["Torso", item.measurementSnapshot?.torsoLength],
  ].filter(([, value]) => value != null && value !== "");

  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/35">
      <img
        src={item.productImage || DEFAULT_IMAGE}
        alt={item.productName}
        className="h-28 w-24 flex-shrink-0 rounded-lg object-cover sm:h-32 sm:w-28"
      />

      <div className="min-w-0 flex-1">
        <h3 className="font-heading text-lg font-semibold leading-tight">{item.productName}</h3>
        <p className="mt-1 text-xl font-bold text-primary">${Number(item.priceUsd ?? 0).toFixed(2)}</p>

        {item.eventName ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Users className="h-3 w-3" />
            <span>Group: {item.eventName}</span>
          </div>
        ) : null}

        {measurements.length > 0 ? (
          <div className="mt-3 rounded-lg border border-border/70 bg-background/60 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Ruler className="h-3.5 w-3.5 text-primary" />
              Measurements locked
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground sm:grid-cols-3">
              {measurements.map(([label, value]) => (
                <span key={label}>
                  {label}: <strong className="text-foreground">{value}</strong>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <form action={updateItemQuantity}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="quantity" value={Math.max(1, quantity - 1)} />
            <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary" type="submit" aria-label="Decrease quantity">
              <Minus className="h-3.5 w-3.5" />
            </button>
          </form>
          <span className="inline-flex h-8 min-w-14 items-center justify-center rounded-md bg-secondary px-3 text-xs font-bold">Qty {quantity}</span>
          <form action={updateItemQuantity}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="quantity" value={quantity + 1} />
            <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary" type="submit" aria-label="Increase quantity">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </form>
          <span className="ml-auto text-sm font-bold text-foreground">Line total ${lineTotal.toFixed(2)}</span>
        </div>
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
