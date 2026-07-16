import { getFirstPermittedAdminRoute } from "@/lib/dashboard-navigation";

export type AppRole = "admin" | "customer" | "employee";

export function getFirstEmployeeRoute(permissions: string[] | null | undefined) {
  return getFirstPermittedAdminRoute(permissions);
}

export function getPostLoginRedirect(role: string | null | undefined, callbackUrl?: string, permissions?: string[]) {
  if (role === "admin") {
    return callbackUrl?.startsWith("/admin") ? callbackUrl : "/admin";
  }

  if (role === "employee") {
    const fallback = getFirstEmployeeRoute(permissions);
    return callbackUrl?.startsWith("/admin") || callbackUrl?.startsWith("/employee")
      ? callbackUrl
      : fallback;
  }

  if (callbackUrl && !callbackUrl.startsWith("/admin") && !callbackUrl.startsWith("/employee")) {
    return callbackUrl;
  }

  return "/my-account";
}
