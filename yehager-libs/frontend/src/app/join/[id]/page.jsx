import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { RoutePlaceholder } from "@/components/route-placeholder";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

export default async function JoinEventPage({ params, searchParams }) {
  const { id } = await params;

  async function joinEvent() {
    "use server";
    try {
      await ensureBackendUserSynced();
      await apiRequest(`/api/v1/events/${id}/join`, {
        method: "POST",
      });
      redirect(`/event/${id}`);
    } catch {
      redirect(`/signin?callbackUrl=/join/${id}`);
    }
  }

  let event = null;
  try {
    const response = await backendPublicRequest(`/api/v1/events/${id}`);
    event = response?.data ?? null;
  } catch {
    return <RoutePlaceholder title="Join Event (not found)" path={`/join/${id}`} />;
  }

  const authRequired = searchParams?.auth === "required";

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center justify-center px-4 py-16">
      <div className="w-full rounded-3xl bg-foreground p-8 text-background">
        <p className="text-xs uppercase tracking-[0.4em] text-primary">You&apos;re Invited</p>
        <h1 className="mt-3 font-heading text-4xl font-bold">{event.name}</h1>
        <p className="mt-2 text-sm text-background/70">Hosted by {event.ownerName}</p>
        {event.message ? <p className="mt-4 text-sm italic text-background/80">&quot;{event.message}&quot;</p> : null}

        {authRequired ? (
          <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Sign in is required before joining this event.
          </p>
        ) : null}

        <form action={joinEvent} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Join Event
          </button>
        </form>
      </div>
    </div>
  );
}
