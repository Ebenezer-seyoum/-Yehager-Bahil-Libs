import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar, Loader2, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const EVENT_TYPES = ["Wedding", "Baptism", "Graduation", "Holiday", "Birthday", "Other"];

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", event_type: "Wedding", event_date: "", message: "",
    street: "", city: "", state: "", zip: "", country: ""
  });

  useEffect(() => {
    const load = async () => {
      const authed = await base44.auth.isAuthenticated();
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        const myEvents = await base44.entities.Event.filter({ owner_email: me.email }, "-created_date");
        setEvents(myEvents);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleCreate = async () => {
    if (!form.name) { toast.error("Event name is required"); return; }
    setCreating(true);
    const eventCode = "EVT-" + Date.now().toString(36).toUpperCase();
    const event = await base44.entities.Event.create({
      name: form.name,
      owner_email: user.email,
      owner_name: user.full_name,
      event_code: eventCode,
      event_date: form.event_date,
      message: form.message,
      shipping_address: { street: form.street, city: form.city, state: form.state, zip: form.zip, country: form.country },
      is_active: true,
    });
    setCreating(false);
    setOpen(false);
    toast.success("Event created!");
    navigate(`/event/${event.id}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-primary text-xs tracking-[0.4em] uppercase font-medium mb-2">Proprietary Feature</p>
          <h1 className="font-heading text-4xl font-bold">Event Match-Up</h1>
          <p className="text-muted-foreground mt-1">Coordinate matching outfits for weddings, baptisms & celebrations</p>
        </div>
        {user ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" /> Create Event</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">Create Event Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Event Name *</label>
                  <input className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" placeholder="e.g. Aman & Sara's Wedding" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Event Type</label>
                  <select className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                    {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Event Date</label>
                  <input type="date" className="mt-1 w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Welcome Message (shown to participants)</label>
                  <textarea className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none" rows={3} placeholder="A special message for your guests..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Default Shipping Address</label>
                  <p className="text-xs text-muted-foreground mb-2">Participants may choose to consolidate shipping here</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Street" className="col-span-2 h-9 rounded-lg border border-input bg-background px-3 text-sm" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                    <input placeholder="City" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    <input placeholder="State" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                    <input placeholder="ZIP" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                    <input placeholder="Country" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full">
                  {creating ? "Creating..." : "Create Event & Get Share Links"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Button onClick={() => base44.auth.redirectToLogin()}>Sign In to Create</Button>
        )}
      </div>

      {/* How it works */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 p-6 bg-foreground rounded-2xl">
        {[
          ["1", "Select an outfit"],
          ["2", "Create an event"],
          ["3", "Share the link"],
          ["4", "Track everyone"],
        ].map(([n, label]) => (
          <div key={n} className="text-center">
            <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center mx-auto mb-2">{n}</div>
            <p className="text-xs text-white/70">{label}</p>
          </div>
        ))}
      </div>

      {!user ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="font-heading text-2xl font-bold mb-2">Sign in to manage events</h2>
          <Button onClick={() => base44.auth.redirectToLogin()}>Sign In</Button>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="font-heading text-xl font-bold mb-2">No events yet</h2>
          <p className="text-muted-foreground text-sm">Create your first event group to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link key={event.id} to={`/event/${event.id}`} className="flex items-center justify-between p-5 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold">{event.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="font-mono">{event.event_code}</span>
                    {event.event_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{event.event_date}</span>}
                    {event.product_name && <span>· {event.product_name}</span>}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}