export type AppRole = "admin" | "customer" | "employee";

export function getPostLoginRedirect(role: string | null | undefined, callbackUrl?: string) {
  if (role === "admin") {
    return callbackUrl?.startsWith("/admin") ? callbackUrl : "/admin";
  }

  if (role === "employee") {
    return callbackUrl?.startsWith("/employee") ? callbackUrl : "/employee";
  }

  if (callbackUrl && !callbackUrl.startsWith("/admin") && !callbackUrl.startsWith("/employee")) {
    return callbackUrl;
  }

  return "/my-account";
}
