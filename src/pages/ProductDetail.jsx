import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Users, Loader2, Share2, Clock, Calendar, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import MeasurementForm from "../components/MeasurementForm";
import ImageZoom from "../components/ImageZoom";
import ImageMagnifier from "../components/ImageMagnifier";
import EventBanner from "../components/EventBanner";
import SocialShare from "../components/SocialShare";
import { useT } from "@/lib/i18n/I18nContext";
import { useTranslatedProduct } from "@/hooks/useTranslatedProduct";
import { useUnit } from "@/hooks/useUnit";
import { formatMeasurement } from "@/lib/units";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const { unit } = useUnit();
  const [rawProduct, setRawProduct] = useState(null);
  const { product: translatedProduct, translating } = useTranslatedProduct(rawProduct);
  const product = translatedProduct;
  const [user, setUser] = useState(null);
  const [measurement, setMeasurement] = useState(null);
  const [showMeasurement, setShowMeasurement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [eventData, setEventData] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(0);
  const [magnifierOn, setMagnifierOn] = useState(false);
  const [selectedRoleIdx, setSelectedRoleIdx] = useState(0);

  const { toETB } = useExchangeRate();

  // Build effective roles list: prefer new family_roles array, fall back to legacy is_couple/groom_price
  const familyRoles = (() => {
    if (product?.family_roles && product.family_roles.length > 0) return product.family_roles;
    if (product?.is_couple && product?.groom_price != null) {
      return [
        { label: "Bride", icon: "👰", price: product.price, gender: "female" },
        { label: "Groom", icon: "🤵", price: product.groom_price, gender: "male" },
      ];
    }
    return [];
  })();
  const hasRoles = familyRoles.length > 0;
  const selectedRole = hasRoles ? familyRoles[selectedRoleIdx] : null;
  const displayPrice = selectedRole ? selectedRole.price : product?.price;
  const measurementGender = selectedRole?.gender || product?.gender;
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("event");

  useEffect(() => {
    const load = async () => {
      const prods = await base44.entities.Product.filter({ id });
      if (prods.length > 0) setRawProduct(prods[0]);

      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        const measurements = await base44.entities.Measurement.filter({ user_email: me.email }, "-created_date", 1);
        if (measurements.length > 0) setMeasurement(measurements[0]);
      }

      if (eventId) {
        const events = await base44.entities.Event.filter({ id: eventId });
        if (events.length > 0) setEventData(events[0]);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleSaveMeasurement = async (values) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    const data = { ...values, user_email: user.email, gender: measurementGender === "female" ? "female" : "male" };
    if (measurement) {
      await base44.entities.Measurement.update(measurement.id, data);
      setMeasurement({ ...measurement, ...data });
    } else {
      const created = await base44.entities.Measurement.create(data);
      setMeasurement(created);
    }
    setShowMeasurement(false);
    toast.success("Measurements saved!");
  };

  const handleAddToCart = async () => {
    if (!user) { toast.error("Please sign in to add items to cart"); base44.auth.redirectToLogin(); return; }
    setAdding(true);
    await base44.entities.CartItem.create({
      user_email: user.email,
      product_id: product.id,
      product_name: selectedRole ? `${product.name} — ${selectedRole.label}` : product.name,
      product_image: product.images?.[0] || "",
      price: displayPrice,
      quantity: 1,
      measurement_id: measurement?.id || "",
      measurement_snapshot: measurement ? { chest: measurement.chest, waist: measurement.waist, hips: measurement.hips, shoulder_width: measurement.shoulder_width, arm_length: measurement.arm_length, torso_length: measurement.torso_length } : {},
      event_id: eventData?.id || "",
      event_name: eventData?.name || "",
    });

    if (eventData) {
      const existing = await base44.entities.EventParticipant.filter({ event_id: eventData.id, participant_email: user.email });
      if (existing.length === 0) {
        await base44.entities.EventParticipant.create({ event_id: eventData.id, event_name: eventData.name, participant_email: user.email, participant_name: user.full_name, order_status: "added_to_cart" });
      } else {
        await base44.entities.EventParticipant.update(existing[0].id, { order_status: "added_to_cart" });
      }
    }
    setAdding(false);
    toast.success("Added to cart!");
    navigate("/cart");
  };

  const handleCreateEvent = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (!newEventName) { toast.error("Enter an event name"); return; }
    setCreatingEvent(true);
    const eventCode = "EVT-" + Date.now().toString(36).toUpperCase();
    const event = await base44.entities.Event.create({
      name: newEventName,
      owner_email: user.email,
      owner_name: user.full_name,
      event_code: eventCode,
      product_id: product.id,
      product_name: product.name,
      is_active: true,
    });
    setCreatingEvent(false);
    setEventDialogOpen(false);
    navigate(`/event/${event.id}`);
  };

  if (loading || (!product && rawProduct)) return (
    <div className="flex items-center justify-center py-40">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!rawProduct) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <p className="text-muted-foreground">{t("product.notFound")}</p>
    </div>
  );

  const images = product.images?.length > 0
    ? product.images
    : ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1000&fit=crop"];

  const shareUrl = `${window.location.origin}/product/${product.id}`;
  const shareMsg = `${t("product.checkOutShare")} ${product.name}`;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-12 xl:px-20 py-8 sm:py-12">
      {zoomOpen && (
        <ImageZoom images={images} initialIndex={zoomIndex} onClose={() => setZoomOpen(false)} />
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">{t("nav.home")}</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/catalog" className="hover:text-foreground">{t("product.collection")}</Link>
        {product.region && (
          <>
            <ChevronRight className="w-3 h-3" />
            <Link to={`/catalog?region=${encodeURIComponent(product.region)}`} className="hover:text-foreground">{product.region}</Link>
          </>
        )}
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground truncate max-w-[150px]">{product.name}</span>
      </div>

      {eventData && (
        <div className="mb-6">
          <EventBanner eventName={eventData.name} ownerName={eventData.owner_name} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 xl:gap-24">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="aspect-[2/3] rounded-2xl overflow-hidden relative">
            {magnifierOn ? (
              <ImageMagnifier src={images[activeImg]} alt={product.name} zoom={2.5} lensSize={150} />
            ) : (
              <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
            )}
            {/* Magnifier toggle */}
            <button
              onClick={() => setMagnifierOn((m) => !m)}
              className={`absolute top-3 left-3 text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors z-20 ${
                magnifierOn
                  ? "bg-primary text-primary-foreground hover:bg-primary/80"
                  : "bg-black/60 hover:bg-black/80 text-white"
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {magnifierOn ? t("product.stopMagnify") : t("product.useMagnifier")}
            </button>
            <button
              onClick={() => { setZoomIndex(activeImg); setZoomOpen(true); }}
              className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1.5 transition-colors z-20"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              {t("product.fullScreen")}
            </button>
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${activeImg === i ? "border-primary" : "border-transparent"}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2">
            {product.region && (
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">{product.region}</span>
            )}
            {product.subcategory && (
              <span className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">{product.subcategory}</span>
            )}
            {product.unique_id && (
              <span className="px-3 py-1 bg-secondary font-mono text-xs text-muted-foreground rounded-full">#{product.unique_id}</span>
            )}
          </div>

          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold leading-tight">
              {product.name}
              {translating && <span className="ml-2 text-xs text-muted-foreground italic">({t("product.translating")})</span>}
            </h1>
            <div className="mt-3">
              <p className="text-3xl font-light text-primary">${displayPrice?.toFixed(2)}</p>
              {toETB(displayPrice) && (
                <p className="text-sm text-muted-foreground mt-0.5">≈ {toETB(displayPrice).toLocaleString()} ETB</p>
              )}
            </div>
          </div>

          {/* Family / Couple role selector */}
          {hasRoles && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("product.selectOutfit")}</h3>
              <div className={`grid gap-2 ${familyRoles.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : familyRoles.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {familyRoles.map((role, idx) => (
                  <button
                    key={`${role.label}-${idx}`}
                    type="button"
                    onClick={() => setSelectedRoleIdx(idx)}
                    className={`p-3 rounded-xl border-2 text-left transition-colors ${selectedRoleIdx === idx ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-primary/40"}`}
                  >
                    <p className="font-semibold text-sm">{role.icon || "👤"} {role.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{role.price != null ? `$${role.price.toFixed(2)}` : t("product.priceTbd")}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
          )}

          {/* Full Clothing Details Panel */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("product.garmentDetails")}</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {product.fabric_type && (
                <div className="p-3 bg-secondary rounded-xl">
                  <p className="text-muted-foreground mb-0.5">{t("product.fabric")}</p>
                  <p className="font-semibold">{product.fabric_type}</p>
                </div>
              )}
              {product.embroidery_style && (
                <div className="p-3 bg-secondary rounded-xl">
                  <p className="text-muted-foreground mb-0.5">{t("product.designName")}</p>
                  <p className="font-semibold">{product.embroidery_style}</p>
                </div>
              )}
              <div className="p-3 bg-secondary rounded-xl">
                <p className="text-muted-foreground mb-0.5">{t("product.origin")}</p>
                <p className="font-semibold">{t("product.handcrafted")}</p>
              </div>
              <div className="p-3 bg-secondary rounded-xl">
                <p className="text-muted-foreground mb-0.5">{t("product.fitType")}</p>
                <p className="font-semibold">{product.category?.includes("Men") ? t("product.fitMen") : product.category?.includes("Women") ? t("product.fitWomen") : t("product.fitDefault")}</p>
              </div>
              <div className="p-3 bg-secondary rounded-xl">
                <p className="text-muted-foreground mb-0.5">{t("product.gender")}</p>
                <p className="font-semibold">{product.gender === "male" ? t("product.male") : product.gender === "female" ? t("product.female") : t("product.unisex")}</p>
              </div>
            </div>
          </div>

          {/* Production to Delivery Time */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <Clock className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">{t("product.deliveryTitle")}</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {t("product.deliveryText")} <Link to="/care-and-info" className="underline hover:text-amber-900">{t("product.learnMore")}</Link>
              </p>
            </div>
          </div>

          {/* Measurements */}
          {measurement && !showMeasurement ? (
            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">{t("product.yourMeasurements")}</p>
                <button onClick={() => setShowMeasurement(true)} className="text-xs text-primary hover:underline">{t("product.edit")}</button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  [t("meas.short.chest"), measurement.chest],
                  [t("meas.short.waist"), measurement.waist],
                  [t("meas.short.hips"), measurement.hips],
                  [t("meas.short.shoulder"), measurement.shoulder_width],
                  [t("meas.short.arm"), measurement.arm_length],
                  [t("meas.short.torso"), measurement.torso_length],
                ].map(([l, v]) => (
                  <div key={l} className="text-xs">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="ml-1 font-medium">{formatMeasurement(v, unit)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-card rounded-xl border border-border">
              <MeasurementForm
                gender={measurementGender}
                initialValues={measurement || {}}
                onSubmit={handleSaveMeasurement}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button size="lg" className="flex-1 gap-2" onClick={handleAddToCart} disabled={adding}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
              {t("btn.addToCart")}
            </Button>

            {/* Create Event */}
            {!eventData && (
              <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" variant="outline" className="gap-2">
                    <Users className="w-4 h-4" /> {t("product.createEvent")}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-heading text-xl">{t("product.createEventGroup")}</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">{t("product.eventBlurb")}</p>
                  <div className="space-y-3 mt-2">
                    <input
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
                      placeholder={t("product.eventNamePh")}
                      value={newEventName}
                      onChange={(e) => setNewEventName(e.target.value)}
                    />
                    <Button onClick={handleCreateEvent} disabled={creatingEvent} className="w-full">
                      {creatingEvent ? t("product.creating") : t("product.createGetLink")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Share */}
            <Dialog open={shareOpen} onOpenChange={setShareOpen}>
              <DialogTrigger asChild>
                <Button size="lg" variant="ghost" className="px-3">
                  <Share2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl">{t("product.shareThisPiece")}</DialogTitle>
                </DialogHeader>
                <SocialShare url={shareUrl} message={shareMsg} />
              </DialogContent>
            </Dialog>
          </div>

          {!user && (
            <p className="text-xs text-center text-muted-foreground">
              <button onClick={() => base44.auth.redirectToLogin()} className="text-primary hover:underline">{t("product.signIn")}</button>{" "}
              {t("product.signInToSave")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}