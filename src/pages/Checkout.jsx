import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Clock, AlertTriangle, CreditCard, MapPin, Truck } from "lucide-react";
import { calcEMSShipping } from "@/lib/shipping";
import { toast } from "sonner";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import CurrencySelector, { formatInCurrency, getStripeCurrencyInfo } from "../components/checkout/CurrencySelector";
import EtbPayment from "../components/checkout/EtbPayment";

export default function Checkout() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [shipChoice, setShipChoice] = useState("own"); // "own" | "event_owner" | "pickup"
  const [fulfillmentType, setFulfillmentType] = useState("mail"); // "mail" | "pickup"
  const [carrier, setCarrier] = useState("Ethiopian Mail Service");
  const [pickupLocation, setPickupLocation] = useState("Dember Building – 3rd Floor, Store #369");
  const [pickupPerson, setPickupPerson] = useState({ name: "", phone: "" });
  const [address, setAddress] = useState({ full_name: "", street: "", city: "", state: "", zip: "", country: "", phone: "" });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [flashFields, setFlashFields] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [orderNumber] = useState(() => "YBL-" + Date.now().toString(36).toUpperCase());
  const { rate: etbRate } = useExchangeRate();

  useEffect(() => {
    const load = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) { base44.auth.redirectToLogin(); return; }
      const me = await base44.auth.me();
      setUser(me);
      setAddress((prev) => ({ ...prev, full_name: me.full_name }));
      const cartItems = await base44.entities.CartItem.filter({ user_email: me.email });
      setItems(cartItems);
      const eventItem = cartItems.find((i) => i.event_id);
      if (eventItem) {
        const events = await base44.entities.Event.filter({ id: eventItem.event_id });
        if (events.length > 0) setEventData(events[0]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const clothingSubtotal = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
  const totalItems = items.reduce((s, i) => s + (i.quantity || 1), 0);
  const isEMS = fulfillmentType === "mail" && carrier === "Ethiopian Mail Service";
  const shippingCost = isEMS ? calcEMSShipping(totalItems) : 0;
  const total = clothingSubtotal + shippingCost;
  const totalETB = etbRate ? Math.round(total * etbRate) : null;
  const isETB = selectedCurrency === "ETB";

  const computedShippingAddress = fulfillmentType === "pickup"
    ? null
    : shipChoice === "event_owner" && eventData?.shipping_address
      ? eventData.shipping_address
      : address;

  const validateForETB = () => {
    if (!agreedToTerms) {
      toast.error("Please agree to the custom tailoring terms before continuing");
      return false;
    }
    if (fulfillmentType === "mail" && shipChoice === "own") {
      const missing = [];
      if (!address.street) missing.push("street");
      if (!address.city) missing.push("city");
      if (!address.country) missing.push("country");
      if (!address.phone) missing.push("phone");
      if (missing.length > 0) {
        toast.error("Please fill in all required fields");
        setFlashFields(missing);
        setTimeout(() => setFlashFields([]), 2000);
        return false;
      }
    }
    if (fulfillmentType === "pickup") {
      if (!pickupPerson.name.trim() || !pickupPerson.phone.trim()) {
        toast.error("Please enter the pickup person's name and phone number");
        return false;
      }
    }
    return true;
  };

  const [showEtbFlow, setShowEtbFlow] = useState(false);

  const handleSubmit = async () => {
    if (!agreedToTerms) {
      toast.error("Please agree to the custom tailoring terms before placing your order");
      return;
    }
    if (fulfillmentType === "mail" && shipChoice === "own") {
      const missing = [];
      if (!address.street) missing.push("street");
      if (!address.city) missing.push("city");
      if (!address.country) missing.push("country");
      if (!address.phone) missing.push("phone");
      if (missing.length > 0) {
        toast.error("Please fill in all required fields");
        setFlashFields(missing);
        setTimeout(() => setFlashFields([]), 2000);
        return;
      }
    }
    if (fulfillmentType === "pickup") {
      if (!pickupPerson.name.trim() || !pickupPerson.phone.trim()) {
        toast.error("Please enter the pickup person's name and phone number");
        return;
      }
    }
    setSubmitting(true);
    const shippingAddress = fulfillmentType === "pickup"
      ? null
      : shipChoice === "event_owner" && eventData?.shipping_address
        ? eventData.shipping_address
        : address;

    const res = await base44.functions.invoke('createCheckoutSession', {
      items,
      total,
      shippingCost,
      shippingAddress,
      eventData,
      shipChoice,
      orderNumber,
      fulfillmentType,
      currency: selectedCurrency.toLowerCase(),
      carrier: fulfillmentType === "pickup" ? "pickup" : carrier,
      pickupLocation: fulfillmentType === "pickup" ? pickupLocation : null,
      pickupPersonName: fulfillmentType === "pickup" ? pickupPerson.name : null,
      pickupPersonPhone: fulfillmentType === "pickup" ? pickupPerson.phone : null,
    });

    if (res.data?.url) {
      window.location.href = res.data.url;
    } else {
      toast.error("Failed to create checkout session. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="font-heading text-3xl font-bold mb-8">Checkout</h1>

      {/* Production Notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl mb-6">
        <Clock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Custom Tailoring Notice</p>
          <p className="text-xs text-amber-700 mt-0.5">
            All orders require a <strong>minimum of one month</strong> for custom tailoring and production.
            We ship via <strong>EMS (Ethiopian Mail Service)</strong>. Due to their high costs, DHL and UPS are not offered by default — if you prefer DHL or UPS, please contact us and we will make the necessary arrangements.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Fulfillment Type — FIRST so total is correct when shown */}
        <div className="p-5 bg-card rounded-xl border border-border">
          <h3 className="font-heading font-semibold mb-4">Delivery Method</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${fulfillmentType === "mail" ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
              <input type="radio" name="fulfillment" value="mail" checked={fulfillmentType === "mail"} onChange={() => setFulfillmentType("mail")} className="mt-0.5" />
              <div>
                <p className="font-medium text-sm flex items-center gap-1.5"><Truck className="w-4 h-4 text-primary" /> Mail Delivery</p>
                <p className="text-xs text-muted-foreground">Shipped to your address worldwide</p>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${fulfillmentType === "pickup" ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
              <input type="radio" name="fulfillment" value="pickup" checked={fulfillmentType === "pickup"} onChange={() => setFulfillmentType("pickup")} className="mt-0.5" />
              <div>
                <p className="font-medium text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> In-Store Pickup</p>
                <p className="text-xs text-muted-foreground">Pick up from our Addis Ababa locations</p>
              </div>
            </label>
          </div>
        </div>

        {/* Mail Options */}
        {fulfillmentType === "mail" && (
          <div className="p-5 bg-card rounded-xl border border-border">
            <h3 className="font-heading font-semibold mb-4">Shipping Carrier</h3>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 rounded-xl border-2 border-primary bg-primary/5 cursor-default">
                <input type="radio" name="carrier" value="Ethiopian Mail Service" checked readOnly className="mt-0.5" />
                <div>
                  <span className="text-sm font-medium">EMS — Ethiopian Mail Service</span>
                  <p className="text-xs text-muted-foreground mt-0.5">Rates calculated by weight — the more items you order, the cheaper per item. 1 item ≈ $45 · 2–5 items ≈ $100 total</p>
                  {shippingCost > 0 && (
                    <p className="text-xs font-semibold text-primary mt-1">Estimated: ${shippingCost.toFixed(2)} for {totalItems} item{totalItems !== 1 ? "s" : ""}</p>
                  )}
                </div>
              </label>
              <p className="text-xs text-muted-foreground px-1">
                Due to their high shipping costs, DHL and UPS are not offered by default. If you prefer DHL or UPS, please <a href="mailto:support@yehagerbahillibs.com" className="text-primary underline">contact us</a> and we will make the necessary adjustments.
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-semibold">Ship To</h4>
              {["own", ...(eventData?.shipping_address?.street ? ["event_owner"] : [])].map((opt) => (
                <label key={opt} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${shipChoice === opt ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
                  <input type="radio" name="ship" value={opt} checked={shipChoice === opt} onChange={() => setShipChoice(opt)} className="mt-0.5" />
                  <div>
                    {opt === "own" ? (
                      <><p className="font-medium text-sm">My address</p><p className="text-xs text-muted-foreground">Delivered directly to you</p></>
                    ) : (
                      <><p className="font-medium text-sm">Event Owner ({eventData.owner_name})</p><p className="text-xs text-muted-foreground">{eventData.shipping_address.city}, {eventData.shipping_address.country} — group consolidation</p></>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Pickup Options */}
        {fulfillmentType === "pickup" && (
          <div className="p-5 bg-card rounded-xl border border-border space-y-4">
            <h3 className="font-heading font-semibold">Pickup Location</h3>
            <div className="space-y-3">
              {[
                "Dember Building – 3rd Floor, Store #369",
                "Zefmesh Building – 7th Floor, Suite #717"
              ].map((loc) => (
                <label key={loc} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${pickupLocation === loc ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
                  <input type="radio" name="pickup_loc" value={loc} checked={pickupLocation === loc} onChange={() => setPickupLocation(loc)} className="mt-0.5" />
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{loc}</p>
                    <p className="text-xs text-muted-foreground">Addis Ababa, Ethiopia</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-sm font-semibold">Pickup Person Details</h4>
              <p className="text-xs text-muted-foreground">Enter the name and phone of the person who will pick up the garment. This can be you or a friend/family member. They must bring a valid ID.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Full Name <span className="text-red-500">*</span></label>
                  <input className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g. Abebe Bekele" value={pickupPerson.name} onChange={(e) => setPickupPerson({ ...pickupPerson, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone Number <span className="text-red-500">*</span></label>
                  <input className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g. +251 911 000 000" value={pickupPerson.phone} onChange={(e) => setPickupPerson({ ...pickupPerson, phone: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Summary — shown after delivery method is selected */}
        <div className="p-5 bg-card rounded-xl border border-border">
          <h3 className="font-heading font-semibold mb-4">
            Order Summary{" "}
            {selectedCurrency !== "USD" && (
              <span className="text-xs font-normal text-primary">
                (prices in {selectedCurrency})
              </span>
            )}
          </h3>
          <div className="space-y-2 mb-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div>
                  <span>{item.product_name}</span>
                  {item.event_name && <span className="ml-2 text-xs text-primary">[{item.event_name}]</span>}
                </div>
                <span className="font-medium">
                  {isETB && etbRate
                    ? `${Math.round((item.price || 0) * etbRate).toLocaleString()} ETB`
                    : formatInCurrency(item.price || 0, selectedCurrency)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Clothing Subtotal</span>
              <span className="font-medium">
                {isETB && etbRate
                  ? `${Math.round(clothingSubtotal * etbRate).toLocaleString()} ETB`
                  : formatInCurrency(clothingSubtotal, selectedCurrency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Shipping & Handling</span>
              <span className={`font-medium ${shippingCost === 0 ? "text-green-500" : ""}`}>
                {fulfillmentType === "pickup"
                  ? <span className="text-green-500">Free — In-Store Pickup</span>
                  : shippingCost === 0
                    ? "TBD at shipment"
                    : isETB && etbRate
                      ? `${Math.round(shippingCost * etbRate).toLocaleString()} ETB`
                      : formatInCurrency(shippingCost, selectedCurrency)}
              </span>
            </div>
            {isEMS && (
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                EMS rate: {totalItems} item{totalItems !== 1 ? "s" : ""} · {Math.floor(totalItems / 5)} full pack{Math.floor(totalItems/5) !== 1 ? "s" : ""}{totalItems % 5 > 0 ? ` + ${totalItems % 5} extra` : ""}
              </p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="font-bold text-base">Total</span>
              <span className="text-2xl font-heading font-bold text-primary">
                {isETB && totalETB
                  ? `${totalETB.toLocaleString()} ETB`
                  : formatInCurrency(total, selectedCurrency)}
              </span>
            </div>
            {isETB && etbRate && (
              <p className="text-[11px] text-muted-foreground text-right">
                ≈ ${total.toFixed(2)} USD · Rate: 1 USD = {etbRate} ETB
              </p>
            )}
            {!isETB && selectedCurrency !== "USD" && (
              <p className="text-[11px] text-muted-foreground text-right">
                ≈ ${total.toFixed(2)} USD · Stripe applies live rate at checkout
              </p>
            )}
          </div>
        </div>

        {/* Address form */}
        {fulfillmentType === "mail" && shipChoice === "own" && (
          <div className="p-5 bg-card rounded-xl border border-border space-y-4">
            <h3 className="font-heading font-semibold">Shipping Address</h3>
            <style>{`
              @keyframes blink-red {
                0%, 100% { border-color: hsl(var(--input)); }
                25%, 75% { border-color: #ef4444; box-shadow: 0 0 0 2px rgba(239,68,68,0.3); }
                50% { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(239,68,68,0.4); }
              }
              .field-error { animation: blink-red 0.4s ease-in-out 4; border-color: #ef4444 !important; }
            `}</style>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "full_name", label: "Full Name", cols: 2, required: false },
                { key: "street", label: "Street Address", cols: 2, required: true },
                { key: "city", label: "City", cols: 1, required: true },
                { key: "state", label: "State / Province", cols: 1, required: false },
                { key: "zip", label: "ZIP / Postal Code", cols: 1, required: false },
                { key: "country", label: "Country", cols: 1, required: true },
                { key: "phone", label: "Phone Number", cols: 2, required: true },
              ].map(({ key, label, cols, required }) => (
                <div key={key} className={cols === 2 ? "sm:col-span-2" : ""}>
                  <label className="text-xs font-medium text-muted-foreground">
                    {label}{required && <span className="text-red-500 ml-0.5 font-bold">*</span>}
                  </label>
                  <input
                    className={`mt-1 w-full h-10 rounded-lg border bg-background px-3 text-sm transition-all ${
                      flashFields.includes(key) && required && !address[key]
                        ? "field-error border-red-500"
                        : "border-input"
                    }`}
                    value={address[key]}
                    onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Currency / Payment Method Selector */}
        <CurrencySelector
          selectedCurrency={selectedCurrency}
          onChange={setSelectedCurrency}
          etbRate={etbRate}
          totalUSD={total}
        />

        {/* Custom Tailoring Terms Agreement */}
        <div className={`p-5 rounded-2xl border-2 transition-all ${
          agreedToTerms ? "border-primary bg-primary/5" : "border-amber-500/50 bg-amber-500/5"
        }`}>
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground mb-2">Custom Tailoring — No Cancellation Policy</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                All garments at <strong>Yehager Bahil Libs</strong> are <strong>100% custom-made and hand-tailored</strong> to your exact measurements.
                Once your order is placed:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 mb-3 ml-3 list-disc">
                <li>Our tailors in Ethiopia begin <strong>cutting, embroidering, and assembling</strong> your garment within 1–3 business days.</li>
                <li>After <strong>3 business days</strong>, your order <strong>cannot be cancelled, modified, or refunded</strong> — the fabric has been cut and tailored specifically for you.</li>
                <li>If there is a quality defect or error on our part, we will remake the garment at no cost.</li>
                <li>All sales are final once production begins. Please double-check your measurements before confirming.</li>
              </ul>
              <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                <strong className="text-foreground">Adjustments & Returns:</strong> After you receive your mailed/shipped garment, if you need any size adjustments or other alterations, you may send the clothing back to us using a <strong>paid return mail package</strong> of your choice. Once we receive it, our tailors will fix or adjust all the items and ship them back to you. This applies to all garments we have mailed or sent to you.
              </p>
              <p className="text-xs font-semibold text-foreground mt-2">By placing this order, you acknowledge and accept these terms in full.</p>
            </div>
          </div>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
              agreedToTerms ? "bg-primary border-primary" : "border-border bg-background"
            }`} onClick={() => setAgreedToTerms(!agreedToTerms)}>
              {agreedToTerms && <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
            <span className="text-sm font-medium leading-relaxed" onClick={() => setAgreedToTerms(!agreedToTerms)}>
              I understand and agree that this is a <strong>custom tailored order</strong> and cannot be cancelled or refunded after 3 business days of production starting.
            </span>
          </label>
        </div>

        {isETB ? (
          showEtbFlow ? (
            <EtbPayment
              totalUSD={total}
              totalETB={totalETB}
              etbRate={etbRate}
              orderNumber={orderNumber}
              customerName={user?.full_name}
              userEmail={user?.email}
              items={items}
              shippingCost={shippingCost}
              shippingAddress={computedShippingAddress}
              fulfillmentType={fulfillmentType}
              carrier={carrier}
              pickupLocation={pickupLocation}
              pickupPersonName={pickupPerson.name}
              pickupPersonPhone={pickupPerson.phone}
              eventData={eventData}
              onComplete={(orderId) => navigate(`/order-confirmation?order=${orderId}`)}
            />
          ) : (
            <Button
              size="lg"
              className="w-full py-6 text-base"
              onClick={() => { if (validateForETB()) setShowEtbFlow(true); }}
            >
              Continue to ETB Payment · {totalETB ? totalETB.toLocaleString() : ""} ETB
            </Button>
          )
        ) : (
          <>
            <Button
              size="lg"
              className="w-full py-6 text-base"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
              ) : (
                <>
            <CreditCard className="w-5 h-5 mr-2" />
            Pay {formatInCurrency(total, selectedCurrency)} with Stripe
            {selectedCurrency !== "USD" && (
              <span className="ml-1 text-xs opacity-70">({getStripeCurrencyInfo(selectedCurrency)?.flag})</span>
            )}
          </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4" />
              <span>Secure Stripe checkout · Encrypted payments · Measurements locked to order</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function buildEmail(name, orderNumber, items, total, eventData, address, shipChoice) {
  const addrStr = address?.street ? `${address.street}, ${address.city}, ${address.state} ${address.zip}, ${address.country}` : "To be confirmed";
  const itemList = items.map((i) => `• ${i.product_name} — $${i.price?.toFixed(2)}`).join("\n");

  return `
<div style="font-family:Georgia,serif;max-width:640px;margin:0 auto;color:#1a1410;background:#fffdf9;">
  <div style="background:#1a1410;padding:28px 32px;text-align:center;">
    <h1 style="margin:0;color:#c9882e;font-size:26px;letter-spacing:1px;">🇪🇹 Yehager Bahil Libs</h1>
    <p style="margin:6px 0 0;color:#ffffff80;font-size:12px;letter-spacing:3px;text-transform:uppercase;">Where Tradition Meets Your Perfect Fit</p>
  </div>
  <div style="padding:32px;">
    <p>Dear <strong>${name}</strong>,</p>
    <p>Your order is confirmed and our master tailors in Ethiopia have been notified. Each stitch will honor the tradition it represents.</p>
    <div style="background:#f8f5ef;border-left:3px solid #c9882e;padding:20px;border-radius:8px;margin:24px 0;">
      <p style="margin:0 0 6px;font-weight:bold;color:#c9882e;">Order #${orderNumber}</p>
      <pre style="font-family:inherit;white-space:pre-wrap;font-size:14px;margin:0;">${itemList}</pre>
      <p style="margin:12px 0 0;font-size:13px;"><strong>Total Paid:</strong> $${total.toFixed(2)}</p>
    </div>
    ${eventData ? `<p style="background:#fff3cd;padding:12px 16px;border-radius:8px;font-size:13px;">This order is linked to <strong>${eventData.owner_name}</strong>'s event: <strong>${eventData.name}</strong></p>` : ""}
    <h3 style="color:#c9882e;border-bottom:1px solid #e8ddd0;padding-bottom:8px;">⚠️ Important Notices</h3>
    <ul style="font-size:14px;line-height:1.8;">
      <li>All orders are <strong>custom-tailored</strong> and require a <strong>minimum of one month</strong> for production and delivery.</li>
      <li>International shipping is handled via <strong>DHL, UPS, USPS</strong>, and verified Ethiopian logistics partners.</li>
      <li>Shipping to: <strong>${addrStr}</strong></li>
      <li>To request changes, contact us within <strong>24 hours</strong> at support@yehagerbahillibs.com</li>
    </ul>
    <h3 style="color:#c9882e;border-bottom:1px solid #e8ddd0;padding-bottom:8px;">Your Tailoring Journey</h3>
    <ol style="font-size:14px;line-height:1.9;">
      <li><strong>In Tailoring</strong> — Your garment is being cut, embroidered & assembled.</li>
      <li><strong>Quality Inspection</strong> — Every measurement is verified before shipment.</li>
      <li><strong>Global Dispatch</strong> — You receive a tracking number by email.</li>
      <li><strong>Delivered to You</strong> — Wear your culture with pride.</li>
    </ol>
    <div style="text-align:center;padding:32px 0 8px;border-top:1px solid #e8ddd0;margin-top:32px;">
      <p style="font-style:italic;color:#8b7355;margin:0;">Wear your culture with pride.</p>
      <p style="font-weight:bold;margin:8px 0 0;">The Yehager Bahil Libs Team</p>
      <p style="font-size:11px;color:#8b7355;">yehagerbahillibs.com · support@yehagerbahillibs.com</p>
    </div>
  </div>
</div>`;
}