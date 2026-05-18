import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";

type DashboardProfile = {
  name?: string | null;
  email?: string | null;
  role?: string;
  lastLoginAt?: string | null;
};

export async function DashboardProfileSettings({
  variant,
  returnPath,
}: {
  variant: "admin" | "employee";
  returnPath: string;
}) {
  const session = await getServerSession(authOptions);
  let profile: DashboardProfile | null = null;
  try {
    const response = await apiRequest<{ data: DashboardProfile | null }>("/api/v1/users/me");
    profile = response.data ?? null;
  } catch {
    profile = null;
  }

  async function updateProfile(formData: FormData) {
    "use server";
    try {
      await apiRequest("/api/v1/users/me", {
        method: "PATCH",
        body: { name: String(formData.get("name") ?? "") },
      });
      revalidatePath(returnPath);
      redirect(`${returnPath}?saved=profile`);
    } catch {
      redirect(`${returnPath}?error=profile`);
    }
  }

  async function changePassword(formData: FormData) {
    "use server";
    try {
      await apiRequest("/api/v1/users/me/password", {
        method: "PATCH",
        body: {
          currentPassword: String(formData.get("currentPassword") ?? ""),
          newPassword: String(formData.get("newPassword") ?? ""),
        },
      });
      revalidatePath(returnPath);
      redirect(`${returnPath}?saved=password`);
    } catch {
      redirect(`${returnPath}?error=password`);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">{variant}</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Profile Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your dashboard identity and password without leaving the {variant} workspace.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-primary">Account</p>
          <div className="mt-4 space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{session?.user?.email ?? profile?.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{session?.user?.role ?? profile?.role ?? variant}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Workspace</p>
              <p className="font-medium capitalize">{variant} dashboard</p>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-primary">Personal Information</p>
            <form action={updateProfile} className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Display name</span>
                <input
                  name="name"
                  defaultValue={session?.user?.name ?? profile?.name ?? ""}
                  required
                  className="h-11 w-full rounded-xl border border-input bg-background px-3"
                />
              </label>
              <button className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                Save profile
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-widest text-primary">Security</p>
            <form action={changePassword} className="mt-4 space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Current password</span>
                <input name="currentPassword" type="password" required className="h-11 w-full rounded-xl border border-input bg-background px-3" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">New password</span>
                <input name="newPassword" type="password" minLength={8} required className="h-11 w-full rounded-xl border border-input bg-background px-3" />
              </label>
              <button className="rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground">
                Change password
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
