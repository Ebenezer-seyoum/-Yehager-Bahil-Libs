import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { GroupOrdersList } from "@/components/group-orders-list";

export default async function GroupOrdersPage() {
  let groups = [];
  try {
    await ensureBackendUserSynced();
  const response: any = await apiRequest("/api/v1/family-groups/mine");
groups = Array.isArray(response?.data) ? response.data : [];
  } catch {
    redirect("/signin?callbackUrl=/group-orders");
  }
  return <GroupOrdersList groups={groups} />;
}
