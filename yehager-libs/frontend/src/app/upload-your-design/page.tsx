import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { UploadDesignWizard } from "@/components/upload-design-wizard";

export default async function UploadYourDesignPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const familyGroupId = typeof query.groupId === "string" ? query.groupId : undefined;
  const eventId = typeof query.eventId === "string" ? query.eventId : undefined;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    const callback = new URLSearchParams();
    if (familyGroupId) callback.set("groupId", familyGroupId);
    if (eventId) callback.set("eventId", eventId);
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/upload-your-design${callback.size ? `?${callback}` : ""}`)}`);
  }

  return <UploadDesignWizard familyGroupId={familyGroupId} eventId={eventId} />;
}
