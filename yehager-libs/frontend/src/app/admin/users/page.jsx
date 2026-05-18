import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";

const ROLE_OPTIONS = ["customer", "employee", "admin"];
const STATUS_OPTIONS = ["active", "inactive", "suspended"];

function formatDate(value) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusTone(status) {
  if (status === "active") return "bg-green-100 text-green-800";
  if (status === "suspended") return "bg-rose-100 text-rose-800";
  return "bg-amber-100 text-amber-800";
}

export default async function AdminUsersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/users");
  if (!can(session.user.permissions, "employees.view")) redirect("/");
  const query = (await searchParams) ?? {};
  const canCreate = can(session.user.permissions, "employees.create");
  const canEdit = can(session.user.permissions, "employees.edit");
  const canDelete = can(session.user.permissions, "employees.delete");
  const canAssign = can(session.user.permissions, "employees.assign");

  async function createEmployee(formData) {
    "use server";
    try {
      await apiRequest("/api/v1/admin/users/employees", {
        method: "POST",
        body: {
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
        },
      });
      revalidatePath("/admin/users");
      revalidatePath("/admin/audit");
      redirect("/admin/users?created=1");
    } catch {
      redirect("/admin/users?error=create");
    }
  }

  async function updateProfile(formData) {
    "use server";
    const userId = String(formData.get("userId") ?? "");
    try {
      await apiRequest(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        body: {
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
        },
      });
      revalidatePath("/admin/users");
      revalidatePath("/admin/audit");
      redirect("/admin/users?updated=profile");
    } catch {
      redirect("/admin/users?error=profile");
    }
  }

  async function updateRole(formData) {
    "use server";
    const userId = String(formData.get("userId") ?? "");
    const role = String(formData.get("role") ?? "");
    try {
      await apiRequest(`/api/v1/admin/users/${userId}/role`, {
        method: "PATCH",
        body: { role },
      });
      revalidatePath("/admin/users");
      revalidatePath("/admin/audit");
      redirect("/admin/users?updated=role");
    } catch {
      redirect("/admin/users?error=role");
    }
  }

  async function updateStatus(formData) {
    "use server";
    const userId = String(formData.get("userId") ?? "");
    const status = String(formData.get("status") ?? "");
    try {
      await apiRequest(`/api/v1/admin/users/${userId}/status`, {
        method: "PATCH",
        body: { status },
      });
      revalidatePath("/admin/users");
      revalidatePath("/admin/audit");
      redirect("/admin/users?updated=status");
    } catch {
      redirect("/admin/users?error=status");
    }
  }

  async function resetPassword(formData) {
    "use server";
    const userId = String(formData.get("userId") ?? "");
    try {
      await apiRequest(`/api/v1/admin/users/${userId}/password`, {
        method: "PATCH",
        body: { password: String(formData.get("password") ?? "") },
      });
      revalidatePath("/admin/users");
      revalidatePath("/admin/audit");
      redirect("/admin/users?updated=password");
    } catch {
      redirect("/admin/users?error=password");
    }
  }

  async function deleteUser(formData) {
    "use server";
    const userId = String(formData.get("userId") ?? "");
    try {
      await apiRequest(`/api/v1/admin/users/${userId}`, {
        method: "DELETE",
      });
      revalidatePath("/admin/users");
      revalidatePath("/admin/audit");
      redirect("/admin/users?deleted=1");
    } catch {
      redirect("/admin/users?error=delete");
    }
  }

  let users = [];
  try {
    const response = await apiRequest("/api/v1/admin/users?limit=200");
    users = Array.isArray(response?.data) ? response.data : [];
  } catch {
    users = [];
  }

  const employees = users.filter((user) => user.role === "employee");
  const activeUsers = users.filter((user) => user.status === "active").length;
  const suspendedUsers = users.filter((user) => user.status === "suspended").length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Employees</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create staff accounts, control access, and manage employee lifecycle from one place.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Total users", users.length],
          ["Employees", employees.length],
          ["Active users", activeUsers],
          ["Suspended", suspendedUsers],
        ].slice(0, 3).map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {query.created === "1" ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-primary">Employee account created.</div> : null}
      {query.updated ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-primary">Employee updated.</div> : null}
      {query.deleted === "1" ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-primary">User deleted.</div> : null}
      {query.error ? <div className="rounded-xl border border-destructive/40 bg-card p-4 text-sm text-destructive">Could not complete that employee action.</div> : null}

      <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-primary">Create Employee</p>
          <h2 className="mt-2 text-xl font-semibold">New staff account</h2>
          <form action={createEmployee} className="mt-5 space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Name</span>
              <input name="name" required disabled={!canCreate} className="h-11 w-full rounded-xl border border-input bg-background px-3 disabled:opacity-50" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Email</span>
              <input name="email" type="email" required disabled={!canCreate} className="h-11 w-full rounded-xl border border-input bg-background px-3 disabled:opacity-50" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-muted-foreground">Initial Password</span>
              <input name="password" type="password" minLength={8} required disabled={!canCreate} className="h-11 w-full rounded-xl border border-input bg-background px-3 disabled:opacity-50" />
            </label>
            <button disabled={!canCreate} type="submit" className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              Create employee
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {users.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">No users found.</div>
          ) : (
            users.map((user) => (
              <article key={user.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{user.name ?? "Unnamed user"}</h2>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(user.status)}`}>{user.status}</span>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{user.role}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>Joined {formatDate(user.createdAt)}</p>
                    <p>Last login {formatDate(user.lastLoginAt)}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <form action={updateProfile} className="rounded-2xl border border-border bg-background/50 p-4">
                    <input type="hidden" name="userId" value={user.id} />
                    <p className="text-sm font-semibold">Profile</p>
                    <div className="mt-3 space-y-3">
                      <input name="name" defaultValue={user.name ?? ""} disabled={!canEdit} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-50" />
                      <input name="email" type="email" defaultValue={user.email} disabled={!canEdit} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-50" />
                      <button disabled={!canEdit} className="rounded-xl bg-secondary px-3 py-2 text-sm font-medium disabled:opacity-50">Save profile</button>
                    </div>
                  </form>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <form action={updateRole} className="rounded-2xl border border-border bg-background/50 p-4">
                      <input type="hidden" name="userId" value={user.id} />
                      <p className="text-sm font-semibold">Role</p>
                      <select name="role" defaultValue={user.role ?? "customer"} disabled={!canAssign} className="mt-3 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-50">
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      <button disabled={!canAssign} className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm font-medium disabled:opacity-50">Save role</button>
                    </form>

                    <form action={updateStatus} className="rounded-2xl border border-border bg-background/50 p-4">
                      <input type="hidden" name="userId" value={user.id} />
                      <p className="text-sm font-semibold">Status</p>
                      <select name="status" defaultValue={user.status} disabled={!canEdit} className="mt-3 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-50">
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button disabled={!canEdit} className="mt-3 rounded-xl bg-secondary px-3 py-2 text-sm font-medium disabled:opacity-50">Save status</button>
                    </form>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <form action={resetPassword} className="rounded-2xl border border-border bg-background/50 p-4">
                    <input type="hidden" name="userId" value={user.id} />
                    <p className="text-sm font-semibold">Reset password</p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <input name="password" type="password" minLength={8} placeholder="New temporary password" disabled={!canEdit} className="h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm disabled:opacity-50" />
                      <button disabled={!canEdit} className="rounded-xl bg-secondary px-3 py-2 text-sm font-medium disabled:opacity-50">Reset</button>
                    </div>
                  </form>

                  <form action={deleteUser} className="flex items-end">
                    <input type="hidden" name="userId" value={user.id} />
                    <button disabled={!canDelete} className="rounded-xl border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive disabled:opacity-50">
                      Delete user
                    </button>
                  </form>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
