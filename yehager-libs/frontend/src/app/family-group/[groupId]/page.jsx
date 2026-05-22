import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Check, Plus, ShoppingCart, Trash2, Users } from "lucide-react";
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

    await apiRequest(`/api/v1/family-groups/${groupId}/members`, {
      method: "POST",
      body: {
        name,
        relation: relation || undefined,
        gender,
        measurements,
      },
    });
    revalidatePath(`/family-group/${groupId}`);
  }

  async function renameGroup(formData) {
    "use server";
    await ensureBackendUserSynced();
    const groupName = String(formData.get("groupName") ?? "").trim();
    if (!groupName) return;
    await apiRequest(`/api/v1/family-groups/${groupId}`, {
      method: "PATCH",
      body: { groupName },
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
    try {
      await apiRequest(`/api/v1/family-groups/${groupId}/add-to-cart`, {
        method: "POST",
      });
    } catch {
      redirect(`/signin?callbackUrl=${encodeURIComponent(`/family-group/${groupId}`)}`);
    }
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
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/family-group/${groupId}`)}`);
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
  const readyMembers = members.length - notReadyMembers.length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl bg-foreground p-6 text-background">
        <p className="text-xs uppercase tracking-[0.3em] text-primary">Family Group</p>
        <h1 className="mt-2 font-heading text-4xl font-bold">{group?.groupName}</h1>
        <p className="mt-2 text-sm text-background/70">Event: {group?.eventName}</p>
        <form action={renameGroup} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            name="groupName"
            defaultValue={group?.groupName ?? ""}
            className="h-10 flex-1 rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/50"
          />
          <button type="submit" className="rounded-md bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
            Rename Group
          </button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-primary">Members</p>
          <p className="mt-2 font-heading text-3xl font-bold">{members.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-primary">Ready</p>
          <p className="mt-2 font-heading text-3xl font-bold">{readyMembers}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-primary">Needs work</p>
          <p className="mt-2 font-heading text-3xl font-bold">{notReadyMembers.length}</p>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm font-semibold">Ordering for your whole family?</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add each family member, assign a product, and complete the required measurements. Everyone gets their own custom outfit, and you checkout all at once in a single order.
        </p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
        <h2 className="flex items-center gap-2 font-heading text-xl font-semibold"><Plus className="h-5 w-5 text-primary" /> Add Member</h2>
        <p className="mt-1 text-xs text-muted-foreground">Add the person and their required measurements in one step, like the Base44 group order flow.</p>
        <form action={addMember} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input name="name" required placeholder="Name" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <select name="relation" defaultValue="Other" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            {["Myself", "Husband", "Wife", "Son", "Daughter", "Other"].map((relation) => (
              <option key={relation} value={relation}>{relation}</option>
            ))}
          </select>
          <select name="gender" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="female">female</option>
            <option value="male">male</option>
            <option value="unisex">unisex</option>
          </select>
          <input name="chest" type="number" step="0.5" min="0" required placeholder="Chest" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <input name="waist" type="number" step="0.5" min="0" required placeholder="Waist" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <input name="hips" type="number" step="0.5" min="0" required placeholder="Hips" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <input name="shoulderWidth" type="number" step="0.5" min="0" required placeholder="Shoulder Width" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <input name="armLength" type="number" step="0.5" min="0" required placeholder="Arm Length" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <input name="torsoLength" type="number" step="0.5" min="0" required placeholder="Torso Length" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <input name="inseam" type="number" step="0.5" min="0" placeholder="Inseam" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <input name="neck" type="number" step="0.5" min="0" placeholder="Neck" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:col-span-3">
            <Plus className="mr-1 inline h-3.5 w-3.5" /> Add to Family Group
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-heading text-xl font-semibold"><Users className="h-5 w-5 text-primary" /> Members ({members.length})</h2>
        {members.length === 0 ? (
          <div className="mt-4 rounded-2xl border-2 border-dashed border-border py-12 text-center">
            <Users className="mx-auto mb-3 h-12 w-12 text-primary/40" />
            <h3 className="font-heading text-xl font-semibold">Start with yourself, then add your family</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">Add each person with their measurements so every outfit fits perfectly.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {members.map((m) => (
              <div key={m.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {String(m.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.relation ?? "Member"} · {m.gender}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className={`rounded-full px-2 py-0.5 ${m.productId ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {m.productId ? "Product selected" : "Missing product"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 ${REQUIRED_MEASUREMENT_FIELDS.every((field) => m.measurements?.[field] !== null && m.measurements?.[field] !== undefined && String(m.measurements?.[field]).trim() !== "") ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {REQUIRED_MEASUREMENT_FIELDS.every((field) => m.measurements?.[field] !== null && m.measurements?.[field] !== undefined && String(m.measurements?.[field]).trim() !== "") ? "Measurements ready" : "Measurements incomplete"}
                    </span>
                  </div>
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
                    <button type="submit" className="inline-flex items-center justify-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-secondary">
                      <Check className="h-3 w-3" /> Save Details
                    </button>
                  </form>
                </div>
                <form action={removeMember}>
                  <input type="hidden" name="memberId" value={m.id} />
                  <button type="submit" className="inline-flex items-center gap-1 rounded border border-border px-2.5 py-1 text-xs text-destructive hover:bg-secondary">
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                </form>
                </div>
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
          <ShoppingCart className="mr-1 inline h-4 w-4" /> Add All to Cart & Checkout
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
