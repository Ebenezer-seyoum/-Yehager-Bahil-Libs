import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Users, Truck, MapPin, FileCheck, ExternalLink, FileText } from "lucide-react";
import { useT } from "@/lib/i18n/I18nContext";

const CARRIER_TRACKING = {
  "DHL": { name: "DHL", url: "https://www.dhl.com/en/express/tracking.html" },
  "UPS": { name: "UPS", url: "https://www.ups.com/track" },
  "Ethiopian Mail Service": { name: "Ethiopian Postal Service", url: "https://www.ethiopianpostalservice.com" },
};

const STEPS_MAIL   = ["pending", "tailoring", "quality_check", "shipped", "delivered"];
const STEPS_PICKUP = ["pending", "tailoring", "quality_check", "ready_for_pickup", "picked_up"];

const STATUS_STYLES = {
  pending:          "bg-gray-100 text-gray-700",
  tailoring:        "bg-amber-100 text-amber-800",
  quality_check:    "bg-purple-100 text-purple-800",
  shipped:          "bg-blue-100 text-blue-700",
  delivered:        "bg-green-100 text-green-800",
  ready_for_pickup: "bg-orange-100 text-orange-800",
  picked_up:        "bg-green-200 text-green-900",
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("orders");
  const { t } = useT();

  useEffect(() => {
    const load = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        const [ords, evts] = await Promise.all([
          base44.entities.Order.filter({ user_email: me.email }, "-created_date"),
          base44.entities.Event.filter({ owner_email: me.email }, "-created_date"),
        ]);
        setOrders(ords);
        setMyEvents(evts);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!user) return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
      <h2 className="font-heading text-2xl font-bold mb-2">{t("orders.signInToView")}</h2>
      <Button onClick={() => base44.auth.redirectToLogin()}>{t("general.signIn")}</Button>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="font-heading text-3xl font-bold mb-2">{t("orders.title")}</h1>
      <p className="text-muted-foreground mb-8 text-sm">{user.full_name} · {user.email}</p>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl mb-8 w-fit">
        {[["orders", t("orders.tabOrders")], ["events", t("orders.tabEvents")]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div>
          {orders.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
              <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-heading text-lg font-semibold mb-1">{t("orders.noOrders")}</h3>
              <p className="text-muted-foreground text-sm mb-4">{t("orders.noOrdersDesc")}</p>
              <Button asChild size="sm"><Link to="/catalog">{t("cart.browseCollection")}</Link></Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const statusKey = `status.${order.status}`;
                const statusLabel = t(statusKey) !== statusKey ? t(statusKey) : order.status;
                const style = STATUS_STYLES[order.status] || "bg-gray-100 text-gray-700";
                const isPickup = order.fulfillment_type === "pickup";
                const steps = isPickup ? STEPS_PICKUP : STEPS_MAIL;
                const stepLabels = isPickup
                  ? [t("orders.received"), t("orders.tailoring"), t("orders.qc"), t("orders.ready"), t("orders.pickedUp")]
                  : [t("orders.received"), t("orders.tailoring"), t("orders.qc"), t("orders.shipped"), t("orders.delivered")];
                const idx = steps.indexOf(order.status);

                return (
                  <div key={order.id} className="p-5 bg-card rounded-xl border border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm">{order.order_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>{statusLabel}</span>
                          {order.payment_status === "paid" && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{t("orders.paid")}</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.items?.length} {t("cart.items")} · <span className="font-semibold text-foreground">${order.total?.toFixed(2)}</span>
                        </p>
                        {order.event_name && (
                          <p className="text-xs text-primary mt-1 flex items-center gap-1">
                            <Users className="w-3 h-3" /> {t("orders.group")}: {order.event_name}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(order.created_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="mt-3 space-y-1">
                      {order.items?.map((item, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block flex-shrink-0" />
                          {item.product_name} — ${item.price?.toFixed(2)}
                        </p>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center gap-1 mb-1">
                        {steps.map((_, i) => (
                          <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= idx ? "bg-primary" : "bg-border"}`} />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        {stepLabels.map((l) => <span key={l}>{l}</span>)}
                      </div>
                    </div>

                    {/* Fulfillment details */}
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      {isPickup ? (
                        <>
                          <p className="text-xs flex items-center gap-1.5 text-muted-foreground">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span className="font-medium text-foreground">{t("orders.inStorePickup")}:</span> {order.pickup_location}
                          </p>
                          {order.pickup_person_name && (
                            <p className="text-xs text-muted-foreground">{t("orders.pickupPerson")}: <strong>{order.pickup_person_name}</strong> · {order.pickup_person_phone}</p>
                          )}
                          {order.pickup_signed_doc_url ? (
                            <a href={order.pickup_signed_doc_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1.5 text-green-600 hover:underline">
                              <FileCheck className="w-3 h-3" /> {t("orders.signedFormOnFile")}
                            </a>
                          ) : (
                            <p className="text-xs text-amber-600">⏳ {t("orders.awaitingPickupDocs")}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <Truck className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-medium text-foreground">{order.carrier || t("orders.carrierTBD")}</span>
                            {order.shipping_address?.city && (
                              <span className="text-xs text-muted-foreground">→ {order.shipping_address.city}, {order.shipping_address.country}</span>
                            )}
                            {order.carrier && CARRIER_TRACKING[order.carrier] && (
                              <a
                                href={CARRIER_TRACKING[order.carrier].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[11px] font-medium hover:opacity-80 transition-opacity bg-primary"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {t("orders.trackOn")} {CARRIER_TRACKING[order.carrier].name}
                              </a>
                            )}
                          </div>
                          {(order.shipping_documents || []).length > 0 && (
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t("orders.shippingDocs")}</p>
                              {(order.shipping_documents || []).map((doc, i) => (
                                <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                                  className="text-xs flex items-center gap-1.5 text-blue-400 hover:underline">
                                  <FileText className="w-3 h-3" /> {doc.label}
                                  {doc.uploaded_at && <span className="text-muted-foreground">({new Date(doc.uploaded_at).toLocaleDateString()})</span>}
                                </a>
                              ))}
                            </div>
                          )}
                          {!(order.shipping_documents || []).length && order.status !== "delivered" && (
                            <p className="text-xs text-muted-foreground">⏳ {t("orders.awaitingDocs")}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "events" && (
        <div>
          {myEvents.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
              <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-heading text-lg font-semibold mb-1">{t("orders.noEvents")}</h3>
              <p className="text-muted-foreground text-sm mb-4">{t("orders.noEventsDesc")}</p>
              <Button asChild size="sm"><Link to="/events">{t("orders.createEvent")}</Link></Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myEvents.map((event) => (
                <Link key={event.id} to={`/event/${event.id}`} className="flex items-center justify-between p-5 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors group">
                  <div>
                    <h3 className="font-heading font-semibold">{event.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono">{event.event_code}</span>
                      {event.event_date && <span>{event.event_date}</span>}
                      {event.product_name && <span>· {event.product_name}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-primary group-hover:underline">{t("orders.viewDashboard")} →</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}