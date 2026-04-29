import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Loader2, GraduationCap } from "lucide-react";
import LearnLanguagesPopup from "../components/LearnLanguagesPopup";
import { LEARN_LANGUAGES_URL } from "@/lib/taxonomy";

export default function OrderConfirmation() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("order");

  useEffect(() => {
    if (orderId) {
      base44.entities.Order.filter({ id: orderId }).then((orders) => {
        if (orders.length > 0) setOrder(orders[0]);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    // Show the promotional popup once per order, before the confirmation is fully revealed
    const popupKey = `learn_popup_shown_${orderId || "no_order"}`;
    if (orderId && !sessionStorage.getItem(popupKey)) {
      setShowPopup(true);
      sessionStorage.setItem(popupKey, "1");
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {showPopup && <LearnLanguagesPopup onClose={() => setShowPopup(false)} />}

      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="font-heading text-3xl font-bold mb-3">
          {order?.payment_status === "awaiting_verification" ? "Order Received!" : "Order Confirmed!"}
        </h1>
        <p className="text-muted-foreground mb-2">
          Thank you for choosing Yehager Bahil Libs.
        </p>
        {order && (
          <p className="text-sm text-muted-foreground mb-2">
            Order <span className="font-mono font-bold text-foreground">{order.order_number}</span> —{" "}
            {order.payment_currency === "ETB" && order.total_etb
              ? `${order.total_etb.toLocaleString()} ETB`
              : `$${order.total?.toFixed(2)}`}
          </p>
        )}
        {order?.payment_status === "awaiting_verification" && (
          <div className="max-w-md mx-auto mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-sm font-semibold text-amber-400 mb-1">Payment Verification In Progress</p>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              We have received your bank transfer proof. Our team will verify your payment shortly and you'll get an email confirmation. Tailoring will begin once verified.
            </p>
          </div>
        )}
        {order?.payment_status !== "awaiting_verification" && <div className="mb-8" />}

        <div className="bg-card rounded-2xl border border-border p-6 text-left mb-8 space-y-4">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">What's Next</p>
              <p className="text-xs text-muted-foreground">Our master tailors are preparing your garment</p>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</div>
              <span>Tailoring & Embroidery (~30 days)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center font-bold">2</div>
              <span>Quality Inspection</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center justify-center font-bold">3</div>
              <span>Global Shipping & Tracking</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          A confirmation email has been sent. You have 24 hours to make changes by contacting support@yehagerbahillibs.com
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <Button asChild>
            <Link to="/my-orders">View My Orders</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/catalog">Continue Shopping</Link>
          </Button>
        </div>

        {/* Second-chance learn languages CTA */}
        <a
          href={LEARN_LANGUAGES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl p-5 text-left transition-all shadow-lg shadow-emerald-900/20 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-heading font-bold text-base">Interested in learning Ethiopian Languages? Start here</p>
              <p className="text-xs text-white/80 mt-0.5">Live classes in Amharic, Afan Oromo, Tigrigna & English</p>
            </div>
            <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </a>
      </div>
    </>
  );
}