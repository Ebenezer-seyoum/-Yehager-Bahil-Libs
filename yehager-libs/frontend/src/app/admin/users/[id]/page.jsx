import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { AdminUserProfilePanel } from "@/components/admin-user-profile-panel";

export default async function AdminUserDetailPage({ params, searchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/users");
  if (!can(session.user.permissions, "employees.view")) redirect("/");

  const { id } = await params;
  const query = (await searchParams) ?? {};
  let user = null;
  try {
    const response = await apiRequest("/api/v1/admin/users?limit=200");
    user = Array.isArray(response?.data) ? response.data.find((item) => item.id === id) ?? null : null;
  } catch {
    user = null;
  }
  if (!user) redirect("/admin/users");

  async function updateProfile(formData) {
    "use server";
    try {
      const firstName = String(formData.get("firstName") ?? "").trim();
      const fatherName = String(formData.get("fatherName") ?? "").trim();
      const grandfatherName = String(formData.get("grandfatherName") ?? "").trim();
      const composedName = [firstName, fatherName, grandfatherName].filter(Boolean).join(" ");
      await apiRequest(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        body: {
          name: composedName || String(formData.get("name") ?? ""),
          email: String(formData.get("email") ?? ""),
        },
      });
      revalidatePath(`/admin/users/${id}`);
      redirect(`/admin/users/${id}?updated=profile`);
    } catch {
      redirect(`/admin/users/${id}?error=profile`);
    }
  }

  async function suspendUser() {
    "use server";
    try {
      await apiRequest(`/api/v1/admin/users/${id}/status`, { method: "PATCH", body: { status: "suspended" } });
      revalidatePath(`/admin/users/${id}`);
      redirect(`/admin/users/${id}?updated=status`);
    } catch {
      redirect(`/admin/users/${id}?error=status`);
    }
  }

  async function resetPassword(formData) {
    "use server";
    try {
      await apiRequest(`/api/v1/admin/users/${id}/password`, {
        method: "PATCH",
        body: { password: String(formData.get("password") ?? "") },
      });
      revalidatePath(`/admin/users/${id}`);
      redirect(`/admin/users/${id}?updated=password`);
    } catch {
      redirect(`/admin/users/${id}?error=password`);
    }
  }

  async function deleteUser() {
    "use server";
    try {
      await apiRequest(`/api/v1/admin/users/${id}`, { method: "DELETE" });
      revalidatePath("/admin/users");
      redirect("/admin/users?deleted=1");
    } catch {
      redirect(`/admin/users/${id}?error=delete`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {query.updated ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
          Success — the user action was completed.
        </div>
      ) : null}
      {query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-sm">
          Action failed — please check the information and try again.
        </div>
      ) : null}

      <AdminUserProfilePanel
        user={user}
        updateProfileAction={updateProfile}
        blockAction={suspendUser}
        resetPasswordAction={resetPassword}
        deleteAction={deleteUser}
      />
    </div>
  );
}
