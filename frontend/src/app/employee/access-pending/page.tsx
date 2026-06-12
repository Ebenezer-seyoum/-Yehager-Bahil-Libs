import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { Clock3, LockKeyhole, ShieldAlert } from "lucide-react";
import { EmployeeAccessActions } from "@/components/employee-access-actions";

export default async function EmployeeAccessPendingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/employee/access-pending");
  if (session.user.role !== "employee" && session.user.role !== "admin") redirect("/");

  const noRole = session.user.roleStatus === "unassigned" || !session.user.assignedRoleId;
  const inactiveRole = session.user.assignedRoleActive === false;
  const noPermissions = !inactiveRole && !noRole && (session.user.permissions ?? []).length === 0;
  const title = inactiveRole ? "Access Unavailable" : noRole || noPermissions ? "Access Pending" : "Access Restricted";
  const description = inactiveRole
    ? `Your assigned role${session.user.assignedRoleName ? ` (${session.user.assignedRoleName})` : ""} is currently inactive. Please contact an administrator to restore access.`
    : noRole
      ? "Your employee account is active, but no permission role has been assigned yet. Please contact an administrator."
      : noPermissions
        ? `Your assigned role${session.user.assignedRoleName ? ` (${session.user.assignedRoleName})` : ""} has no active permissions yet. Please contact an administrator.`
        : "Your account does not have access to this area. Please contact an administrator if you need access.";
  const Icon = inactiveRole ? LockKeyhole : ShieldAlert;

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mt-3 text-sm font-medium leading-6 text-slate-600">
          {description}
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
          <Clock3 className="h-4 w-4" />
          {inactiveRole ? "Role inactive" : "Waiting for admin approval"}
        </div>
        <EmployeeAccessActions />
      </section>
    </main>
  );
}

