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

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Profile overview</p>
          <nav className="mt-4 space-y-2">
            {[
              ["#personal-information", "Personal Information", "Name and dashboard identity"],
              ["#account-information", "Account Information", "Email, role, and workspace"],
              ["#security", "Security", "Password and account protection"],
            ].map(([href, label, description], index) => (
              <a key={href} href={href} className={`block rounded-2xl border p-4 transition hover:border-blue-300 hover:bg-blue-50 ${index === 0 ? "border-blue-200 bg-blue-50" : "border-transparent bg-slate-50"}`}>
                <p className="text-sm font-bold text-slate-950">{label}</p>
                <p className="mt-1 text-xs text-slate-600">{description}</p>
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-6">
          <section id="personal-information" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Personal Information</p>
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

          <section id="account-information" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Account Information</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ["Email", session?.user?.email ?? profile?.email ?? "Not provided"],
                ["Role", session?.user?.role ?? profile?.role ?? variant],
                ["Workspace", `${variant} dashboard`],
                ["Last Login", profile?.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : "Not provided"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-2 text-sm font-bold capitalize text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="security" className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Security</p>
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
