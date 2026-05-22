"use client";

import { AlertTriangle, Banknote, CreditCard, DollarSign, Info, Mail, MapPin, ShieldCheck, Truck } from "lucide-react";
import { useMemo, useState } from "react";

type CartItem = {
  id: string;
  productName: string;
  productImage?: string | null;
  priceUsd?: number | null;
  quantity?: number | null;
  eventId?: string | null;
  eventName?: string | null;
};

type Event = {
  id: string;
  name?: string | null;
  ownerName?: string | null;
  shippingAddress?: Record<string, unknown> | null;
};

type CheckoutFlowProps = {
  items: CartItem[];
  event: Event | null;
  error?: string;
  etbRate: number | null;
  startCheckoutAction: (formData: FormData) => void | Promise<void>;
};

const STRIPE_CURRENCIES = [
  { code: "USD", country: "US", name: "US Dollar", region: "For international customers", symbol: "$", rate: 1, default: true },
  { code: "EUR", country: "EU", name: "Euro", region: "Europe", symbol: "€", rate: 0.92 },
  { code: "GBP", country: "GB", name: "British Pound", region: "United Kingdom", symbol: "£", rate: 0.79 },
  { code: "AED", country: "AE", name: "UAE Dirham", region: "United Arab Emirates", symbol: "د.إ", rate: 3.67, suffix: true },
  { code: "SAR", country: "SA", name: "Saudi Riyal", region: "Saudi Arabia", symbol: "ريال", rate: 3.75, suffix: true },
  { code: "CAD", country: "CA", name: "Canadian Dollar", region: "Canada", symbol: "CA$", rate: 1.37 },
  { code: "AUD", country: "AU", name: "Australian Dollar", region: "Australia", symbol: "A$", rate: 1.54 },
  { code: "ILS", country: "IL", name: "Israeli Shekel", region: "Israel", symbol: "₪", rate: 3.71 },
];

function computeEmsShipping(itemCount: number) {
  if (!Number.isFinite(itemCount) || itemCount <= 0) return 0;
  const fullPacks = Math.floor(itemCount / 5);
  const remainder = itemCount % 5;
  let cost = fullPacks * 100;
  if (remainder === 1) cost += 45;
  else if (remainder > 1) cost += 100;
  return cost;
}

function emsRateText(itemCount: number) {
  const fullPacks = Math.floor(itemCount / 5);
  const remainder = itemCount % 5;
  return `EMS rate: ${itemCount} item${itemCount === 1 ? "" : "s"} · ${fullPacks} full pack${fullPacks === 1 ? "" : "s"} + ${remainder} extra`;
}

function errorMessage(error?: string) {
  if (error === "terms") return "Please agree to tailoring terms before placing your order.";
  if (error === "address") return "Please complete the required shipping address fields.";
  if (error === "pickup") return "Please provide the pickup person's name and phone number.";
  if (error) return "Checkout failed. Please try again.";
  return "";
}

function formatCurrency(amount: number, currencyCode = "USD", symbol = "$", suffix = false) {
  const value = amount.toFixed(2);
  if (currencyCode === "USD") return `$${value}`;
  if (suffix) return `${value}${symbol}`;
  return `${symbol}${value}`;
}

