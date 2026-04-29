import { CreditCard, Banknote } from "lucide-react";

export default function PaymentMethodSelector({ value, onChange, etbRate, totalUSD }) {
  const totalETB = etbRate ? Math.round(totalUSD * etbRate) : null;

  return (
    <div className="p-5 bg-card rounded-xl border border-border">
      <h3 className="font-heading font-semibold mb-1">Payment Method</h3>
      <p className="text-xs text-muted-foreground mb-4">Select how you would like to pay for your order</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* USD / Stripe */}
        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${value === "stripe_usd" ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
          <input
            type="radio"
            name="payment_method"
            value="stripe_usd"
            checked={value === "stripe_usd"}
            onChange={() => onChange("stripe_usd")}
            className="mt-0.5"
          />
          <div className="flex-1">
            <p className="font-medium text-sm flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-primary" /> Pay in USD
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">For international customers — secure card payment via Stripe.</p>
            <p className="text-sm font-bold text-primary mt-2">${totalUSD.toFixed(2)} USD</p>
          </div>
        </label>

        {/* ETB / Bank transfer */}
        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${value === "etb_bank_transfer" ? "border-primary bg-primary/5" : "border-border hover:border-border/80"} ${!etbRate ? "opacity-50 pointer-events-none" : ""}`}>
          <input
            type="radio"
            name="payment_method"
            value="etb_bank_transfer"
            checked={value === "etb_bank_transfer"}
            onChange={() => onChange("etb_bank_transfer")}
            disabled={!etbRate}
            className="mt-0.5"
          />
          <div className="flex-1">
            <p className="font-medium text-sm flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-primary" /> Pay in Ethiopian Birr (ETB)
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Mainly for customers residing in Ethiopia — pay via bank QR transfer.</p>
            {totalETB ? (
              <p className="text-sm font-bold text-primary mt-2">{totalETB.toLocaleString()} ETB</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">Exchange rate unavailable</p>
            )}
          </div>
        </label>
      </div>
    </div>
  );
}