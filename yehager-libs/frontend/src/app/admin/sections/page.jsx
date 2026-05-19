import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { AdminSectionManager } from "@/components/admin-section-manager";

export default async function AdminSectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/sections");
  if (session.user.role !== "admin") redirect("/");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary">Catalog</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">Section Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add sections, manage subsections, and control which catalog groups display on the home page.
        </p>
      </div>
      <AdminSectionManager />
    </div>
  );
}
