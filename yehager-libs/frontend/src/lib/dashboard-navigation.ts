export const adminNavigation = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: "dashboard", permission: "dashboard.view" }],
  },
  {
    label: "Users",
    items: [
      { href: "/admin/users", label: "Employees", icon: "users", permission: "employees.view" },
      { href: "/admin/customers", label: "Customers", icon: "customers", permission: "customers.view" },
      { href: "/admin/roles", label: "Roles & Permissions", icon: "roles", permission: "roles.view" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/inventory", label: "Products", icon: "products", permission: "products.view" },
      { href: "/admin/sections", label: "Sections", icon: "sections", permission: "products.view" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "orders", permission: "orders.view" },
      { href: "/admin/exchange-rate", label: "Exchange Rate", icon: "exchange", permission: "exchange_rates.view" },
      { href: "/admin/alerts", label: "Alerts", icon: "alerts", permission: "alerts.view" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/admin/reports", label: "Reports", icon: "reports", permission: "reports.view" },
      { href: "/admin/audit", label: "Audit Logs", icon: "audit", permission: "audit.view" },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/admin/settings", label: "Profile Settings", icon: "settings", permission: "settings.view" }],
  },
] as const;

export const employeeNavigation = [
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
