import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiRequest } from "@/lib/api-client";
import { backendPublicRequest } from "@/lib/backend-public";
import { ensureBackendUserSynced } from "@/lib/backend-user-sync";

function toOptionalNumber(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

const REQUIRED_MEASUREMENT_FIELDS = [
  "chest",
  "waist",
  "hips",
  "shoulderWidth",
  "armLength",
  "torsoLength",
];

export default async function FamilyGroupPage({ params }) {
  const { groupId } = await params;

  async function addMember(formData) {
    "use server";
    await ensureBackendUserSynced();

    const name = String(formData.get("name") ?? "").trim();
    const relation = String(formData.get("relation") ?? "").trim();
    const gender = String(formData.get("gender") ?? "female");
    if (!name) return;

    await apiRequest(`/api/v1/family-groups/${groupId}/members`, {
      method: "POST",
      body: {
        name,
        relation: relation || undefined,
        gender,
      },
    });
    revalidatePath(`/family-group/${groupId}`);
  }

  async function removeMember(formData) {
    "use server";
    await ensureBackendUserSynced();
    const memberId = String(formData.get("memberId") ?? "");
    if (!memberId) return;
    await apiRequest(`/api/v1/family-groups/${groupId}/members/${memberId}`, {
      method: "DELETE",
    });
    revalidatePath(`/family-group/${groupId}`);
  }

  async function updateMemberDetails(formData) {
    "use server";
    await ensureBackendUserSynced();
    const memberId = String(formData.get("memberId") ?? "");
    const productId = String(formData.get("productId") ?? "");
    const relation = String(formData.get("relation") ?? "").trim();
    const gender = String(formData.get("gender") ?? "female");
    if (!memberId) return;

    const measurements = {
      chest: toOptionalNumber(formData.get("chest")),
      waist: toOptionalNumber(formData.get("waist")),
      hips: toOptionalNumber(formData.get("hips")),
      shoulderWidth: toOptionalNumber(formData.get("shoulderWidth")),
      armLength: toOptionalNumber(formData.get("armLength")),
      torsoLength: toOptionalNumber(formData.get("torsoLength")),
      inseam: toOptionalNumber(formData.get("inseam")),
      neck: toOptionalNumber(formData.get("neck")),
    };

    await apiRequest(`/api/v1/family-groups/${groupId}/members/${memberId}`, {
      method: "PATCH",
      body: {
        relation: relation || undefined,
        gender,
        productId: productId || null,
        measurements,
      },
    });
    revalidatePath(`/family-group/${groupId}`);
  }

  async function addAllToCart() {
    "use server";
    await ensureBackendUserSynced();
    await apiRequest(`/api/v1/family-groups/${groupId}/add-to-cart`, {
      method: "POST",
    });
    revalidatePath("/cart");
    redirect("/cart");
  }

  let payload;
  let products = [];
  try {
    await ensureBackendUserSynced();
    const [groupResponse, productResponse] = await Promise.all([
      apiRequest(`/api/v1/family-groups/${groupId}`),
      backendPublicRequest("/api/v1/products?limit=150"),
    ]);
    const response = groupResponse;
    payload = response?.data;
    products = Array.isArray(productResponse?.data) ? productResponse.data : [];
  } catch {
    redirect("/events");
  }

  const group = payload?.group;
  const members = Array.isArray(payload?.members) ? payload.members : [];
  const notReadyMembers = members.filter((m) => {
    const hasProduct = Boolean(m.productId);
    const measurements = m.measurements ?? {};
    const hasRequiredMeasurements = REQUIRED_MEASUREMENT_FIELDS.every((field) => {
      const value = measurements[field];
      return value !== null && value !== undefined && String(value).trim() !== "";
    });
    return !hasProduct || !hasRequiredMeasurements;
  });
  const canAddAllToCart = members.length > 0 && notReadyMembers.length === 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-foreground p-6 text-background">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Family Group</p>
        <h1 className="mt-2 font-heading text-4xl font-bold">{group?.groupName}</h1>
        <p className="mt-2 text-sm text-background/70">Event: {group?.eventName}</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-semibold">Add Member</h2>
        <form action={addMember} className="mt-3 grid gap-3 sm:grid-cols-3">
          <input name="name" required placeholder="Name" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <input name="relation" placeholder="Relation" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="gender" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="female">female</option>
            <option value="male">male</option>
            <option value="unisex">unisex</option>
          </select>
          <button type="submit" className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Add Member
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-heading text-xl font-semibold">Members ({members.length})</h2>
        {members.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.relation ?? "Member"} · {m.gender}
                  </p>
                  <form action={updateMemberDetails} className="mt-3 grid gap-2 sm:grid-cols-3">
                    <input type="hidden" name="memberId" value={m.id} />
                    <input
                      name="relation"
                      defaultValue={m.relation ?? ""}
                      placeholder="Relation"
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    />
                    <select
                      name="gender"
                      defaultValue={m.gender ?? "female"}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="female">female</option>
                      <option value="male">male</option>
                      <option value="unisex">unisex</option>
                    </select>
                    <select
                      name="productId"
                      defaultValue={m.productId ?? ""}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="">No product selected</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input name="chest" type="number" step="0.01" defaultValue={m.measurements?.chest ?? ""} placeholder="Chest" className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
                    <input name="waist" type="number" step="0.01" defaultValue={m.measurements?.waist ?? ""} placeholder="Waist" className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
                    <input name="hips" type="number" step="0.01" defaultValue={m.measurements?.hips ?? ""} placeholder="Hips" className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
                    <input name="shoulderWidth" type="number" step="0.01" defaultValue={m.measurements?.shoulderWidth ?? ""} placeholder="Shoulder Width" className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
                    <input name="armLength" type="number" step="0.01" defaultValue={m.measurements?.armLength ?? ""} placeholder="Arm Length" className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
                    <input name="torsoLength" type="number" step="0.01" defaultValue={m.measurements?.torsoLength ?? ""} placeholder="Torso Length" className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
                    <input name="inseam" type="number" step="0.01" defaultValue={m.measurements?.inseam ?? ""} placeholder="Inseam" className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
                    <input name="neck" type="number" step="0.01" defaultValue={m.measurements?.neck ?? ""} placeholder="Neck" className="h-8 rounded-md border border-input bg-background px-2 text-xs" />
                    <button type="submit" className="rounded border border-border px-2 py-1 text-xs hover:bg-secondary">
                      Save Details
                    </button>
                  </form>
                </div>
                <form action={removeMember}>
                  <input type="hidden" name="memberId" value={m.id} />
                  <button type="submit" className="rounded border border-border px-2.5 py-1 text-xs text-destructive hover:bg-secondary">
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      <form action={addAllToCart}>
        <button
          type="submit"
          disabled={!canAddAllToCart}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add All to Cart
        </button>
      </form>
      {!canAddAllToCart ? (
        <div className="rounded-md border border-border bg-card p-3 text-sm">
          <p className="font-medium">Complete member setup before adding all to cart.</p>
          {members.length === 0 ? (
            <p className="mt-1 text-muted-foreground">Add at least one member first.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {notReadyMembers.map((m) => (
                <li key={m.id}>
                  {m.name}: missing product and/or required measurements (chest, waist, hips, shoulder width, arm length, torso length)
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
