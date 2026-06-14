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
      { href: "/admin/sections", label: "Collections", icon: "sections", permission: "products.view" },
    ],
  },
  {
    label: "Order Management",
    items: [
      { href: "/admin/orders?type=catalog", label: "Catalog Orders", icon: "orders", permission: "orders.view" },
      { href: "/admin/uploaded-designs", label: "Custom orders", icon: "documents", permission: "uploaded_designs.view" },
      { href: "/admin/orders/documents", label: "Order Documents", icon: "documents", permission: "documents.view" },
      { href: "/admin/orders/returns-refunds", label: "Returns & Refunds", icon: "orders", permission: "returns.view" },
      { href: "/admin/orders/shipping-delivery", label: "Shipping & Delivery", icon: "orders", permission: "shipping.view" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/payments", label: "Payments", icon: "payments", permission: "payments.view" },
      { href: "/admin/finance/transactions", label: "Transactions", icon: "payments", permission: "transactions.view" },
      { href: "/admin/finance/coupons-discounts", label: "Coupons & Discounts", icon: "payments", permission: "coupons.view" },
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
      { href: "/admin/system/backup-restore", label: "Backup & Restore", icon: "settings", permission: "backup.view" },
      { href: "/admin/audit", label: "Activity Logs", icon: "audit", permission: "audit.view" },
    ],
  },
] as const;

export const employeeNavigation: readonly NavigationGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/employee", label: "Dashboard", icon: "dashboard", permission: "dashboard.view" }],
  },
  {
    label: "Catalog",
    items: [{ href: "/employee/products", label: "Product Management", icon: "products", permission: "products.view" }],
  },
  {
    label: "Operations",
    items: [{ href: "/employee/orders", label: "Orders", icon: "orders", permission: "orders.view" }],
  },
  {
    label: "Settings",
    items: [{ href: "/employee/settings", label: "Profile Settings", icon: "settings", permission: "dashboard.view" }],
  },
] as const;
