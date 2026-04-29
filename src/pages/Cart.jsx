import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import CartItemCard from "../components/CartItemCard";
import { useT } from "@/lib/i18n/I18nContext";

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { t } = useT();

  useEffect(() => {
    const load = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) {
        setLoading(false);
        return;
      }
      const me = await base44.auth.me();
      setUser(me);
      const cartItems = await base44.entities.CartItem.filter({ user_email: me.email });
      setItems(cartItems);
      setLoading(false);
    };
    load();
  }, []);

  const handleRemove = async (itemId) => {
    await base44.entities.CartItem.delete(itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    toast.success(t("cart.itemRemoved"));
  };

  const total = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="font-heading text-2xl font-bold mb-2">{t("cart.signInToView")}</h2>
        <p className="text-muted-foreground mb-6">{t("cart.signInDesc")}</p>
        <Button onClick={() => base44.auth.redirectToLogin()}>{t("general.signIn")}</Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="font-heading text-2xl font-bold mb-2">{t("cart.empty")}</h2>
        <p className="text-muted-foreground mb-6">{t("cart.emptyDesc")}</p>
        <Button asChild>
          <Link to="/catalog">{t("cart.browseCollection")}</Link>
        </Button>
      </div>
    );
  }

  const eventItems = items.filter((i) => i.event_name);
  const individualItems = items.filter((i) => !i.event_name);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="font-heading text-3xl font-bold mb-8">{t("cart.title")}</h1>

      <div className="space-y-4">
        {eventItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-3">{t("cart.groupEventItems")}</p>
            <div className="space-y-3">
              {eventItems.map((item) => (
                <CartItemCard key={item.id} item={item} onRemove={handleRemove} />
              ))}
            </div>
          </div>
        )}

        {individualItems.length > 0 && (
          <div>
            {eventItems.length > 0 && (
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6">
                {t("cart.individualItems")}
              </p>
            )}
            <div className="space-y-3">
              {individualItems.map((item) => (
                <CartItemCard key={item.id} item={item} onRemove={handleRemove} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 p-6 bg-card rounded-2xl border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground">{t("cart.subtotal")} ({items.length} {t("cart.items")})</span>
          <span className="text-2xl font-bold">${total.toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">{t("cart.shippingAtCheckout")}</p>
        <Button asChild size="lg" className="w-full gap-2">
          <Link to="/checkout">
            {t("cart.proceedToCheckout")} <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}