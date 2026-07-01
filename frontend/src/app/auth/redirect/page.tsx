import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { getPostLoginRedirect } from "@/lib/auth-redirect";

function getSafeCallbackUrl(value: unknown) {
  if (typeof value !== "string") return undefined;
  if (!value || value === "/signin" || value.startsWith("/signin?")) return undefined;
  if (value === "/auth/redirect" || value.startsWith("/auth/redirect?")) return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

type AuthRedirectPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AuthRedirectPage({ searchParams }: AuthRedirectPageProps) {
  const params = searchParams ? await searchParams : {};
  const callbackUrlParam = params.callbackUrl;
  const callbackUrl = getSafeCallbackUrl(Array.isArray(callbackUrlParam) ? callbackUrlParam[0] : callbackUrlParam);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const signinParams = new URLSearchParams();
    if (callbackUrl) signinParams.set("callbackUrl", callbackUrl);
    redirect(`/signin${signinParams.toString() ? `?${signinParams.toString()}` : ""}`);
  }

  if (session.user.mustChangePassword) {
    redirect("/change-password-required");
  }

  if (
    session.user.role === "employee" &&
    (session.user.roleStatus === "unassigned" ||
      session.user.assignedRoleActive === false ||
      (session.user.permissions ?? []).length === 0)
  ) {
    redirect("/employee/access-pending");
  }

  redirect(getPostLoginRedirect(session.user.role, callbackUrl, session.user.permissions ?? []));
}
