import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Users, ShoppingBag, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function EventJoin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const load = async () => {
      const events = await base44.entities.Event.filter({ id });
      if (events.length > 0) setEvent(events[0]);

      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  const handleJoin = async () => {
    if (!user) {
      toast.info("Creating an account lets you save measurements and track your order");
      base44.auth.redirectToLogin();
      return;
    }
    setJoining(true);
    const existing = await base44.entities.EventParticipant.filter({ event_id: event.id, participant_email: user.email });
    if (existing.length === 0) {
      await base44.entities.EventParticipant.create({
        event_id: event.id,
        event_name: event.name,
        participant_email: user.email,
        participant_name: user.full_name,
        order_status: "browsing",
        payment_status: "unpaid",
      });
    }
    setJoining(false);
    // Always direct to sub-family creation first
    navigate(`/create-family-group?event=${event.id}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!event) return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <p className="text-muted-foreground">This event link is no longer active.</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        {/* Cinematic invite card */}
        <div className="relative overflow-hidden rounded-3xl bg-foreground text-background">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-black/60" />
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=800&fit=crop')", backgroundSize: "cover", backgroundPosition: "center" }}
          />
          <div className="relative z-10 p-8">
            <p className="text-primary text-xs tracking-[0.4em] uppercase font-medium mb-4">You're Invited</p>
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <p className="text-white/60 text-sm mb-1">{event.owner_name} invites you to</p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white">{event.name}</h1>

            {event.event_date && (
              <div className="flex items-center gap-2 mt-4 text-white/60 text-sm">
                <Calendar className="w-4 h-4" />
                <span>{event.event_date}</span>
              </div>
            )}

            {event.message && (
              <p className="mt-4 text-white/70 text-sm italic leading-relaxed">"{event.message}"</p>
            )}

            {event.product_name && (
              <div className="mt-5 p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                <p className="text-white/50 text-xs">Featured Outfit</p>
                <p className="font-heading font-semibold text-white mt-0.5">{event.product_name}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Button size="lg" className="w-full gap-2 py-6 text-base" onClick={handleJoin} disabled={joining}>
            {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
            Join & Set Up My Family Group
          </Button>

          {!user && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
              <p className="text-xs font-semibold text-amber-800 mb-1">We strongly recommend creating an account</p>
              <p className="text-xs text-amber-700">
                Your measurements will be saved, your order will be linked to {event.owner_name}'s dashboard, and you'll receive production updates.
              </p>
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="mt-3 text-xs text-primary font-semibold hover:underline"
              >
                Create Account / Sign In →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}