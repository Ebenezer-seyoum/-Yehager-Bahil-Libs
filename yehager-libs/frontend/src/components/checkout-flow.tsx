"use client";

import { AlertTriangle, Clock, CreditCard, MapPin, ShieldCheck, Truck } from "lucide-react";
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

function computeEmsShipping(itemCount: number) {
  if (!Number.isFinite(itemCount) || itemCount <= 0) return 0;
  const fullPacks = Math.floor(itemCount / 5);
  const remainder = itemCount % 5;
  let cost = fullPacks * 100;
  if (remainder === 1) cost += 45;
  else if (remainder > 1) cost += 100;
  return cost;
}

function errorMessage(error?: string) {
  if (error === "terms") return "Please agree to tailoring terms before placing your order.";
  if (error === "address") return "Please complete the required shipping address fields.";
  if (error === "pickup") return "Please provide the pickup person's name and phone number.";
  if (error) return "Checkout failed. Please try again.";
  return "";
}

export function CheckoutFlow({ items, event, error, etbRate, startCheckoutAction }: CheckoutFlowProps) {
  const [fulfillmentType, setFulfillmentType] = useState<"mail" | "pickup">("mail");
  const [shipChoice, setShipChoice] = useState("own");
  const [paymentMethod, setPaymentMethod] = useState<"stripe_usd" | "etb_bank_transfer">("stripe_usd");

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

  return (
    <form action={startCheckoutAction} className="grid gap-6 lg:grid-cols-[1fr_350px]">
      <input type="hidden" name="fulfillmentType" value={fulfillmentType} />
      <input type="hidden" name="shipChoice" value={shipChoice} />
      <input type="hidden" name="paymentMethod" value={paymentMethod} />

      <div className="space-y-6">
        {message ? <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{message}</div> : null}

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-bold text-amber-800">Custom Tailoring Notice</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-700">
                All orders require a minimum of one month for custom tailoring and production. We ship via EMS by default; contact us for DHL or UPS arrangements.
              </p>
            </div>
          </div>
        </div>

        {event?.name ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-bold">Event order</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This cart is linked to <span className="font-semibold text-foreground">{event.name}</span>.
            </p>
          </div>
        ) : null}

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-xl font-bold">Delivery Method</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setFulfillmentType("mail")}
              className={`rounded-xl border-2 p-4 text-left transition-colors ${fulfillmentType === "mail" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            >
              <span className="flex items-center gap-2 text-sm font-bold"><Truck className="h-4 w-4 text-primary" /> Mail Delivery</span>
              <span className="mt-1 block text-xs text-muted-foreground">Shipped worldwide with EMS.</span>
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentType("pickup")}
              className={`rounded-xl border-2 p-4 text-left transition-colors ${fulfillmentType === "pickup" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            >
              <span className="flex items-center gap-2 text-sm font-bold"><MapPin className="h-4 w-4 text-primary" /> In-Store Pickup</span>
              <span className="mt-1 block text-xs text-muted-foreground">Pick up in Addis Ababa.</span>
            </button>
          </div>
        </section>

        {fulfillmentType === "mail" ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-xl font-bold">Shipping Carrier</h2>
            <div className="mt-4 rounded-xl border-2 border-primary bg-primary/5 p-4">
              <p className="text-sm font-bold">EMS - Ethiopian Mail Service</p>
              <p className="mt-1 text-xs text-muted-foreground">1 item ≈ $45 · 2-5 items ≈ $100 total · larger orders repeat by package.</p>
              <p className="mt-2 text-xs font-bold text-primary">Estimated: ${shipping.toFixed(2)} for {totalItems} item{totalItems === 1 ? "" : "s"}</p>
            </div>
            <input type="hidden" name="carrier" value="Ethiopian Mail Service" />

            <h3 className="mt-5 text-sm font-bold">Ship To</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setShipChoice("own")} className={`rounded-xl border-2 p-4 text-left ${shipChoice === "own" ? "border-primary bg-primary/10" : "border-border"}`}>
                <span className="text-sm font-bold">My address</span>
                <span className="mt-1 block text-xs text-muted-foreground">Delivered directly to you.</span>
              </button>
              {hasEventAddress ? (
                <button type="button" onClick={() => setShipChoice("event_owner")} className={`rounded-xl border-2 p-4 text-left ${shipChoice === "event_owner" ? "border-primary bg-primary/10" : "border-border"}`}>
                  <span className="text-sm font-bold">Event Owner {event?.ownerName ? `(${event.ownerName})` : ""}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{eventAddressLabel || "Group consolidation address"}</span>
                </button>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-xl font-bold">Pickup Location</h2>
            <select name="pickupLocation" defaultValue="Dember Building - 3rd Floor, Store #369" className="mt-4 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="Dember Building - 3rd Floor, Store #369">Dember Building - 3rd Floor, Store #369</option>
              <option value="Zefmesh Building - 7th Floor, Suite #717">Zefmesh Building - 7th Floor, Suite #717</option>
            </select>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Pickup person name *</span>
                <input name="pickupPersonName" className="h-10 w-full rounded-lg border border-input bg-background px-3" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-muted-foreground">Pickup person phone *</span>
                <input name="pickupPersonPhone" className="h-10 w-full rounded-lg border border-input bg-background px-3" />
              </label>
            </div>
          </section>
        )}

        {fulfillmentType === "mail" && shipChoice === "own" ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-xl font-bold">Shipping Address</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ["full_name", "Full Name", false],
                ["street", "Street Address", true],
                ["city", "City", true],
                ["state", "State / Province", false],
                ["zip", "ZIP / Postal Code", false],
                ["country", "Country", true],
                ["phone", "Phone Number", true],
              ].map(([name, label, required]) => (
                <label key={String(name)} className={`text-sm ${name === "full_name" || name === "street" || name === "phone" ? "sm:col-span-2" : ""}`}>
                  <span className="mb-1 block text-muted-foreground">{label}{required ? <span className="text-destructive"> *</span> : null}</span>
                  <input name={String(name)} className="h-10 w-full rounded-lg border border-input bg-background px-3" />
                </label>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-bold">Custom Tailoring - No Cancellation Policy</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                All garments are custom-made to your measurements. After production begins, the order cannot be cancelled, modified, or refunded unless there is a quality defect or an error on our part.
              </p>
              <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-semibold">
                <input name="agreeTerms" type="checkbox" className="mt-1" />
                <span>I understand and agree that this is a custom tailored order and cannot be cancelled or refunded after production starts.</span>
              </label>
            </div>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-bold">Order Summary</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex gap-3 border-b border-border/60 pb-3 last:border-b-0">
              {item.productImage ? <img src={item.productImage} alt="" className="h-14 w-12 rounded-md object-cover" /> : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{item.productName}</p>
                {item.eventName ? <p className="text-xs text-primary">{item.eventName}</p> : null}
                <p className="text-xs text-muted-foreground">Qty {item.quantity ?? 1}</p>
              </div>
              <p className="text-sm font-bold">${(Number(item.priceUsd ?? 0) * Number(item.quantity ?? 1)).toFixed(2)}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Clothing Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping & Handling</span>
            <span className={shipping === 0 ? "font-semibold text-green-500" : "font-semibold"}>{shipping === 0 ? "Free - Pickup" : `$${shipping.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-3">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-bold text-primary">${total.toFixed(2)}</span>
          </div>
          {totalEtb ? <p className="text-right text-xs text-muted-foreground">≈ {totalEtb.toLocaleString()} ETB</p> : null}
        </div>

        <div className="mt-5 space-y-2 rounded-lg bg-secondary p-3 text-sm">
          <p className="font-bold">Payment Method</p>
          <label className="flex items-center gap-2">
            <input type="radio" checked={paymentMethod === "stripe_usd"} onChange={() => setPaymentMethod("stripe_usd")} />
            <span className="inline-flex items-center gap-1.5"><CreditCard className="h-4 w-4 text-primary" /> Card (Stripe, USD)</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={paymentMethod === "etb_bank_transfer"} onChange={() => setPaymentMethod("etb_bank_transfer")} />
            <span>Bank Transfer (ETB)</span>
          </label>
        </div>

        <button type="submit" className="mt-5 w-full rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          {paymentMethod === "etb_bank_transfer" ? "Continue to ETB Payment" : "Pay with Stripe"}
        </button>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          <span>Secure checkout · Measurements locked to order</span>
        </div>
      </aside>
    </form>
  );
}
