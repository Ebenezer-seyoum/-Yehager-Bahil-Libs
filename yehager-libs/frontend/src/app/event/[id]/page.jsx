import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { RoutePlaceholder } from "@/components/route-placeholder";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

export default async function EventDashboardPage({ params }) {
  const { id } = await params;

  let event = null;
  let participants = [];
  let authRequired = false;

  try {
    const response = await backendPublicRequest(`/api/v1/events/${id}`);
    event = response?.data ?? null;
  } catch {
    return <RoutePlaceholder title="Event (not found)" path={`/event/${id}`} />;
  }

  try {
    await ensureBackendUserSynced();
    const participantRes = await apiRequest(`/api/v1/events/${id}/participants`);
    participants = Array.isArray(participantRes?.data) ? participantRes.data : [];
  } catch {
    authRequired = true;
    participants = [];
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-foreground p-6 text-background">
        <p className="text-xs uppercase tracking-[0.35em] text-primary">Event Dashboard</p>
        <h1 className="mt-2 font-heading text-4xl font-bold">{event.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-background/70">
          <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs">{event.eventCode}</span>
          {event.eventDate ? <span>{new Date(event.eventDate).toLocaleDateString()}</span> : null}
          <span>{event.ownerEmail}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-semibold">Share Invite</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite participants with your join link:
          <span className="ml-2 font-mono text-xs text-foreground">{`/join/${event.id}`}</span>
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-semibold">Participants</h2>
        {authRequired ? (
          <p className="mt-2 text-sm text-muted-foreground">Sign in to see participant details.</p>
        ) : participants.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No participants yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {participants.map((p) => (
              <div key={p.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="font-medium">{p.participantName}</p>
                <p className="text-xs text-muted-foreground">{p.participantEmail}</p>
                <p className="mt-1 text-xs">
                  Status: <span className="font-medium">{p.orderStatus}</span> · Payment:{" "}
                  <span className="font-medium">{p.paymentStatus}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Link href="/events" className="inline-block rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary">
        Back to Events
      </Link>
    </div>
  );
}
