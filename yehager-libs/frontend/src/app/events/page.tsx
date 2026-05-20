import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { ArrowRight, Calendar, Plus, Users } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { authOptions } from "@/auth-options";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Event = {
  id: string;
  name: string;
  eventCode?: string | null;
  eventDate?: string | null;
  productName?: string | null;
  ownerEmail?: string | null;
};

const EVENT_TYPES = ["Wedding", "Baptism", "Graduation", "Holiday", "Birthday", "Other"];

export default async function EventsPage() {
  async function createEvent(formData: FormData) {
    "use server";
    await ensureBackendUserSynced();

    const name = String(formData.get("name") ?? "").trim();
    const eventDate = String(formData.get("eventDate") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const street = String(formData.get("street") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const state = String(formData.get("state") ?? "").trim();
    const zip = String(formData.get("zip") ?? "").trim();
    const country = String(formData.get("country") ?? "").trim();
    if (!name) return;

    const response = await apiRequest<{ data?: { id?: string } }>("/api/v1/events", {
      method: "POST",
      body: {
        name,
        eventType: String(formData.get("eventType") ?? "Wedding"),
        eventDate: eventDate || undefined,
        message: message || undefined,
        shippingAddress: street || city || state || zip || country ? { street, city, state, zip, country } : undefined,
      },
    });
    revalidatePath("/events");
    if (response?.data?.id) redirect(`/event/${response.data.id}`);
  }

  let events: Event[] = [];
  const session = await getServerSession(authOptions);
  const authRequired = !session?.user?.id;

  if (!authRequired) {
    await ensureBackendUserSynced();
    try {
      const response = await apiRequest<{ data: Event[] }>("/api/v1/events/mine?limit=60");
      events = Array.isArray(response?.data) ? response.data : [];
    } catch {
      events = [];
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.4em] text-primary">Proprietary Feature</p>
          <h1 className="font-heading text-4xl font-bold">Event Match-Up</h1>
          <p className="mt-1 text-sm text-muted-foreground">Coordinate matching outfits for weddings, baptisms & celebrations</p>
        </div>
        {authRequired ? (
          <Link href="/signin?callbackUrl=/events" className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Sign In to Create
          </Link>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Create Event
              </button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-heading text-2xl">Create Event Group</DialogTitle>
              </DialogHeader>
              <form action={createEvent} className="mt-2 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Event Name *</label>
                  <input name="name" required placeholder="e.g. Aman & Sara's Wedding" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Event Type</label>
                  <select name="eventType" defaultValue="Wedding" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    {EVENT_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Event Date</label>
                  <input name="eventDate" type="date" className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Welcome Message (shown to participants)</label>
                  <textarea name="message" rows={3} placeholder="A special message for your guests..." className="mt-1 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Default Shipping Address</label>
                  <p className="mb-2 text-xs text-muted-foreground">Participants may choose to consolidate shipping here</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input name="street" placeholder="Street" className="col-span-2 h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                    <input name="city" placeholder="City" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                    <input name="state" placeholder="State" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                    <input name="zip" placeholder="ZIP" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                    <input name="country" placeholder="Country" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" />
                  </div>
                </div>
                <button type="submit" className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Create Event & Get Share Links
                </button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mb-10 grid grid-cols-2 gap-3 rounded-2xl bg-foreground p-6 sm:grid-cols-4">
        {[
          ["1", "Select an outfit"],
          ["2", "Create an event"],
          ["3", "Share the link"],
          ["4", "Track everyone"],
        ].map(([n, label]) => (
          <div key={n} className="text-center">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{n}</div>
            <p className="text-xs text-white/70">{label}</p>
          </div>
        ))}
      </div>

      {authRequired ? (
        <div className="py-16 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 font-heading text-2xl font-bold">Sign in first to manage events</h2>
          <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">Create event groups, share invite links, and track matching outfits from your account.</p>
          <Link href="/signin?callbackUrl=/events" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Sign In
          </Link>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 font-heading text-xl font-bold">No events yet</h2>
          <p className="text-sm text-muted-foreground">Create your first event group to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/event/${event.id}`}
              className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold">{event.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {event.eventCode ? <span className="font-mono">{event.eventCode}</span> : null}
                    {event.eventDate ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.eventDate).toLocaleDateString()}
                      </span>
                    ) : null}
                    {event.productName ? <span>· {event.productName}</span> : null}
                  </div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
