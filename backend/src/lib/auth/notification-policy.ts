export type NotificationCategory =
  | "orders"
  | "custom_orders"
  | "custom_designs"
  | "payments"
  | "shipping"
  | "returns"
  | "catalog_prices"
  | "support"
  | "alerts";

type NotificationRule = {
  category: NotificationCategory;
  permissions: string[];
  href: (entityId?: string | null) => string;
};

const RULES: Record<string, NotificationRule> = {
  new_order: {
    category: "orders",
    permissions: ["orders.view"],
    href: (id) => (id ? `/admin/orders/${id}` : "/admin/catalog-orders"),
  },
  new_catalog_order: {
    category: "orders",
    permissions: ["orders.view"],
    href: (id) => (id ? `/admin/orders/${id}` : "/admin/catalog-orders"),
  },
  new_custom_order: {
    category: "custom_orders",
    permissions: ["orders.view"],
    href: (id) => (id ? `/admin/orders/${id}` : "/admin/custom-orders?tab=orders"),
  },
  design_review: {
    category: "custom_designs",
    permissions: ["uploaded_designs.view"],
    href: (id) => (id ? `/admin/uploaded-designs/${id}` : "/admin/custom-orders?tab=requests"),
  },
  custom_design_submitted: {
    category: "custom_designs",
    permissions: ["uploaded_designs.view"],
    href: (id) => (id ? `/admin/uploaded-designs/${id}` : "/admin/custom-orders?tab=requests"),
  },
  custom_design_awaiting_payment: {
    category: "custom_designs",
    permissions: ["uploaded_designs.view"],
    href: (id) => (id ? `/admin/uploaded-designs/${id}` : "/admin/custom-orders?tab=requests"),
  },
  payment_review: {
    category: "payments",
    permissions: ["payments.view", "payments.verify"],
    href: (id) => (id ? `/admin/payments/${id}` : "/admin/payments"),
  },
  payment_received: {
    category: "payments",
    permissions: ["payments.view", "payments.verify"],
    href: (id) => (id ? `/admin/payments/${id}` : "/admin/payments"),
  },
  payment_proof_uploaded: {
    category: "payments",
    permissions: ["payments.view", "payments.verify"],
    href: (id) => (id ? `/admin/payments/${id}` : "/admin/payments"),
  },
  shipping_delivery_ready: {
    category: "shipping",
    permissions: ["shipping.view"],
    href: (id) => (id ? `/admin/orders/shipping-delivery/${id}` : "/admin/orders/shipping-delivery"),
  },
  refund_issue: {
    category: "returns",
    permissions: ["returns.view"],
    href: () => "/admin/orders/returns-refunds?filter=awaiting-review",
  },
  refund_requested: {
    category: "returns",
    permissions: ["returns.view"],
    href: () => "/admin/orders/returns-refunds?filter=awaiting-review",
  },
  return_refund: {
    category: "returns",
    permissions: ["returns.view"],
    href: () => "/admin/orders/returns-refunds?filter=awaiting-review",
  },
  refund_pending: {
    category: "returns",
    permissions: ["returns.view"],
    href: () => "/admin/orders/returns-refunds?filter=awaiting-review",
  },
  catalog_price_submitted: {
    category: "catalog_prices",
    permissions: ["products.view"],
    href: (id) => (id ? `/admin/inventory/${id}` : "/admin/inventory?tab=new-prices"),
  },
  low_stock: {
    category: "catalog_prices",
    permissions: ["products.view", "products.stock.update"],
    href: (id) => (id ? `/admin/inventory/${id}` : "/admin/inventory"),
  },
  support_message: {
    category: "support",
    permissions: ["support.view"],
    href: () => "/admin/support-inbox",
  },
};

const FALLBACK_RULE: NotificationRule = {
  category: "alerts",
  permissions: ["alerts.view"],
  href: () => "/admin/alerts",
};

export function notificationRuleForType(type: string) {
  return RULES[type] ?? FALLBACK_RULE;
}

export function canReceiveNotification(type: string, permissions: string[], isAdmin = false) {
  if (isAdmin) return true;
  const granted = new Set(permissions);
  return notificationRuleForType(type).permissions.some((permission) => granted.has(permission));
}

export function notificationHref(type: string, entityId?: string | null) {
  return notificationRuleForType(type).href(entityId);
}
