import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminUsersDirectory } from "@/components/admin-users-directory";

const STATUS_OPTIONS = ["active", "inactive", "suspended"];

function hrefFor(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  return `/admin/users?${search.toString()}`;
}

export default async function AdminUsersPage({ searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/users");
  if (!can(session.user.permissions, "employees.view")) redirect("/");

  const query = (await searchParams) ?? {};
  const canCreate = can(session.user.permissions, "employees.create");

  async function createEmployee(formData) {
    "use server";
    try {
      await apiRequest("/api/v1/admin/users/employees", {
        method: "POST",
        body: {
          name: String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
          roleId: String(formData.get("roleId") ?? "") || undefined,
          status: String(formData.get("status") ?? "") || undefined,
        },
      });
      revalidatePath("/admin/users");
      revalidatePath("/admin/audit");
      redirect("/admin/users?created=1");
    } catch {
      redirect("/admin/users?error=create");
    }
  }


  let users = [];
  let roles = [];
  try {
    const [response, rolesResponse] = await Promise.all([
      apiRequest("/api/v1/admin/users?limit=200"),
      apiRequest("/api/v1/admin/roles"),
    ]);
    users = Array.isArray(response?.data) ? response.data : [];
    roles = Array.isArray(rolesResponse?.data) ? rolesResponse.data : [];
  } catch {
    users = [];
    roles = [];
  }

  const search = String(query.q ?? "").trim().toLowerCase();
  const filteredUsers = search
    ? users.filter((user) =>
        [user.name, user.email, user.role, user.status]
          .some((value) => String(value ?? "").toLowerCase().includes(search)),
      )
    : users;
  const panelMode = query.panel === "create" ? "create" : "manage";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">Users</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold">{panelMode === "create" ? "New User" : "All Users"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {panelMode === "create"
              ? "Complete the form below to create a new user account with the right role and status."
              : "Search, review, and manage staff accounts from one workspace."}
          </p>
        </div>
        <Link
          href={hrefFor({ panel: "create", q: query.q })}
          className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground sm:w-auto"
        >
          + Add employee
        </Link>
      </div>

      {query.created === "1" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">Success — employee account created.</div> : null}
      {query.updated ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">Success — employee information updated.</div> : null}
      {query.deleted === "1" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">Success — user was deleted.</div> : null}
      {query.error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">Action failed — please review the user details and try again.</div> : null}

      {panelMode === "create" ? (
        <section className="overflow-hidden rounded-[28px] border border-border bg-card">
          <div className="border-t-4 border-primary bg-background/60 px-5 py-8 text-center sm:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-2xl">👤</span>
            </div>
            <h2 className="mt-5 text-3xl font-semibold">Register New User</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
              Complete the form below to create a new user account with appropriate permissions and access levels.
            </p>
          </div>

          <form action={createEmployee} className="space-y-6 p-5 sm:p-6">
            <section className="rounded-3xl border border-border bg-primary/[0.03] p-5">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-widest text-primary">Profile Picture</p>
                <h3 className="mt-2 text-xl font-semibold">Profile Picture</h3>
                <p className="mt-1 text-sm text-muted-foreground">Upload a clear profile photo for identification.</p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-border bg-card text-3xl text-primary">👤</div>
                <div className="flex-1">
                  <label className="block text-sm">
                    <span className="mb-2 block font-medium">Upload profile picture</span>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input type="text" disabled value="Choose file  No file chosen" className="h-12 flex-1 rounded-xl border border-input bg-background px-4 text-muted-foreground" />
                      <button type="button" className="rounded-xl border border-border px-5 py-3 text-sm font-medium">
                        Browse
                      </button>
                    </div>
                  </label>
                  <p className="mt-2 text-xs text-muted-foreground">Recommended: Square image, max 2MB</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-background/50 p-5">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-widest text-primary">Personal Information</p>
                <h3 className="mt-2 text-xl font-semibold">Account Information</h3>
                <p className="mt-1 text-sm text-muted-foreground">Basic personal details and identification information.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Full name *</span>
                  <input name="name" required disabled={!canCreate} className="h-12 w-full rounded-xl border border-input bg-background px-4 disabled:opacity-50" />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Email *</span>
                  <input name="email" type="email" required disabled={!canCreate} className="h-12 w-full rounded-xl border border-input bg-background px-4 disabled:opacity-50" />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="mb-2 block font-medium">Initial password *</span>
                  <input name="password" type="password" minLength={8} required disabled={!canCreate} className="h-12 w-full rounded-xl border border-input bg-background px-4 disabled:opacity-50" />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-background/50 p-5">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-widest text-primary">Contact Information</p>
                <h3 className="mt-2 text-xl font-semibold">Contact Information</h3>
                <p className="mt-1 text-sm text-muted-foreground">Primary contact details for communication.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Phone number</span>
                  <input disabled className="h-12 w-full rounded-xl border border-input bg-background px-4" placeholder="+251 ..." />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Work email</span>
                  <input disabled className="h-12 w-full rounded-xl border border-input bg-background px-4" placeholder="user@example.com" />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-background/50 p-5">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-widest text-primary">Address Information</p>
                <h3 className="mt-2 text-xl font-semibold">Address Information</h3>
                <p className="mt-1 text-sm text-muted-foreground">Complete residential address details.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {["Citizenship", "Region", "Zone", "Woreda", "Kebele"].map((label) => (
                  <label key={label} className="block text-sm">
                    <span className="mb-2 block font-medium">{label}</span>
                    <input disabled className="h-12 w-full rounded-xl border border-input bg-background px-4" placeholder={label === "Kebele" ? "Enter kebele" : `Select ${label}`} />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-background/50 p-5">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-widest text-primary">Employment Information</p>
                <h3 className="mt-2 text-xl font-semibold">Employment Information</h3>
                <p className="mt-1 text-sm text-muted-foreground">Professional and employment details.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Education level</span>
                  <input disabled className="h-12 w-full rounded-xl border border-input bg-background px-4" placeholder="Select education level" />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Employment date</span>
                  <input disabled className="h-12 w-full rounded-xl border border-input bg-background px-4" placeholder="mm/dd/yyyy" />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-primary/15 bg-primary/[0.04] p-5">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-widest text-primary">Permissions and Status</p>
                <h3 className="mt-2 text-xl font-semibold">Permissions and Status</h3>
                <p className="mt-1 text-sm text-muted-foreground">Choose the employee user type and starting account availability.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Role / user type *</span>
                  <select name="roleId" disabled={!canCreate} className="h-12 w-full rounded-xl border border-input bg-background px-4 disabled:opacity-50">
                    <option value="">Default employee</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block font-medium">Status *</span>
                  <select name="status" defaultValue="active" disabled={!canCreate} className="h-12 w-full rounded-xl border border-input bg-background px-4 disabled:opacity-50">
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Link href="/admin/users" className="rounded-xl border border-border px-5 py-3 text-center text-sm font-medium">
                Back to users
              </Link>
              <button disabled={!canCreate} type="submit" className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                + Create employee
              </button>
            </div>
          </form>
        </section>
      ) : (
      <AdminUsersDirectory users={filteredUsers} query={query.q} />
      )}
    </div>
  );
}
