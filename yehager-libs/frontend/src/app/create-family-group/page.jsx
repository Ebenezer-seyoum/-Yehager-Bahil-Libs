import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

export default async function CreateFamilyGroupPage({ searchParams }) {
  const eventId = searchParams?.event;

  if (!eventId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-muted-foreground">Missing event id. Open this page from an event invite.</p>
      </div>
    );
  }

  try {
    await ensureBackendUserSynced();
    const eventRes = await apiRequest(`/api/v1/events/${eventId}`);
    const event = eventRes?.data;
    const groupRes = await apiRequest("/api/v1/family-groups", {
      method: "POST",
      body: {
        groupName: `${event?.name ?? "Event"} Family`,
        eventId,
      },
    });
    const groupId = groupRes?.data?.id;
    if (groupId) {
      redirect(`/family-group/${groupId}`);
    }
  } catch {
    redirect(`/signin?callbackUrl=/create-family-group?event=${eventId}`);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <p className="text-muted-foreground">Creating your family group...</p>
    </div>
  );
}
