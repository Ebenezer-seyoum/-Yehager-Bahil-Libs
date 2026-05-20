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

export default async function MyAccountPage() {
  async function createMeasurement(formData) {
    "use server";
    await ensureBackendUserSynced();

    const body = {
      label: String(formData.get("label") ?? "My Measurements"),
      gender: String(formData.get("gender") ?? "female"),
      chest: Number(formData.get("chest")),
      waist: Number(formData.get("waist")),
      hips: Number(formData.get("hips")),
      shoulderWidth: Number(formData.get("shoulderWidth")),
      armLength: Number(formData.get("armLength")),
      torsoLength: Number(formData.get("torsoLength")),
      inseam: toOptionalNumber(formData.get("inseam")),
      neck: toOptionalNumber(formData.get("neck")),
    };

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

    const body = {
      label: String(formData.get("label") ?? "My Measurements"),
      gender: String(formData.get("gender") ?? "female"),
    };

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
  let events = [];
  try {
    const [userRes, measurementRes, ordersRes, eventsRes] = await Promise.all([
      apiRequest("/api/v1/users/me"),
      apiRequest("/api/v1/measurements"),
      apiRequest("/api/v1/orders/me?limit=50"),
      apiRequest("/api/v1/events/mine?limit=50"),
    ]);
    profile = userRes?.data ?? null;
    measurements = Array.isArray(measurementRes?.data) ? measurementRes.data : [];
    orders = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
    events = Array.isArray(eventsRes?.data) ? eventsRes.data : [];
  } catch {
    profile = null;
    measurements = [];
    orders = [];
    events = [];
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
      events={events}
      measurements={measurements}
      createMeasurement={createMeasurement}
      updateMeasurement={updateMeasurement}
      deleteMeasurement={deleteMeasurement}
    />
  );
}
