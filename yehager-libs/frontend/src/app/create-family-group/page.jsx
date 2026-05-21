import { redirect } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

async function findEventByCode(eventCode) {
  if (!eventCode) return null;
  const eventsRes = await backendPublicRequest("/api/v1/events?limit=200");
  const events = Array.isArray(eventsRes?.data) ? eventsRes.data : [];
  return events.find((event) => String(event.eventCode ?? "").toUpperCase() === eventCode.toUpperCase()) ?? null;
}

export default async function CreateFamilyGroupPage({ searchParams }) {
  const params = await searchParams;
  const eventId = typeof params?.event === "string" ? params.event : "";
  const groupName = typeof params?.groupName === "string" ? params.groupName.trim() : "";
  const eventCode = typeof params?.eventCode === "string" ? params.eventCode.trim().toUpperCase() : "";
  let eventCodeNotFound = false;

  if (!eventId && !groupName) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="font-heading text-2xl font-bold">Missing group details</h1>
        <p className="mt-2 text-muted-foreground">Open Our Home Cart to create a group order.</p>
      </div>
    );
  }

  let createdGroupId = "";

  try {
    await ensureBackendUserSynced();

    let resolvedEventId = eventId;
    let resolvedEventName = "Group Order";

    if (resolvedEventId) {
      const eventRes = await apiRequest(`/api/v1/events/${resolvedEventId}`);
      resolvedEventName = eventRes?.data?.name ?? "Event";
    } else if (eventCode) {
      const event = await findEventByCode(eventCode);
      if (!event?.id) {
        eventCodeNotFound = true;
        throw new Error("EVENT_CODE_NOT_FOUND");
      }
      resolvedEventId = event.id;
      resolvedEventName = event.name ?? "Event";
      await apiRequest(`/api/v1/events/${resolvedEventId}/join`, { method: "POST" }).catch(() => null);
    } else {
      const eventRes = await apiRequest("/api/v1/events", {
        method: "POST",
        body: {
          name: groupName,
          message: "Family group order created from Our Home Cart.",
        },
      });
      resolvedEventId = eventRes?.data?.id;
      resolvedEventName = eventRes?.data?.name ?? groupName;
    }

    const groupRes = await apiRequest("/api/v1/family-groups", {
      method: "POST",
      body: {
        groupName: groupName || `${resolvedEventName} Family`,
        eventId: resolvedEventId,
      },
    });
    const groupId = groupRes?.data?.id;
    if (groupId) {
      createdGroupId = groupId;
    }
  } catch {
    if (eventCodeNotFound) {
      return (
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <p className="font-heading text-2xl font-semibold">Event code not found</p>
          <p className="mt-2 text-sm text-muted-foreground">Please check the code and create the group again.</p>
        </div>
      );
    }
    const callback = eventId
      ? `/create-family-group?event=${encodeURIComponent(eventId)}`
      : `/create-family-group?groupName=${encodeURIComponent(groupName)}${eventCode ? `&eventCode=${encodeURIComponent(eventCode)}` : ""}`;
    redirect(`/signin?callbackUrl=${encodeURIComponent(callback)}`);
  }

  if (createdGroupId) {
    redirect(`/family-group/${createdGroupId}`);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.35em] text-primary">Family Group</p>
      <h1 className="mt-2 font-heading text-3xl font-bold">Setting up your family group</h1>
      <p className="mt-2 text-sm text-muted-foreground">We are preparing your household order workspace.</p>
    </div>
  );
}
