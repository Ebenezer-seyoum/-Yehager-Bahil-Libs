import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, CheckCircle2, Copy, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const QR_CODE_URL = "https://media.base44.com/images/public/69cc55fa50bba233144fe99d/51db1479b_BusheforYehagerbahillibs.png";

export default function EtbPayment({
  totalUSD,
  totalETB,
  etbRate,
  orderNumber,
  customerName,
  userEmail,
  items,
  shippingCost,
  shippingAddress,
  fulfillmentType,
  carrier,
  pickupLocation,
  pickupPersonName,
  pickupPersonPhone,
  eventData,
  onComplete,
}) {
  const [proofFile, setProofFile] = useState(null);
  const [proofUrl, setProofUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyOrder = () => {
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    toast.success("Order number copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setUploading(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    setProofUrl(res.file_url);
    setUploading(false);
    toast.success("Payment proof uploaded");
  };

  const handleConfirm = async () => {
    if (!proofUrl) {
      toast.error("Please upload your payment proof screenshot first");
      return;
    }
    setSubmitting(true);

    const order = await base44.entities.Order.create({
      order_number: orderNumber,
      user_email: userEmail,
      customer_name: customerName,
      items: items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        product_image: i.product_image,
        price: i.price,
        quantity: i.quantity || 1,
        measurement_snapshot: i.measurement_snapshot,
        event_id: i.event_id,
        event_name: i.event_name,
      })),
      total: totalUSD,
      shipping_cost: shippingCost,
      payment_method: "etb_bank_transfer",
      payment_currency: "ETB",
      total_etb: totalETB,
      etb_exchange_rate: etbRate,
      payment_proof_url: proofUrl,
      payment_proof_uploaded_at: new Date().toISOString(),
      payment_status: "awaiting_verification",
      status: "pending",
      fulfillment_type: fulfillmentType,
      carrier: fulfillmentType === "pickup" ? "pickup" : carrier,
      pickup_location: fulfillmentType === "pickup" ? pickupLocation : undefined,
      pickup_person_name: fulfillmentType === "pickup" ? pickupPersonName : undefined,
      pickup_person_phone: fulfillmentType === "pickup" ? pickupPersonPhone : undefined,
      shipping_address: shippingAddress || undefined,
      event_id: eventData?.id,
      event_name: eventData?.name,
    });

    // Clear cart
    const cartItems = await base44.entities.CartItem.filter({ user_email: userEmail });
    for (const ci of cartItems) {
      await base44.entities.CartItem.delete(ci.id);
    }

    setSubmitting(false);
    onComplete(order.id);
  };

  return (
    <div className="space-y-5">
      {/* Amount summary */}
      <div className="p-5 bg-gradient-to-br from-primary/15 to-amber-500/5 border-2 border-primary/40 rounded-2xl">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Amount To Transfer</p>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-heading text-4xl sm:text-5xl font-bold text-foreground">
            {totalETB.toLocaleString()}
          </span>
          <span className="text-xl font-semibold text-primary">ETB</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Equivalent to ${totalUSD.toFixed(2)} USD · Rate: 1 USD = {etbRate} ETB
        </p>
      </div>

      {/* QR + Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* QR Code */}
        <div className="p-5 bg-card rounded-xl border border-border flex flex-col items-center text-center">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">Bank Transfer QR Code</p>
          <div className="bg-white p-4 rounded-xl">
            <img src={QR_CODE_URL} alt="Bank Transfer QR Code" className="w-56 h-56 object-contain" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">Scan with your banking app to pay</p>
        </div>

        {/* Instructions */}
        <div className="p-5 bg-card rounded-xl border border-border">
          <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-3">How To Pay</p>
          <ol className="space-y-3 text-sm">
            {[
              "Open your mobile banking app and choose 'Scan QR' to pay.",
              `Transfer exactly ${totalETB.toLocaleString()} ETB.`,
              "Use your order number below as the payment reference / remark.",
              "Take a screenshot of the successful transfer confirmation.",
              "Upload the screenshot below and confirm payment.",
            ].map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </span>
                <span className="text-muted-foreground leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>

          {/* Order number reference */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Payment Reference (Order Number)</p>
            <button
              onClick={handleCopyOrder}
              className="w-full flex items-center justify-between gap-2 p-3 bg-secondary rounded-lg hover:bg-secondary/70 transition-colors"
            >
              <span className="font-mono text-sm font-bold">{orderNumber}</span>
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </div>

      {/* Proof Upload */}
      <div className="p-5 bg-card rounded-xl border-2 border-dashed border-border">
        <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">Step 2 · Upload Payment Proof</p>
        <p className="text-sm text-muted-foreground mb-4">A screenshot of your bank transfer confirmation is required to process your order.</p>

        {!proofUrl ? (
          <label className={`flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${uploading ? "border-primary bg-primary/5" : "border-border hover:border-primary hover:bg-primary/5"}`}>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm font-medium">Click to upload screenshot</span>
                <span className="text-xs text-muted-foreground">PNG, JPG or HEIC</span>
              </>
            )}
          </label>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-green-400">Proof uploaded successfully</p>
              <p className="text-xs text-muted-foreground truncate">{proofFile?.name}</p>
            </div>
            <button
              onClick={() => { setProofUrl(null); setProofFile(null); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Replace
            </button>
          </div>
        )}
      </div>

      {/* Verification notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90 leading-relaxed">
          <p className="font-semibold text-amber-400 mb-1">Payment Verification</p>
          <p>Once you confirm, our team will verify your bank transfer (typically within a few hours). You will receive an email once payment is verified and tailoring begins.</p>
        </div>
      </div>

      {/* Confirm Button */}
      <Button
        size="lg"
        className="w-full py-6 text-base"
        onClick={handleConfirm}
        disabled={submitting || !proofUrl}
      >
        {submitting ? (
          <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
        ) : (
          <><CheckCircle2 className="w-5 h-5 mr-2" /> I have completed the payment</>
        )}
      </Button>
    </div>
  );
}