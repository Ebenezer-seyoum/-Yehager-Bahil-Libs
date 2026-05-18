import { Trash2, Users } from "lucide-react";

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
    } | null;
  };
  updateItemQuantity: (formData: FormData) => Promise<void>;
  removeItem: (formData: FormData) => Promise<void>;
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&h=200&fit=crop";

export function CartItemCard({ item, updateItemQuantity, removeItem }: CartItemCardProps) {
  const quantity = Number(item.quantity ?? 1);
  const lineTotal = Number(item.priceUsd ?? 0) * quantity;
  const chest = item.measurementSnapshot?.chest;
  const waist = item.measurementSnapshot?.waist;

  return (
    <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
      <img
        src={item.productImage || DEFAULT_IMAGE}
        alt={item.productName}
        className="h-24 w-24 flex-shrink-0 rounded-lg object-cover"
      />

      <div className="min-w-0 flex-1">
        <h3 className="font-heading text-sm font-semibold">{item.productName}</h3>
        <p className="mt-1 font-bold text-primary">${Number(item.priceUsd ?? 0).toFixed(2)}</p>

        {item.eventName ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-accent">
            <Users className="h-3 w-3" />
            <span>Group: {item.eventName}</span>
          </div>
        ) : null}

        {chest != null || waist != null ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Measurements locked:
            {chest != null ? ` Chest ${chest}"` : ""}
            {chest != null && waist != null ? " |" : ""}
            {waist != null ? ` Waist ${waist}"` : ""}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <form action={updateItemQuantity}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="quantity" value={Math.max(1, quantity - 1)} />
            <button className="rounded border border-border px-2 py-0.5 text-xs hover:bg-secondary" type="submit">
              -
            </button>
          </form>
          <span className="text-xs text-muted-foreground">Qty {quantity}</span>
          <form action={updateItemQuantity}>
            <input type="hidden" name="itemId" value={item.id} />
            <input type="hidden" name="quantity" value={quantity + 1} />
            <button className="rounded border border-border px-2 py-0.5 text-xs hover:bg-secondary" type="submit">
              +
            </button>
          </form>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs font-medium text-foreground">Line total ${lineTotal.toFixed(2)}</span>
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
