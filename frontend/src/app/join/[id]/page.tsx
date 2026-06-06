import { redirect } from "next/navigation";
import { Calendar, ShoppingBag, Users } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

type Event = {
  id: string;
  name: string;
  ownerName?: string | null;
  eventDate?: string | null;
  message?: string | null;
  productName?: string | null;
};

export default async function JoinEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  async function joinEvent() {
    "use server";
    try {
      await ensureBackendUserSynced();
      await apiRequest(`/api/v1/events/${id}/join`, { method: "POST" });
      redirect(`/create-family-group?event=${id}`);
    } catch {
      redirect(`/signin?callbackUrl=/join/${id}`);
    }
  }

  let event: Event | null = null;
  try {
    const response = await backendPublicRequest(`/api/v1/events/${id}`);
    event = response?.data ?? null;
  } catch {
    event = null;
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-muted-foreground">This event link is no longer active.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden rounded-3xl bg-foreground text-background">
          <div className="absolute inset-0 bg-gradient-to-br from-black via-black/80 to-black/60" />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=800&fit=crop')",
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
          <div className="relative z-10 p-8">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.4em] text-primary">You&apos;re Invited</p>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <Users className="h-7 w-7 text-primary" />
            </div>
            <p className="mb-1 text-sm text-white/60">{event.ownerName} invites you to</p>
            <h1 className="font-heading text-3xl font-bold text-white sm:text-4xl">{event.name}</h1>
            {event.eventDate ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-white/60">
                <Calendar className="h-4 w-4" />
                {new Date(event.eventDate).toLocaleDateString()}
              </p>
            ) : null}
            {event.message ? <p className="mt-4 text-sm italic leading-relaxed text-white/70">&quot;{event.message}&quot;</p> : null}
            {event.productName ? (
              <div className="mt-5 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <p className="text-xs text-white/50">Featured Outfit</p>
                <p className="mt-0.5 font-heading font-semibold text-white">{event.productName}</p>
              </div>
            ) : null}
          </div>
        </div>

        <form action={joinEvent} className="mt-6">
          <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-4 text-base font-bold text-primary-foreground hover:bg-primary/90">
            <ShoppingBag className="h-4 w-4" />
            Join and Set Up My Family Group
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-center">
          <p className="mb-1 text-xs font-bold text-amber-800">We strongly recommend creating an account</p>
          <p className="text-xs leading-relaxed text-amber-700">
            Your measurements will be saved, your order will be linked to {event.ownerName}&apos;s dashboard, and you&apos;ll receive production updates.
          </p>
        </div>
      </div>
    </div>
  );
}
