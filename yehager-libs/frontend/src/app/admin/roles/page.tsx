import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";

type Role = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
};

type Permission = {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string | null;
};

function groupPermissions(permissions: Permission[]) {
  return permissions.reduce<Record<string, Permission[]>>((groups, permission) => {
    groups[permission.resource] ??= [];
    groups[permission.resource].push(permission);
    return groups;
  }, {});
}

export default async function AdminRolesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/roles");
  if (!can(session.user.permissions, "roles.view")) redirect("/");
  const query = await searchParams;
  const canManageRoles = can(session.user.permissions, "roles.manage");

  async function updateRolePermissions(formData: FormData) {
    "use server";

    const roleId = String(formData.get("roleId") ?? "");
    const permissionKeys = formData.getAll("permissions").map(String);
    try {
      await apiRequest(`/api/v1/admin/roles/${roleId}/permissions`, {
        method: "PUT",
        body: { permissions: permissionKeys },
      });
      revalidatePath("/admin/roles");
      revalidatePath("/admin/audit");
      redirect("/admin/roles?saved=1");
    } catch {
      redirect("/admin/roles?error=1");
    }
  }

  let roles: Role[] = [];
  let permissions: Permission[] = [];
  try {
    const [rolesResponse, permissionsResponse] = await Promise.all([
      apiRequest<{ data: Role[] }>("/api/v1/admin/roles"),
      apiRequest<{ data: Permission[] }>("/api/v1/admin/permissions"),
    ]);
    roles = rolesResponse.data ?? [];
    permissions = permissionsResponse.data ?? [];
  } catch {
    roles = [];
    permissions = [];
  }

  const permissionGroups = groupPermissions(permissions);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Admin</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Control what each role can see and do across menus, pages, widgets, and API actions.
        </p>
      </div>

      {query.saved === "1" ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-primary">Role permissions updated.</div>
      ) : null}
      {query.error === "1" ? (
        <div className="rounded-xl border border-destructive/40 bg-card p-4 text-sm text-destructive">
          Could not update role permissions.
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Permission Catalog</p>
            <h2 className="mt-2 text-xl font-semibold">Available capabilities</h2>
          </div>
          <p className="text-sm text-muted-foreground">{permissions.length} permissions across {Object.keys(permissionGroups).length} modules</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(permissionGroups).map(([resource, items]) => (
            <div key={resource} className="rounded-2xl border border-border bg-background/60 p-4">
              <p className="font-medium capitalize">{resource}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {items.map((permission) => (
                  <span key={permission.id} className="rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
                    {permission.action}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-5">
        {roles.map((role) => (
          <form key={role.id} action={updateRolePermissions} className="rounded-2xl border border-border bg-card p-5">
            <input type="hidden" name="roleId" value={role.id} />

            <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{role.name}</h2>
                  {role.isSystem ? (
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">System role</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{role.description ?? "No description provided."}</p>
              </div>
              <div className="rounded-xl bg-secondary px-3 py-2 text-sm">
                <span className="font-semibold text-primary">{role.permissions.length}</span>{" "}
                <span className="text-muted-foreground">permissions enabled</span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {Object.entries(permissionGroups).map(([resource, items]) => (
                <fieldset key={resource} className="rounded-2xl border border-border bg-background/50 p-4">
                  <legend className="px-1 text-sm font-semibold capitalize">{resource}</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {items.map((permission) => (
                      <label key={permission.id} className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
                        <input
                          type="checkbox"
                          name="permissions"
                          value={permission.key}
                          defaultChecked={role.permissions.includes(permission.key)}
                          disabled={!canManageRoles}
                          className="mt-1"
                        />
                        <span>
                          <span className="block font-medium">{permission.action}</span>
                          <span className="block text-xs text-muted-foreground">{permission.key}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={!canManageRoles}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save permissions
              </button>
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
