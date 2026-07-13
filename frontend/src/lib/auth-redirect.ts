export type AppRole = "admin" | "customer" | "employee";

const EMPLOYEE_PERMISSION_ROUTES: Array<{ permission: string; href: string }> = [
  { permission: "dashboard.view", href: "/employee" },
  { permission: "orders.view", href: "/employee/orders" },
  { permission: "products.view", href: "/employee/products" },
];

export function getFirstEmployeeRoute(permissions: string[] | null | undefined) {
  const granted = new Set(permissions ?? []);
  return EMPLOYEE_PERMISSION_ROUTES.find((route) => granted.has(route.permission))?.href ?? "/employee/access-pending";
}

export function getPostLoginRedirect(role: string | null | undefined, callbackUrl?: string, permissions?: string[]) {
  if (role === "admin") {
    return callbackUrl?.startsWith("/admin") ? callbackUrl : "/admin";
  }

  if (role === "employee") {
    const fallback = getFirstEmployeeRoute(permissions);
    return callbackUrl?.startsWith("/employee") ? callbackUrl : fallback;
  }

  if (callbackUrl && !callbackUrl.startsWith("/admin") && !callbackUrl.startsWith("/employee")) {
    return callbackUrl;
  }

  return "/my-account";
}
