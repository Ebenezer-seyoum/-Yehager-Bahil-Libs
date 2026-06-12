export type AppRole = "admin" | "customer" | "employee";

const EMPLOYEE_PERMISSION_ROUTES: Array<{ permission: string; href: string }> = [
  { permission: "dashboard.view", href: "/admin" },
  { permission: "orders.view", href: "/admin/orders" },
  { permission: "returns.view", href: "/admin/orders/returns-refunds" },
  { permission: "shipping.view", href: "/admin/orders/shipping-delivery" },
  { permission: "products.view", href: "/admin/inventory" },
  { permission: "products.edit", href: "/admin/sections" },
  { permission: "payments.view", href: "/admin/payments" },
  { permission: "transactions.view", href: "/admin/finance/transactions" },
  { permission: "coupons.view", href: "/admin/finance/coupons-discounts" },
  { permission: "documents.view", href: "/admin/orders/documents" },
  { permission: "reports.view", href: "/admin/reports" },
  { permission: "support.view", href: "/admin/support-inbox" },
  { permission: "backup.view", href: "/admin/system/backup-restore" },
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
    return callbackUrl?.startsWith("/admin") || callbackUrl?.startsWith("/employee") ? callbackUrl : fallback;
  }

  if (callbackUrl && !callbackUrl.startsWith("/admin") && !callbackUrl.startsWith("/employee")) {
    return callbackUrl;
  }

  return "/my-account";
}
