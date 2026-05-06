import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

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
  try {
    const [userRes, measurementRes] = await Promise.all([
      apiRequest("/api/v1/users/me"),
      apiRequest("/api/v1/measurements"),
    ]);
    profile = userRes?.data ?? null;
    measurements = Array.isArray(measurementRes?.data) ? measurementRes.data : [];
  } catch {
    profile = null;
    measurements = [];
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="mb-6 font-heading text-3xl font-semibold">My Account</h1>

      <div className="mb-8 rounded-xl border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-widest text-primary">Profile</p>
        <div className="mt-3 grid gap-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {session?.user?.name ?? profile?.name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {session?.user?.email ?? profile?.email ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Role:</span> {session?.user?.role ?? profile?.role ?? "customer"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-primary">Add Measurements</p>
          <form action={createMeasurement} className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <label className="col-span-2">
              <span className="mb-1 block text-muted-foreground">Label</span>
              <input name="label" defaultValue="My Measurements" className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
            <label className="col-span-2">
              <span className="mb-1 block text-muted-foreground">Gender</span>
              <select name="gender" defaultValue="female" className="h-10 w-full rounded-md border border-input bg-background px-3">
                <option value="female">female</option>
                <option value="male">male</option>
                <option value="unisex">unisex</option>
              </select>
            </label>
            <label>
              <span className="mb-1 block text-muted-foreground">Chest</span>
              <input name="chest" type="number" step="0.01" required className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
            <label>
              <span className="mb-1 block text-muted-foreground">Waist</span>
              <input name="waist" type="number" step="0.01" required className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
            <label>
              <span className="mb-1 block text-muted-foreground">Hips</span>
              <input name="hips" type="number" step="0.01" required className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
            <label>
              <span className="mb-1 block text-muted-foreground">Shoulder Width</span>
              <input name="shoulderWidth" type="number" step="0.01" required className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
            <label>
              <span className="mb-1 block text-muted-foreground">Arm Length</span>
              <input name="armLength" type="number" step="0.01" required className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
            <label>
              <span className="mb-1 block text-muted-foreground">Torso Length</span>
              <input name="torsoLength" type="number" step="0.01" required className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
            <label>
              <span className="mb-1 block text-muted-foreground">Inseam (optional)</span>
              <input name="inseam" type="number" step="0.01" className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
            <label>
              <span className="mb-1 block text-muted-foreground">Neck (optional)</span>
              <input name="neck" type="number" step="0.01" className="h-10 w-full rounded-md border border-input bg-background px-3" />
            </label>
            <button type="submit" className="col-span-2 mt-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              Save Measurement
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-primary">My Measurements</p>
          <div className="mt-4 space-y-3">
            {measurements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No measurements yet.</p>
            ) : (
              measurements.map((m) => (
                <div key={m.id} className="rounded-lg border border-border p-3">
                  <form action={updateMeasurement} className="space-y-2">
                    <input type="hidden" name="measurementId" value={m.id} />
                    <label className="block text-sm">
                      <span className="mb-1 block text-muted-foreground">Label</span>
                      <input name="label" defaultValue={m.label ?? "My Measurements"} className="h-9 w-full rounded-md border border-input bg-background px-3" />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block text-muted-foreground">Gender</span>
                      <select name="gender" defaultValue={m.gender ?? "female"} className="h-9 w-full rounded-md border border-input bg-background px-3">
                        <option value="female">female</option>
                        <option value="male">male</option>
                        <option value="unisex">unisex</option>
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <button type="submit" className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80">
                        Update
                      </button>
                    </div>
                  </form>
                  <form action={deleteMeasurement} className="mt-2">
                    <input type="hidden" name="measurementId" value={m.id} />
                    <button type="submit" className="rounded-md border border-border px-3 py-1.5 text-xs text-destructive hover:bg-secondary">
                      Delete
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
