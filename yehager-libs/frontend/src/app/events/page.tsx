import Link from "next/link";
import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

type Event = {
  id: string;
  name: string;
  eventCode?: string | null;
  eventDate?: string | null;
  productName?: string | null;
  ownerEmail?: string | null;
};

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

    await apiRequest("/api/v1/events", {
      method: "POST",
      body: {
        name,
        eventDate: eventDate || undefined,
        message: message || undefined,
        shippingAddress: street || city || state || zip || country ? { street, city, state, zip, country } : undefined,
      },
    });
    revalidatePath("/events");
  }

  let events: Event[] = [];
  let authRequired = false;

  try {
    const response = await backendPublicRequest("/api/v1/events?limit=60");
    events = Array.isArray(response?.data) ? response.data : [];
  } catch {
    events = [];
  }

  try {
    await ensureBackendUserSynced();
  } catch {
    authRequired = true;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.4em] text-primary">Proprietary Feature</p>
          <h1 className="font-heading text-4xl font-bold">Event Match-Up</h1>
          <p className="mt-1 text-sm text-muted-foreground">Coordinate matching outfits for weddings, baptisms and celebrations.</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 rounded-2xl bg-foreground p-6 sm:grid-cols-4">
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

      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold">Create Event</p>
        {authRequired ? (
          <p className="mt-2 text-sm text-muted-foreground">Sign in to create and manage your event groups.</p>
        ) : (
          <form action={createEvent} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Event Name *" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <input name="eventDate" type="date" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <textarea
              name="message"
              placeholder="Welcome Message (shown to participants)"
              rows={3}
              className="sm:col-span-2 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            />
            <input name="street" placeholder="Street" className="sm:col-span-2 h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <input name="city" placeholder="City" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <input name="state" placeholder="State" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <input name="zip" placeholder="ZIP" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <input name="country" placeholder="Country" className="h-10 rounded-lg border border-input bg-background px-3 text-sm" />
            <button type="submit" className="sm:col-span-2 w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Create Event and Get Share Links
            </button>
          </form>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <h2 className="font-heading text-xl font-bold">No events yet</h2>
          <p className="text-sm text-muted-foreground">Create your first event group to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/event/${event.id}`}
              className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/30"
            >
              <div>
                <h3 className="font-heading font-semibold">{event.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {event.eventCode ? <span className="font-mono">{event.eventCode}</span> : null}
                  {event.eventDate ? <span>{new Date(event.eventDate).toLocaleDateString()}</span> : null}
                  {event.productName ? <span>- {event.productName}</span> : null}
                </div>
              </div>
              <span className="text-xs text-primary group-hover:underline">Open Dashboard -&gt;</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
