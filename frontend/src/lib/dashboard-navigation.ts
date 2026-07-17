export type NavigationIcon =
  | "dashboard"
  | "users"
  | "customers"
  | "products"
  | "sections"
  | "orders"
  | "payments"
  | "documents"
  | "exchange"
  | "alerts"
  | "audit"
  | "roles"
  | "reports"
  | "settings"
  | "inbox";

export type NavigationChild = {
  href: string;
  label: string;
  kind?: "category" | "report";
};

export type NavigationItem = {
  href: string;
  label: string;
  icon: NavigationIcon;
  permission: string;
  alternativePermissions?: readonly string[];
  children?: NavigationChild[];
};

export type NavigationGroup = {
  label: string;
  items: readonly NavigationItem[];
};

export const adminNavigation: readonly NavigationGroup[] = [
  {
    label: "Dashboard",
    items: [
      { href: "/admin", label: "Overview", icon: "dashboard", permission: "dashboard.view" },
      { href: "/admin/analytics", label: "Analytics", icon: "reports", permission: "dashboard.view" },
    ],
  },
  {
    label: "User Management",
    items: [
      { href: "/admin/users", label: "Employees", icon: "users", permission: "employees.view" },
      { href: "/admin/customers", label: "Customers", icon: "customers", permission: "customers.view" },
      { href: "/admin/roles", label: "Roles & Permissions", icon: "roles", permission: "roles.view" },
    ],
  },
  {
    label: "Product Management",
    items: [
      { href: "/admin/inventory", label: "Catalog", icon: "products", permission: "products.view" },
      { href: "/admin/sections", label: "Tribes & Regions", icon: "sections", permission: "products.view" },
    ],
  },
  {
    label: "Order Management",
    items: [
      { href: "/admin/catalog-orders", label: "Catalog Orders", icon: "orders", permission: "orders.view" },
      {
        href: "/admin/custom-orders",
        label: "Custom Orders",
        icon: "documents",
        permission: "uploaded_designs.view",
        alternativePermissions: ["orders.view"],
      },
      { href: "/admin/orders/documents", label: "Order Documents", icon: "documents", permission: "documents.view" },
      { href: "/admin/orders/returns-refunds", label: "Returns & Refunds", icon: "orders", permission: "returns.view" },
      { href: "/admin/orders/shipping-delivery", label: "Shipping & Delivery", icon: "orders", permission: "shipping.view" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/payments", label: "Payments", icon: "payments", permission: "payments.view" },
      { href: "/admin/finance/customer-credits", label: "Customer Credits", icon: "payments", permission: "payments.view" },
      { href: "/admin/finance/coupons-discounts", label: "Promotions", icon: "payments", permission: "coupons.view" },
      { href: "/admin/finance/profit-costs", label: "Profit & Costs", icon: "payments", permission: "payments.view" },
      { href: "/admin/exchange-rate", label: "Exchange Rates", icon: "exchange", permission: "exchange.view" },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/admin/reports", label: "Reports Center", icon: "reports", permission: "reports.view" },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/admin/support-inbox", label: "Support Inbox", icon: "inbox", permission: "support.view" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: "settings", permission: "settings.view" },
      { href: "/admin/alerts", label: "Alerts", icon: "alerts", permission: "alerts.view" },
      {
        href: "/admin/audit",
        label: "Activity Logs",
        icon: "audit",
        permission: "audit.view",
        alternativePermissions: ["activity.view"],
      },
    ],
  },
] as const;

export function navigationItemPermissions(item: NavigationItem) {
  return [item.permission, ...(item.alternativePermissions ?? [])];
}

export function canAccessNavigationItem(
  permissions: string[] | null | undefined,
  item: NavigationItem,
) {
  const granted = new Set(permissions ?? []);
  return navigationItemPermissions(item).some((permission) => granted.has(permission));
}

export function getFirstPermittedAdminRoute(permissions: string[] | null | undefined) {
  for (const group of adminNavigation) {
    const item = group.items.find((candidate) => canAccessNavigationItem(permissions, candidate));
    if (item) return item.href;
  }
  return "/employee/access-pending";
}
