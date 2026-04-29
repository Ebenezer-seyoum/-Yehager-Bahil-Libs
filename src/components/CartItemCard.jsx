import { Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CartItemCard({ item, onRemove }) {
  const defaultImage = "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=200&h=200&fit=crop";

  return (
    <div className="flex gap-4 p-4 bg-card rounded-xl border border-border">
      <img
        src={item.product_image || defaultImage}
        alt={item.product_name}
        className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-heading font-semibold text-sm">{item.product_name}</h3>
        <p className="text-primary font-bold mt-1">${item.price?.toFixed(2)}</p>

        {item.event_name && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-accent">
            <Users className="w-3 h-3" />
            <span>Group: {item.event_name}</span>
          </div>
        )}

        {item.measurement_snapshot && (
          <p className="text-xs text-muted-foreground mt-1">
            Measurements locked: Chest {item.measurement_snapshot.chest}" | Waist {item.measurement_snapshot.waist}"
          </p>
        )}
      </div>
      <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}