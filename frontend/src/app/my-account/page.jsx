import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";
import { CustomerAccountDashboard } from "@/components/customer-account-dashboard";

function toOptionalNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function buildMeasurementBody(formData) {
  return {
    label: String(formData.get("label") ?? "My Measurements"),
    gender: String(formData.get("gender") ?? "female"),
    chest: Number(formData.get("chest")),
    waist: Number(formData.get("waist")),
    hips: Number(formData.get("pantsHip") || formData.get("hips")),
    shoulderWidth: Number(formData.get("shoulderWidth")),
    armLength: Number(formData.get("armLength")),
    torsoLength: Number(formData.get("torsoLength")),
    neck: toOptionalNumber(formData.get("neck")),
    bicepCircumference: toOptionalNumber(formData.get("bicepCircumference")),
    wristCircumference: toOptionalNumber(formData.get("wristCircumference")),
    pantsWaist: toOptionalNumber(formData.get("pantsWaist")),
    pantsHip: toOptionalNumber(formData.get("pantsHip")),
    thighCircumference: toOptionalNumber(formData.get("thighCircumference")),
    waistToPantsLength: toOptionalNumber(formData.get("waistToPantsLength")),
    hemStyle: String(formData.get("hemStyle") ?? "Straight"),
    pressingStyle: String(formData.get("pressingStyle") ?? "Creased"),
    tailorNote: String(formData.get("tailorNote") ?? ""),
    inseam: toOptionalNumber(formData.get("inseam")),
  };
}

export default async function MyAccountPage() {
  async function createMeasurement(formData) {
    "use server";
    await ensureBackendUserSynced();

    const body = buildMeasurementBody(formData);

    await apiRequest("/api/v1/measurements", {
      method: "POST",
      body,
    });
    revalidatePath("/my-account");
  }

  async function updateMeasurement(formData) {
    "use server";
    await ensureBackendUserSynced();

    const measurementId = String(formData.get("measurementId") ?? "");
    if (!measurementId) return;

    const body = buildMeasurementBody(formData);

    await apiRequest(`/api/v1/measurements/${measurementId}`, {
      method: "PATCH",
      body,
    });
    revalidatePath("/my-account");
  }

  async function deleteMeasurement(formData) {
    "use server";
    await ensureBackendUserSynced();

    const measurementId = String(formData.get("measurementId") ?? "");
    if (!measurementId) return;

    await apiRequest(`/api/v1/measurements/${measurementId}`, {
      method: "DELETE",
    });
    revalidatePath("/my-account");
  }

  const session = await getServerSession(authOptions);
  await ensureBackendUserSynced();

  let profile = null;
  let measurements = [];
  let orders = [];

  // Use allSettled so a failure in one call doesn't reset the others
  const [userRes, measurementRes, ordersRes] = await Promise.allSettled([
    apiRequest("/api/v1/users/me"),
    apiRequest("/api/v1/measurements"),
    apiRequest("/api/v1/orders/me?limit=50"),
  ]);

  if (userRes.status === "fulfilled") {
    profile = userRes.value?.data ?? null;
  }
  if (measurementRes.status === "fulfilled") {
    const raw = measurementRes.value;
    // Handle both { data: [...] } and direct array responses
    measurements = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
  }
  if (ordersRes.status === "fulfilled") {
    orders = Array.isArray(ordersRes.value?.data) ? ordersRes.value.data : [];
  }

  return (
    <CustomerAccountDashboard
      profile={{
        ...(profile ?? {}),
        name: session?.user?.name ?? profile?.name,
        email: session?.user?.email ?? profile?.email,
        role: session?.user?.role ?? profile?.role ?? "customer",
      }}
      orders={orders}
      measurements={measurements}
      createMeasurement={createMeasurement}
      updateMeasurement={updateMeasurement}
      deleteMeasurement={deleteMeasurement}
    />
  );
}
