import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Users, QrCode, Calendar, Package, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import SocialShare from "../components/SocialShare";

const STATUS_STYLES = {
  browsing: "bg-gray-100 text-gray-700",
  added_to_cart: "bg-yellow-100 text-yellow-700",
  ordered: "bg-blue-100 text-blue-700",
  tailoring: "bg-purple-100 text-purple-800",
  shipped: "bg-green-100 text-green-800",
  delivered: "bg-green-200 text-green-900",
};
const PAYMENT_STYLES = {
  unpaid: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-800",
};

export default function EventDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [familyGroups, setFamilyGroups] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (authed) { const me = await base44.auth.me(); setUser(me); }
      const events = await base44.entities.Event.filter({ id });
      if (events.length > 0) {
        setEvent(events[0]);
        const [parts, fgroups, ords, mems] = await Promise.all([
          base44.entities.EventParticipant.filter({ event_id: id }),
          base44.entities.FamilyGroup.filter({ event_id: id }),
          base44.entities.Order.filter({ event_id: id }),
          base44.entities.FamilyMember.filter({ event_id: id }),
        ]);
        setFamilyGroups(fgroups);
        setParticipants(parts);
        setOrders(ords);
        setFamilyMembers(mems);
      }
      setLoading(false);
    };
    load();

    // Real-time: refresh participants when payment status changes
    const unsub = base44.entities.EventParticipant.subscribe(async (evt) => {
      if (evt.data?.event_id === id) {
        const parts = await base44.entities.EventParticipant.filter({ event_id: id });
        setParticipants(parts);
        const ords = await base44.entities.Order.filter({ event_id: id });
        setOrders(ords);
      }
    });
    return () => unsub();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!event) return (
    <div className="max-w-4xl mx-auto px-4 py-20 text-center">
      <p className="text-muted-foreground">Event not found</p>
    </div>
  );

  const eventLink = event.product_id
    ? `${window.location.origin}/product/${event.product_id}?event=${event.id}`
    : `${window.location.origin}/catalog?event=${event.id}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(eventLink)}`;

  const ordered = participants.filter((p) => ["ordered", "tailoring", "shipped", "delivered"].includes(p.order_status)).length;
  const paid = participants.filter((p) => p.payment_status === "paid").length;
  const isOrganizer = user && event && user.email === event.owner_email;

  // Build rich member data for organizer view
  // Prioritize participant's own status fields (updated by Stripe webhook)
  const memberTracking = participants.map((p) => {
    const familyGroup = familyGroups.find((fg) => fg.lead_email === p.participant_email);
    const order = orders.find((o) => o.user_email === p.participant_email);
    // Use participant's payment_status (set by webhook) OR order entity as fallback
    const orderPlaced = p.payment_status === "paid" || p.order_status === "ordered" ||
      (order && order.payment_status === "paid");
    const orderCompleted = (order && ["shipped", "delivered", "picked_up"].includes(order.status) && order.payment_status === "paid") ||
      ["shipped", "delivered"].includes(p.order_status);
    return { ...p, familyGroup, order, orderPlaced: !!orderPlaced, orderCompleted: !!orderCompleted };
  });
  const pendingMembers = memberTracking.filter((m) => !m.orderCompleted);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="bg-foreground rounded-2xl p-6 sm:p-8 text-background">
        <p className="text-primary text-xs tracking-[0.3em] uppercase font-medium mb-2">Event Dashboard</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold">{event.name}</h1>
        <div className="flex flex-wrap gap-4 mt-3 text-sm text-background/60">
          <span className="font-mono text-xs bg-white/10 px-2 py-1 rounded">{event.event_code}</span>
          {event.event_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{event.event_date}</span>}
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{participants.length} joined</span>
        </div>
        {event.product_name && (
          <p className="mt-3 text-sm text-background/70">
            Featured:{" "}
            <Link to={`/product/${event.product_id}`} className="text-primary font-medium hover:underline">{event.product_name}</Link>
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Participants", value: participants.length, icon: Users },
          { label: "Orders Placed", value: ordered, icon: Package },
          { label: "Paid", value: paid, icon: Package },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold font-heading">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Share */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-lg">Share Your Event</h3>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => setShowQR(!showQR)}
          >
            <QrCode className="w-3.5 h-3.5" />
            {showQR ? "Hide" : "QR Code"}
          </Button>
        </div>

        {showQR && (
          <div className="mb-4 p-4 bg-white rounded-xl inline-block">
            <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
            <p className="text-xs text-center text-gray-500 mt-2">Scan to join</p>
          </div>
        )}

        <SocialShare
          url={eventLink}
          message={`You're invited to join ${event.owner_name}'s event "${event.name}"! Get your custom Ethiopian outfit here:`}
        />
      </div>

      {/* Family Groups */}
      {familyGroups.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-heading font-semibold text-lg">Family Groups</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{familyGroups.length} household(s) joined this event</p>
          </div>
          <div className="divide-y divide-border">
            {familyGroups.map((fg) => {
              const groupMembers = familyMembers.filter((m) => m.family_group_id === fg.id);
              const groupOrder = orders.find((o) => o.user_email === fg.lead_email);
              return (
                <div key={fg.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{fg.group_name}</p>
                      <p className="text-xs text-muted-foreground">Lead: {fg.lead_name} · {groupMembers.length} member{groupMembers.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        groupOrder?.payment_status === "paid" ? "bg-green-100 text-green-700" :
                        groupOrder ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {groupOrder?.payment_status === "paid" ? "✓ Paid" : groupOrder ? "Order Placed" : "Pending"}
                      </span>
                      <Link to={`/family-group/${fg.id}`} className="text-xs text-primary hover:underline font-medium">
                        View →
                      </Link>
                    </div>
                  </div>
                  {groupMembers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {groupMembers.map((m) => (
                        <div key={m.id} className="flex items-center gap-1.5 bg-secondary/50 rounded-lg px-2.5 py-1.5">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                            {m.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium">{m.name}</span>
                          {m.relation && <span className="text-[10px] text-muted-foreground">({m.relation})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Organizer Member Tracker */}
      {isOrganizer && pendingMembers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-amber-600">{pendingMembers.length} member(s) haven't completed their order yet</h3>
          </div>
          <div className="space-y-2">
            {pendingMembers.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium">{m.participant_name}</span>
                <span className="text-muted-foreground">{m.participant_email}</span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${m.familyGroup ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {m.familyGroup ? "✓ Sub-family created" : "✗ No sub-family"}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-medium ${m.orderPlaced ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                  {m.orderPlaced ? "✓ Order placed" : "✗ No order"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Member Tracking Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-heading font-semibold text-lg">Member Tracking</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Track who joined, created their sub-family, placed an order, and completed checkout</p>
        </div>
        {participants.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground text-sm">
            No participants yet — share your event link above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Member</th>
                  <th className="text-center p-3 text-xs font-semibold text-muted-foreground">Joined</th>
                  <th className="text-center p-3 text-xs font-semibold text-muted-foreground">Sub-Family</th>
                  <th className="text-center p-3 text-xs font-semibold text-muted-foreground">Order Placed</th>
                  <th className="text-center p-3 text-xs font-semibold text-muted-foreground">Completed</th>
                  {isOrganizer && <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Sub-Family</th>}
                </tr>
              </thead>
              <tbody>
                {memberTracking.map((m, i) => (
                  <tr key={m.id} className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-secondary/20"}`}>
                    <td className="p-3">
                      <p className="font-medium text-sm">{m.participant_name}</p>
                      <p className="text-xs text-muted-foreground">{m.participant_email}</p>
                    </td>
                    <td className="p-3 text-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                    </td>
                    <td className="p-3 text-center">
                      {m.familyGroup
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        : <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {m.orderPlaced
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        : <Clock className="w-4 h-4 text-amber-400 mx-auto" />}
                    </td>
                    <td className="p-3 text-center">
                      {m.orderCompleted
                        ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        : <Clock className="w-4 h-4 text-muted-foreground mx-auto" />}
                    </td>
                    {isOrganizer && (
                      <td className="p-3">
                        {m.familyGroup ? (
                          <Link to={`/family-group/${m.familyGroup.id}`} className="text-xs text-primary hover:underline font-medium">
                            {m.familyGroup.group_name} →
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not created</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}