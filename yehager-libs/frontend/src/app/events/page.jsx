import Link from "next/link";
import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

export default async function EventsPage() {
  async function createEvent(formData) {
    "use server";
    await ensureBackendUserSynced();

    const name = String(formData.get("name") ?? "").trim();
    const eventDate = String(formData.get("eventDate") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    if (!name) return;

    await apiRequest("/api/v1/events", {
      method: "POST",
      body: {
        name,
        eventDate: eventDate || undefined,
        message: message || undefined,
      },
    });
    revalidatePath("/events");
  }

  let events = [];
  let authRequired = false;
  try {
    const response = await backendPublicRequest("/api/v1/events");
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
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-primary">Event Match-Up</p>
          <h1 className="font-heading text-4xl font-bold">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create and manage coordinated family/group orders.</p>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold">Create Event</p>
        {authRequired ? (
          <p className="mt-2 text-sm text-muted-foreground">Sign in to create and manage your events.</p>
        ) : (
          <form action={createEvent} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Event name" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <input name="eventDate" type="date" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <textarea
              name="message"
              placeholder="Message for participants"
              className="sm:col-span-2 min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Create Event
            </button>
          </form>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">No events yet.</div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/event/${event.id}`}
              className="block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <h3 className="font-heading text-xl font-semibold">{event.name}</h3>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono">{event.eventCode}</span>
                {event.eventDate ? <span>{new Date(event.eventDate).toLocaleDateString()}</span> : null}
                <span>Owner: {event.ownerEmail}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
