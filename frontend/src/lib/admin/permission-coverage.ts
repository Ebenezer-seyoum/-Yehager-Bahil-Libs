export type PermissionRequirement = {
  area: string;
  route: string;
  subLinks?: string[];
  feature: string;
  action: "View" | "Create" | "Edit" | "Delete" | "Manage" | "Approve" | "Decline" | "Verify" | "Refund" | "Download" | "Reply" | "Assign" | "Close";
  permissionKey: string;
  note?: string;
};

export const DASHBOARD_PERMISSION_REQUIREMENTS: PermissionRequirement[] = [
  { area: "Dashboard", route: "/admin", feature: "View overview dashboard", action: "View", permissionKey: "dashboard.view" },
  { area: "Dashboard", route: "/admin/analytics", feature: "View analytics dashboard", action: "View", permissionKey: "dashboard.view" },
  { area: "Employees", route: "/admin/users", feature: "View employee page", action: "View", permissionKey: "employees.view" },
  { area: "Employees", route: "/admin/users/create", feature: "Add employee button", action: "Create", permissionKey: "employees.create" },
  { area: "Employees", route: "/admin/users/employees/[employeeId]", feature: "Edit employee profile", action: "Edit", permissionKey: "employees.edit" },
  { area: "Employees", route: "/admin/users/employees/[employeeId]", feature: "Activate, deactivate, block, or unblock employee", action: "Manage", permissionKey: "employees.status.update" },
  { area: "Employees", route: "/admin/users/employees/[employeeId]", feature: "Delete employee account", action: "Delete", permissionKey: "employees.delete" },
  { area: "Roles & Permissions", route: "/admin/roles", feature: "View roles and permissions", action: "View", permissionKey: "roles.view" },
  { area: "Roles & Permissions", route: "/admin/roles", feature: "Create role", action: "Create", permissionKey: "roles.create" },
  { area: "Roles & Permissions", route: "/admin/roles", feature: "Edit role and permissions", action: "Edit", permissionKey: "roles.edit" },
  { area: "Roles & Permissions", route: "/admin/roles", feature: "Delete role", action: "Delete", permissionKey: "roles.delete" },
  { area: "Roles & Permissions", route: "/admin/roles", feature: "Assign role to employee", action: "Assign", permissionKey: "roles.assign" },
  { area: "Customers", route: "/admin/customers", feature: "View customer page", action: "View", permissionKey: "customers.view" },
  { area: "Customers", route: "/admin/customers/create", feature: "Add customer button", action: "Create", permissionKey: "customers.create" },
  { area: "Customers", route: "/admin/customers/[id]", feature: "Edit customer profile", action: "Edit", permissionKey: "customers.edit" },
  { area: "Customers", route: "/admin/customers/[id]", feature: "Delete customer option", action: "Delete", permissionKey: "customers.delete", note: "Missing in backend constants; add before showing customer delete controls." },
  { area: "Catalog", route: "/admin/inventory", feature: "View catalog", action: "View", permissionKey: "products.view" },
  { area: "Catalog", route: "/admin/inventory/create", feature: "Add product", action: "Create", permissionKey: "products.create" },
  { area: "Catalog", route: "/admin/inventory/[id]", feature: "Edit product", action: "Edit", permissionKey: "products.edit" },
  { area: "Catalog", route: "/admin/inventory/[id]", feature: "Delete product", action: "Delete", permissionKey: "products.delete" },
  { area: "Tribes & Regions", route: "/admin/sections", feature: "Manage homepage tribes and regions", action: "Manage", permissionKey: "products.edit" },
  { area: "Orders", route: "/admin/catalog-orders", subLinks: ["Catalog Orders"], feature: "View orders", action: "View", permissionKey: "orders.view" },
  { area: "Orders", route: "/admin/catalog-orders", subLinks: ["Catalog Orders"], feature: "Edit order details", action: "Edit", permissionKey: "orders.edit" },
  { area: "Orders", route: "/admin/catalog-orders", subLinks: ["Catalog Orders"], feature: "Change order status", action: "Manage", permissionKey: "orders.status.update" },
  { area: "Orders", route: "/admin/catalog-orders", subLinks: ["Catalog Orders"], feature: "Delete or cancel order", action: "Delete", permissionKey: "orders.delete" },
  { area: "Orders", route: "/admin/orders/[id]", subLinks: ["Catalog Orders", "Custom Orders"], feature: "View order internal notes", action: "View", permissionKey: "order_notes.view" },
  { area: "Orders", route: "/admin/orders/[id]", subLinks: ["Catalog Orders", "Custom Orders"], feature: "Add admin order notes", action: "Create", permissionKey: "order_notes.admin.create" },
  { area: "Orders", route: "/admin/orders/[id]", subLinks: ["Catalog Orders", "Custom Orders"], feature: "Add tailor production notes", action: "Create", permissionKey: "order_notes.tailor.create" },
  { area: "Orders", route: "/admin/orders/[id]", subLinks: ["Catalog Orders", "Custom Orders"], feature: "Add delivery order notes", action: "Create", permissionKey: "order_notes.delivery.create" },
  { area: "Orders", route: "/admin/orders/[id]", subLinks: ["Catalog Orders", "Custom Orders"], feature: "Edit or delete order notes", action: "Manage", permissionKey: "order_notes.manage" },
  { area: "Returns & Refunds", route: "/admin/orders/returns-refunds", subLinks: ["Returns & Refunds"], feature: "View return and refund queue", action: "View", permissionKey: "returns.view" },
  { area: "Returns & Refunds", route: "/admin/orders/returns-refunds", subLinks: ["Returns & Refunds"], feature: "Approve, reject, or update return requests", action: "Edit", permissionKey: "returns.edit" },
  { area: "Shipping & Delivery", route: "/admin/orders/shipping-delivery", subLinks: ["Shipping & Delivery"], feature: "View shipping and delivery queue", action: "View", permissionKey: "shipping.view" },
  { area: "Shipping & Delivery", route: "/admin/orders/shipping-delivery", subLinks: ["Shipping & Delivery"], feature: "Update delivery status and tracking details", action: "Edit", permissionKey: "shipping.edit" },
  { area: "Uploaded Designs", route: "/admin/custom-orders?tab=requests", subLinks: ["Custom Orders"], feature: "View uploaded designs", action: "View", permissionKey: "uploaded_designs.view" },
  { area: "Uploaded Designs", route: "/admin/uploaded-designs/[id]", subLinks: ["Custom Orders"], feature: "Review uploaded design", action: "Manage", permissionKey: "uploaded_designs.review" },
  { area: "Uploaded Designs", route: "/admin/uploaded-designs/[id]", subLinks: ["Custom Orders"], feature: "Approve uploaded design", action: "Approve", permissionKey: "uploaded_designs.approve", note: "Missing; current backend has uploaded_designs.review only." },
  { area: "Uploaded Designs", route: "/admin/uploaded-designs/[id]", subLinks: ["Custom Orders"], feature: "Decline uploaded design", action: "Decline", permissionKey: "uploaded_designs.decline", note: "Missing; current backend has uploaded_designs.review only." },
  { area: "Payments", route: "/admin/payments", feature: "View payments", action: "View", permissionKey: "payments.view" },
  { area: "Payments", route: "/admin/payments/[id]", feature: "Verify payment", action: "Verify", permissionKey: "payments.verify" },
  { area: "Payments", route: "/admin/payments/[id]", feature: "Refund payment", action: "Refund", permissionKey: "payments.refund" },
  { area: "Payments", route: "/admin/payments/[id]", feature: "Edit payment record", action: "Edit", permissionKey: "payments.update", note: "Missing if payment editing is required." },
  { area: "Transactions", route: "/admin/finance/transactions", feature: "View payment transactions", action: "View", permissionKey: "transactions.view" },
  { area: "Transactions", route: "/admin/finance/transactions", feature: "Update transaction review state", action: "Edit", permissionKey: "transactions.edit" },
  { area: "Customer Credits", route: "/admin/finance/customer-credits", feature: "View customer store credit balances", action: "View", permissionKey: "payments.view" },
  { area: "Customer Credits", route: "/admin/finance/customer-credits", feature: "Manage automatic credit bonus rules", action: "Edit", permissionKey: "payments.verify" },
  { area: "Profit & Costs", route: "/admin/finance/profit-costs", feature: "View profit and cost analysis", action: "View", permissionKey: "payments.view" },
  { area: "Profit & Costs", route: "/admin/finance/profit-costs", feature: "Manage cost settings and designer payment status", action: "Edit", permissionKey: "payments.verify" },
  { area: "Promotions", route: "/admin/finance/coupons-discounts", feature: "View promotion activity", action: "View", permissionKey: "coupons.view" },
  { area: "Promotions", route: "/admin/finance/coupons-discounts", feature: "Create or update coupon rules", action: "Edit", permissionKey: "coupons.edit" },
  { area: "Order Documents", route: "/admin/orders/documents", feature: "View order documents", action: "View", permissionKey: "documents.view" },
  { area: "Order Documents", route: "/admin/orders/documents/[id]", feature: "Upload pickup and shipping documents", action: "Create", permissionKey: "documents.upload" },
  { area: "Order Documents", route: "/admin/orders/documents/[id]", feature: "Approve document", action: "Approve", permissionKey: "documents.approve" },
  { area: "Order Documents", route: "/admin/orders/documents/[id]", feature: "Replace uploaded documents", action: "Edit", permissionKey: "documents.update" },
  { area: "Order Documents", route: "/admin/orders/documents/[id]", feature: "Delete uploaded documents", action: "Delete", permissionKey: "documents.delete" },
  { area: "Order Documents", route: "/admin/orders/documents/[id]", feature: "Download generated and uploaded documents", action: "Download", permissionKey: "documents.download" },
  { area: "Exchange Rates", route: "/admin/exchange-rate", feature: "View exchange rates", action: "View", permissionKey: "exchange.view" },
  { area: "Exchange Rates", route: "/admin/exchange-rate", feature: "Edit exchange rates", action: "Edit", permissionKey: "exchange.edit" },
  { area: "Reports", route: "/admin/reports", feature: "View reports", action: "View", permissionKey: "reports.view" },
  { area: "Reports", route: "/admin/reports", feature: "Manage reports", action: "Manage", permissionKey: "reports.manage" },
  { area: "Reports", route: "/admin/reports", feature: "Export reports", action: "Download", permissionKey: "reports.export" },
  { area: "Support Inbox", route: "/admin/support-inbox", feature: "View support inbox", action: "View", permissionKey: "support.view" },
  { area: "Support Inbox", route: "/admin/support-inbox", feature: "Reply to support message", action: "Reply", permissionKey: "support.reply" },
  { area: "Support Inbox", route: "/admin/support-inbox", feature: "Assign support conversation", action: "Assign", permissionKey: "support.assign" },
  { area: "Support Inbox", route: "/admin/support-inbox", feature: "Close or resolve support conversation", action: "Close", permissionKey: "support.resolve" },
  { area: "Support Inbox", route: "/admin/support-inbox", feature: "Delete support conversation", action: "Delete", permissionKey: "support.delete", note: "Missing if support deletion is required." },
  { area: "Settings", route: "/admin/settings", feature: "View settings", action: "View", permissionKey: "settings.view" },
  { area: "Settings", route: "/admin/settings", feature: "Edit settings", action: "Edit", permissionKey: "settings.edit" },
  { area: "Backup & Restore", route: "/admin/system/backup-restore", feature: "View backup and restore status", action: "View", permissionKey: "backup.view" },
  { area: "Backup & Restore", route: "/admin/system/backup-restore", feature: "Create backups or start restore workflow", action: "Manage", permissionKey: "backup.edit" },
  { area: "Activity Logs", route: "/admin/audit", feature: "View activity logs", action: "View", permissionKey: "audit.view" },
  { area: "Alerts", route: "/admin/alerts", feature: "View alerts", action: "View", permissionKey: "alerts.view" },
  { area: "Alerts", route: "/admin/alerts", feature: "Manage alerts", action: "Manage", permissionKey: "alerts.manage" },
];

export function coverageRowId(row: Pick<PermissionRequirement, "permissionKey" | "feature">) {
  return encodeURIComponent(`${row.permissionKey}::${row.feature}`);
}

export function findCoverageRequirement(id: string) {
  const decoded = decodeURIComponent(id);
  return DASHBOARD_PERMISSION_REQUIREMENTS.find((row) => `${row.permissionKey}::${row.feature}` === decoded) ?? null;
}