function SelectDot({ selected }: { selected: boolean }) {
  return <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${selected ? "border-primary bg-primary shadow-[inset_0_0_0_4px_#050505]" : "border-white bg-white"}`} />;
}

export function CheckoutFlow({ items, event, error, etbRate, startCheckoutAction }: CheckoutFlowProps) {
  const [fulfillmentType, setFulfillmentType] = useState<"mail" | "pickup">("mail");
  const [shipChoice, setShipChoice] = useState("own");
  const [paymentMethod, setPaymentMethod] = useState<"stripe_usd" | "etb_bank_transfer">("stripe_usd");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [tailorNote, setTailorNote] = useState("");

  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity ?? 1), 0);
  const subtotal = items.reduce((sum, item) => sum + Number(item.priceUsd ?? 0) * Number(item.quantity ?? 1), 0);
  const shipping = fulfillmentType === "mail" ? computeEmsShipping(totalItems) : 0;
  const total = subtotal + shipping;
  const totalEtb = etbRate ? Math.round(total * etbRate) : null;
  const message = errorMessage(error);
  const hasEventAddress = Boolean(event?.shippingAddress);

  const eventAddressLabel = useMemo(() => {
    const address = event?.shippingAddress;
    if (!address) return "";
    return [address.city, address.country].filter(Boolean).join(", ");
  }, [event?.shippingAddress]);

  const payLabel = paymentMethod === "etb_bank_transfer"
    ? `Continue to ETB Payment${totalEtb ? ` (${totalEtb.toLocaleString()} ETB)` : ""}`
    : `Pay $${total.toFixed(2)} USD with Stripe`;

  function chooseStripeCurrency(code: string) {
    setSelectedCurrency(code);
    setPaymentMethod("stripe_usd");
  }

  return (
    <form action={startCheckoutAction} className="space-y-6">
      <input type="hidden" name="fulfillmentType" value={fulfillmentType} />
      <input type="hidden" name="shipChoice" value={shipChoice} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />
      <input type="hidden" name="selectedCurrency" value={selectedCurrency} />
      <input type="hidden" name="tailorNote" value={tailorNote} />

      {message ? <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{message}</div> : null}

      <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-orange-700">
        <div className="flex items-start gap-4">
          <ClockIcon />
          <div>
            <p className="text-sm font-semibold">Custom Tailoring Notice</p>
            <p className="mt-1 text-xs leading-relaxed">
              All orders require a minimum of one month for custom tailoring and production. We ship via EMS (Ethiopian Mail Service). Due to their high costs, DHL and UPS are not offered by default - if you prefer DHL or UPS, please contact us and we will make the necessary arrangements.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-heading font-semibold mb-4">Delivery Method</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setFulfillmentType("mail")} className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${fulfillmentType === "mail" ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
            <SelectDot selected={fulfillmentType === "mail"} />
            <div>
              <p className="font-medium text-sm flex items-center gap-1.5"><Truck className="h-4 w-4 text-primary" /> Mail Delivery</p>
              <p className="text-xs text-muted-foreground">Shipped to your address worldwide</p>
            </div>
          </button>
          <button type="button" onClick={() => setFulfillmentType("pickup")} className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors ${fulfillmentType === "pickup" ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
            <SelectDot selected={fulfillmentType === "pickup"} />
            <div>
              <p className="font-medium text-sm flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> In-Store Pickup</p>
              <p className="text-xs text-muted-foreground">Pick up from our Addis Ababa locations</p>
            </div>
          </button>
        </div>
      </section>

      {fulfillmentType === "mail" ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading font-semibold mb-4">Shipping Carrier</h3>
          <div className="rounded-xl border-2 border-primary bg-primary/5 p-3">
            <div className="flex gap-4">
              <SelectDot selected />
              <div>
                <p className="font-medium text-sm">EMS - Ethiopian Mail Service</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Rates calculated by weight - the more items you order, the cheaper per item. 1 item ≈ $45 · 2-5 items ≈ $100 total</p>
                <p className="mt-1 text-xs font-semibold text-primary">Estimated: ${shipping.toFixed(2)} for {totalItems} item{totalItems === 1 ? "" : "s"}</p>
              </div>
            </div>
          </div>
          <input type="hidden" name="carrier" value="Ethiopian Mail Service" />
          <p className="mt-4 text-xs text-muted-foreground">
            Due to their high shipping costs, DHL and UPS are not offered by default. If you prefer DHL or UPS, please <a href="mailto:support@yehagerbahillibs.com" className="font-semibold text-primary underline">contact us</a> and we will make the necessary adjustments.
          </p>

          <h4 className="mt-5 text-sm font-semibold">Ship To</h4>
          <div className="mt-3 grid gap-3">
            <button type="button" onClick={() => setShipChoice("own")} className={`rounded-xl border-2 p-3 text-left ${shipChoice === "own" ? "border-primary bg-primary/5" : "border-border"}`}>
              <span className="flex items-center gap-3 text-sm font-medium"><SelectDot selected={shipChoice === "own"} />My address</span>
              <span className="ml-7 mt-1 block text-xs text-muted-foreground">Delivered directly to you</span>
            </button>
            {hasEventAddress ? (
              <button type="button" onClick={() => setShipChoice("event_owner")} className={`rounded-xl border-2 p-3 text-left ${shipChoice === "event_owner" ? "border-primary bg-primary/5" : "border-border"}`}>
                <span className="flex items-center gap-3 text-sm font-medium"><SelectDot selected={shipChoice === "event_owner"} />Event Owner {event?.ownerName ? `(${event.ownerName})` : ""}</span>
                <span className="ml-7 mt-1 block text-xs text-muted-foreground">{eventAddressLabel || "Group consolidation address"}</span>
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading font-semibold mb-4">Pickup Location</h3>
          <select name="pickupLocation" defaultValue="Dember Building - 3rd Floor, Store #369" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="Dember Building - 3rd Floor, Store #369">Dember Building - 3rd Floor, Store #369</option>
            <option value="Zefmesh Building - 7th Floor, Suite #717">Zefmesh Building - 7th Floor, Suite #717</option>
          </select>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <CheckoutInput name="pickupPersonName" label="Pickup person name" required />
            <CheckoutInput name="pickupPersonPhone" label="Pickup person phone" required />
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-heading font-semibold mb-4">Order Summary</h3>
        <div className="space-y-2 mb-4">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span>{item.productName}</span>
              <span className="font-medium">${(Number(item.priceUsd ?? 0) * Number(item.quantity ?? 1)).toFixed(2)} USD</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-4 space-y-2">
          <SummaryLine label="Clothing Subtotal" value={`$${subtotal.toFixed(2)} USD`} />
          <SummaryLine label="Shipping & Handling" value={fulfillmentType === "pickup" ? "Free - Pickup" : `$${shipping.toFixed(2)} USD`} />
          {fulfillmentType === "mail" ? <p className="text-[10px] text-muted-foreground leading-relaxed">{emsRateText(totalItems)}</p> : null}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
          <span className="font-bold text-base">Total</span>
          <span className="font-heading text-4xl font-bold text-primary">${total.toFixed(2)} USD</span>
        </div>
      </section>

      {fulfillmentType === "mail" && shipChoice === "own" ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-heading font-semibold mb-4">Shipping Address</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CheckoutInput name="full_name" label="Full Name" className="sm:col-span-2" defaultValue="" />
            <CheckoutInput name="street" label="Street Address" required className="sm:col-span-2" />
            <CheckoutInput name="city" label="City" required />
            <CheckoutInput name="state" label="State / Province" />
            <CheckoutInput name="zip" label="ZIP / Postal Code" />
            <CheckoutInput name="country" label="Country" required />
            <CheckoutInput name="phone" label="Phone Number" required className="sm:col-span-2" />
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border-2 border-primary/50 bg-primary/5 p-5">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
            <h2 className="text-sm font-semibold text-foreground">Custom Tailoring - No Cancellation Policy</h2>
            <p>All garments at <strong>Yehager Bahil Libs</strong> are <strong>100% custom-made and hand-tailored</strong> to your exact measurements. Once your order is placed:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Our tailors in Ethiopia begin <strong>cutting, embroidering, and assembling</strong> your garment within 1-3 business days.</li>
              <li>After <strong>3 business days</strong>, your order <strong>cannot be cancelled, modified, or refunded</strong> - the fabric has been cut and tailored specifically for you.</li>
              <li>If there is a quality defect or error on our part, we will remake the garment at no cost.</li>
              <li>All sales are final once production begins. Please double-check your measurements before confirming.</li>
            </ul>
            <p><strong className="text-foreground">Adjustments & Returns:</strong> After you receive your mailed/shipped garment, if you need any size adjustments or other alterations, you may send the clothing back to us using a <strong>paid return mail package</strong> of your choice. Once we receive it, our tailors will fix or adjust all the items and ship them back to you. This applies to all garments we have mailed or sent to you.</p>
            <p className="font-bold text-foreground">By placing this order, you acknowledge and accept these terms in full.</p>
            <label className="flex cursor-pointer items-start gap-4 text-sm font-semibold text-foreground">
              <input name="agreeTerms" type="checkbox" className="mt-1 h-7 w-7 rounded border-border bg-black" />
              <span>I understand and agree that this is a custom tailored order and cannot be cancelled or refunded after 3 business days of production starting.</span>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-xl border-2 border-primary/50 bg-primary/5 p-5">
        <div className="flex items-start gap-4">
          <Mail className="mt-1 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-primary">Message to Our Tailors</h2>
            <p className="mt-1 text-xs italic text-primary">(Optional)</p>
            <p className="mt-4 text-xs leading-relaxed text-yellow-200">Share any fit preferences, design details, or special instructions - our tailors will read this before starting your garment.</p>
            <textarea
              name="checkoutTailorNote"
              value={tailorNote}
              maxLength={500}
              onChange={(event) => setTailorNote(event.target.value)}
              className="mt-4 min-h-60 w-full resize-none rounded-xl border-2 border-primary/70 bg-black p-4 text-sm outline-none transition focus:border-primary"
              placeholder={`e.g.\n• "Prefer a relaxed fit in the shoulders"\n• "Add a chest pocket on the left side"\n• "Wider collar than standard"\n• "Make the sleeves slightly longer"`}
            />
            <p className="mt-3 text-right text-sm font-semibold text-muted-foreground">{tailorNote.length} / 500</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border-2 border-primary/40 bg-card p-5">
        <div className="flex items-start gap-4">
          <DollarSign className="mt-1 h-5 w-5 text-primary" />
          <div className="flex-1">
            <h2 className="font-heading text-sm font-semibold">Choose Your Payment Currency</h2>
            <p className="mt-2 text-xs leading-snug text-muted-foreground">Select the currency you&apos;d like to pay in. Ethiopian customers can pay via bank transfer in ETB; all other currencies use Stripe.</p>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">ET Ethiopian Customers</p>
            <CurrencyChoice
              selected={paymentMethod === "etb_bank_transfer"}
              onClick={() => {
                setPaymentMethod("etb_bank_transfer");
                setSelectedCurrency("ETB");
              }}
              left="ET"
              title="Ethiopian Birr - ETB"
              subtitle="Mainly for customers living in Ethiopia · QR code or manual bank transfer"
              amount={totalEtb ? `${totalEtb.toLocaleString()} ETB` : "ETB"}
              badge="Bank Transfer"
              full
            />

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">International Customers - Stripe</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {STRIPE_CURRENCIES.map((currency) => (
                <CurrencyChoice
                  key={currency.code}
                  selected={paymentMethod === "stripe_usd" && selectedCurrency === currency.code}
                  onClick={() => chooseStripeCurrency(currency.code)}
                  left={currency.country}
                  title={currency.name}
                  subtitle={currency.region}
                  amount={formatCurrency(total * currency.rate, currency.code, currency.symbol, currency.suffix)}
                  code={currency.code}
                  badge={currency.default ? "Default" : undefined}
                />
              ))}
            </div>
            <p className="mt-4 flex items-start gap-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
              <span>Non-USD Stripe amounts shown are <strong className="text-foreground">approximate</strong> - Stripe applies the exact live exchange rate at checkout. ETB prices use our daily rate.</span>
            </p>
          </div>
        </div>
      </section>

      <button type="submit" className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
        <CreditCard className="h-5 w-5" />
        {payLabel}
      </button>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-5 w-5" />
        <span>{paymentMethod === "etb_bank_transfer" ? "Secure ETB bank transfer · Payment proof required · Measurements locked to order" : "Secure Stripe checkout · Encrypted payments · Measurements locked to order"}</span>
      </div>
    </form>
  );
}

function ClockIcon() {
  return (
    <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-orange-700 text-orange-700">
      <span className="h-2 w-2 rounded-full border-l-2 border-t-2 border-current" />
    </span>
  );
}

function CheckoutInput({ name, label, required, className = "", defaultValue = "" }: { name: string; label: string; required?: boolean; className?: string; defaultValue?: string }) {
  return (
    <label className={`text-xs font-medium text-muted-foreground ${className}`}>
      <span>
        {label} {required ? <span className="text-destructive">*</span> : null}
      </span>
      <input name={name} defaultValue={defaultValue} className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary" />
    </label>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

function CurrencyChoice({
  selected,
  onClick,
  left,
  title,
  subtitle,
  amount,
  code,
  badge,
  full,
}: {
  selected: boolean;
  onClick: () => void;
  left: string;
  title: string;
  subtitle: string;
  amount: string;
  code?: string;
  badge?: string;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-3 flex min-h-24 w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${selected ? "border-primary bg-primary/10" : "border-border bg-background/30 hover:border-primary/50"} ${full ? "sm:col-span-2" : ""}`}
    >
      <SelectDot selected={selected} />
      <span className="text-sm font-semibold">{left}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">
          {title} {badge ? <span className="ml-2 rounded-full bg-green-500/20 px-3 py-1 text-[10px] font-bold uppercase text-green-400">{badge}</span> : null}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-semibold text-primary">{amount}</span>
        {code ? <span className="text-sm text-muted-foreground">{code}</span> : null}
      </span>
    </button>
  );
}
