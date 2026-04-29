import { CreditCard, Banknote } from "lucide-react";

const STRIPE_CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$", flag: "🇺🇸", hint: "For international customers", recommended: true },
  { code: "EUR", label: "Euro", symbol: "€", flag: "🇪🇺", hint: "Europe" },
  { code: "GBP", label: "British Pound", symbol: "£", flag: "🇬🇧", hint: "United Kingdom" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", hint: "United Arab Emirates" },
  { code: "SAR", label: "Saudi Riyal", symbol: "﷼", flag: "🇸🇦", hint: "Saudi Arabia" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$", flag: "🇨🇦", hint: "Canada" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$", flag: "🇦🇺", hint: "Australia" },
  { code: "ILS", label: "Israeli Shekel", symbol: "₪", flag: "🇮🇱", hint: "Israel" },
];

// Approximate FX rates vs USD (for display purposes; Stripe handles actual conversion)
const APPROX_FX = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
  CAD: 1.37,
  AUD: 1.54,
  ILS: 3.71,
};

export function getStripeCurrencyInfo(code) {
  return STRIPE_CURRENCIES.find((c) => c.code === code) || STRIPE_CURRENCIES[0];
}

export function convertToStripeCurrency(amountUSD, currencyCode) {
  const rate = APPROX_FX[currencyCode] || 1;
  return amountUSD * rate;
}

export function formatInCurrency(amountUSD, currencyCode) {
  const rate = APPROX_FX[currencyCode] || 1;
  const converted = amountUSD * rate;
  const info = STRIPE_CURRENCIES.find((c) => c.code === currencyCode);
  return `${info?.symbol || ""}${converted.toFixed(2)} ${currencyCode}`;
}

export default function CurrencySelector({ selectedCurrency, onChange, etbRate, totalUSD }) {
  const totalETB = etbRate ? Math.round(totalUSD * etbRate) : null;

  return (
    <div className="p-5 bg-card rounded-xl border-2 border-primary/30 shadow-[0_0_20px_rgba(251,163,20,0.08)]">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">💱</span>
          <h3 className="font-heading font-bold text-lg">Choose Your Payment Currency</h3>
        </div>
        <p className="text-xs text-muted-foreground ml-7">
          Select the currency you'd like to pay in. Ethiopian customers can pay via bank transfer in ETB; all other currencies use Stripe.
        </p>
      </div>

      {/* ETB Option — full width, prominent */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">🇪🇹 Ethiopian Customers</p>
        <label
          className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            selectedCurrency === "ETB"
              ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(251,163,20,0.15)]"
              : "border-border hover:border-primary/40 hover:bg-secondary/50"
          } ${!etbRate ? "opacity-50 pointer-events-none" : ""}`}
        >
          <input
            type="radio"
            name="currency"
            value="ETB"
            checked={selectedCurrency === "ETB"}
            onChange={() => onChange("ETB")}
            disabled={!etbRate}
            className="mt-1 accent-primary"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-primary" />
                  🇪🇹 Ethiopian Birr — ETB
                  <span className="px-2 py-0.5 bg-green-500/15 text-green-400 text-[10px] font-semibold rounded-full border border-green-500/20">Bank Transfer</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Mainly for customers living in Ethiopia · QR code or manual bank transfer</p>
              </div>
              <div className="text-right">
                {totalETB ? (
                  <p className="text-lg font-heading font-bold text-primary">{totalETB.toLocaleString()} <span className="text-sm">ETB</span></p>
                ) : (
                  <p className="text-xs text-muted-foreground">Rate unavailable</p>
                )}
              </div>
            </div>
          </div>
        </label>
      </div>

      {/* Stripe Currencies — grid */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1 flex items-center gap-1.5">
          <CreditCard className="w-3 h-3" /> International Customers — Stripe
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {STRIPE_CURRENCIES.map((cur) => {
            const rate = APPROX_FX[cur.code] || 1;
            const converted = (totalUSD * rate).toFixed(2);
            const isSelected = selectedCurrency === cur.code;

            return (
              <label
                key={cur.code}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/8 shadow-[0_0_8px_rgba(251,163,20,0.12)]"
                    : "border-border hover:border-primary/30 hover:bg-secondary/40"
                }`}
              >
                <input
                  type="radio"
                  name="currency"
                  value={cur.code}
                  checked={isSelected}
                  onChange={() => onChange(cur.code)}
                  className="accent-primary flex-shrink-0"
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xl leading-none">{cur.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm flex items-center gap-1.5 flex-wrap">
                      {cur.label}
                      {cur.recommended && (
                        <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[9px] font-bold rounded-full">DEFAULT</span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{cur.hint}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-primary">{cur.symbol}{converted}</p>
                  <p className="text-[10px] text-muted-foreground">{cur.code}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Footer note */}
      <div className="mt-4 flex items-start gap-2 text-[11px] text-muted-foreground">
        <span className="flex-shrink-0 mt-0.5">ℹ️</span>
        <span>
          Non-USD Stripe amounts shown are <strong className="text-foreground/70">approximate</strong> — Stripe applies the exact live exchange rate at checkout. ETB prices use our daily rate.
        </span>
      </div>
    </div>
  );
}