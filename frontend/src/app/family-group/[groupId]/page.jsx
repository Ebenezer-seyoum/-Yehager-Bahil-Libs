import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { FamilyGroupCustomerWorkspace } from "@/components/family-group-customer-workspace";

function toOptionalNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const number = Number(raw);
  return Number.isFinite(number) ? number : undefined;
}

const REQUIRED_MEASUREMENTS = ["chest", "waist", "hips", "shoulderWidth", "armLength", "torsoLength"];

export default async function FamilyGroupPage({ params, searchParams }) {
  const { groupId } = await params;
  const query = await searchParams;

  async function addMember(formData) {
    "use server";
    await ensureBackendUserSynced();
    const measurementId = String(formData.get("measurementId") ?? "").trim();
    const measurements = Object.fromEntries(
      [
        "chest",
        "waist",
        "hips",
        "shoulderWidth",
        "armLength",
        "torsoLength",
        "inseam",
        "neck",
        "bicepCircumference",
        "wristCircumference",
        "pantsWaist",
        "pantsHip",
        "thighCircumference",
        "waistToPantsLength",
        "hemStyle",
        "pressingStyle",
      ].map((field) => {
        if (field === "hemStyle" || field === "pressingStyle") return [field, String(formData.get(field) ?? "")];
        let val = formData.get(field);
        if (field === "hips" && !val) val = formData.get("pantsHip");
        if (field === "pantsHip" && !val) val = formData.get("hips");
        return [field, toOptionalNumber(val)];
      }),
    );
    await apiRequest(`/api/v1/family-groups/${groupId}/members`, {
      method: "POST",
      body: {
        name: String(formData.get("name") ?? "").trim(),
        relation: String(formData.get("relation") ?? "Other"),
        gender: String(formData.get("gender") ?? "male"),
        measurements,
        measurementId: measurementId || undefined,
      },
    });
    revalidatePath(`/family-group/${groupId}`);
  }

  async function renameGroup(formData) {
    "use server";
    await ensureBackendUserSynced();
    const groupName = String(formData.get("groupName") ?? "").trim();
    if (!groupName) return;
    await apiRequest(`/api/v1/family-groups/${groupId}`, { method: "PATCH", body: { groupName } });
    revalidatePath(`/family-group/${groupId}`);
  }

  async function removeMember(formData) {
    "use server";
    await ensureBackendUserSynced();
    const memberId = String(formData.get("memberId") ?? "");
    if (!memberId) return;
    await apiRequest(`/api/v1/family-groups/${groupId}/members/${memberId}`, { method: "DELETE" });
    revalidatePath(`/family-group/${groupId}`);
  }

  async function addAllToCart() {
    "use server";
    await ensureBackendUserSynced();
    await apiRequest(`/api/v1/family-groups/${groupId}/add-to-cart`, { method: "POST" });
    revalidatePath("/cart");
    redirect("/cart");
  }

  let payload;
  let savedMeasurements = [];
  try {
    await ensureBackendUserSynced();
    const [groupResponse, measurementResponse] = await Promise.all([
      apiRequest(`/api/v1/family-groups/${groupId}`),
      apiRequest("/api/v1/measurements"),
    ]);
    payload = groupResponse?.data;
    savedMeasurements = Array.isArray(measurementResponse?.data) ? measurementResponse.data : [];
  } catch {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/family-group/${groupId}`)}`);
  }

  const group = payload?.group ?? {};
  const members = Array.isArray(payload?.members) ? payload.members : [];
  const selectedDesign = payload?.selectedDesign ?? null;
  const hasSharedSource = Boolean(group.productId || group.uploadedDesignId);
  const readyMembers = members.filter((member) => hasSharedSource && REQUIRED_MEASUREMENTS.every((field) => {
    const value = member.measurements?.[field];
    return value !== null && value !== undefined && String(value).trim() !== "";
  })).length;

  return (
    <FamilyGroupCustomerWorkspace
      groupId={groupId}
      group={group}
      members={members}
      selectedDesign={selectedDesign}
      selectionResult={typeof query?.selected === "string" ? query.selected : null}
      savedMeasurements={savedMeasurements}
      readyMembers={readyMembers}
      canAddAllToCart={members.length > 0 && readyMembers === members.length && (!group.uploadedDesignId || selectedDesign?.status === "awaiting_payment")}
      addMember={addMember}
      renameGroup={renameGroup}
      removeMember={removeMember}
      addAllToCart={addAllToCart}
    />
  );
}
