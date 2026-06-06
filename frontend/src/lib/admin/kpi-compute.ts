import {
  AlertTriangle,
  Banknote,
  Bell,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Globe,
  Mail,
  Package,
  RotateCcw,
  Shield,
  ShoppingCart,
  Star,
  TrendingUp,
  Truck,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  getComparisonPeriodBounds,
  getOrderTotal,
  isCancelled,
  isDelivered,
  isPaid,
  isPending,
  money,
  percentChange,
  rowsBetweenDates,
} from "@/lib/reports/utils";
import type { AdminPageId, AdminWorkspaceData, KpiCardModel, KpiColor } from "./types";

type Row = Record<string, unknown>;

function kpi(
  partial: Omit<KpiCardModel, "status"> & { status?: KpiCardModel["status"] },
): KpiCardModel {
  return { status: "ready", ...partial };
}

function countChange(current: number, previous: number, positiveIsGood = true) {
  return { changePercent: percentChange(current, previous), positiveIsGood };
}

type DatedRow = {
  createdAt?: string | Date | null;
  paymentStatus?: string | null;
  status?: string | null;
  totalUsd?: number | string | null;
  total?: number | string | null;
  amount?: number | string | null;
};

function periodCounts(
  rows: DatedRow[],
  predicate: (row: DatedRow) => boolean,
  range: "Last 30 Days" = "Last 30 Days",
) {
  const { currentStart, currentEnd, previousStart, previousEnd } = getComparisonPeriodBounds(range);
  const current = rowsBetweenDates(rows, currentStart, currentEnd).filter(predicate).length;
  const previous = rowsBetweenDates(rows, previousStart, previousEnd).filter(predicate).length;
  return { current, previous };
}

function sumRevenue(orders: Row[]) {
  return orders.filter(isPaid).reduce((sum, row) => sum + getOrderTotal(row), 0);
}

function productStock(product: Row) {
  const stock = Number(product.stockQuantity ?? product.stock ?? 999);
  return Number.isFinite(stock) ? stock : 999;
}

function buildDashboardKpis(data: AdminWorkspaceData): KpiCardModel[] {
  const orders = data.orders ?? [];
  const products = data.products ?? [];
  const users = data.users ?? [];
  const alerts = data.alerts ?? [];
  const customers = users.filter((u) => String(u.role ?? "").toLowerCase() === "customer");

  const orderRows = orders as DatedRow[];
  const revenue = periodCounts(orderRows, (row) => isPaid(row));
  const bounds = getComparisonPeriodBounds("Last 30 Days");
  const revCurrent = rowsBetweenDates(orderRows, bounds.currentStart, bounds.currentEnd)
    .filter(isPaid)
    .reduce((s, o) => s + getOrderTotal(o), 0);
  const revPrevious = rowsBetweenDates(orderRows, bounds.previousStart, bounds.previousEnd)
    .filter(isPaid)
    .reduce((s, o) => s + getOrderTotal(o), 0);

  const orderCounts = periodCounts(orderRows, () => true);
  const pendingCounts = periodCounts(orderRows, (row) => isPending(row));
  const deliveredCounts = periodCounts(orderRows, (row) => isDelivered(row));
  const customerRows = customers as DatedRow[];
  const newCustomers = periodCounts(customerRows, () => true);
  const lowStock = products.filter((p) => productStock(p) > 0 && productStock(p) <= 5).length;
  const failedPayments = orders.filter((o) => String(o.paymentStatus ?? "").toLowerCase() === "failed").length;
  const openAlerts = alerts.filter((a) => !a.isResolved).length;

  return [
    kpi({
      id: "revenue",
      title: "Total Revenue",
      value: money(revCurrent),
      description: "Paid order value (last 30 days)",
      color: "green",
      icon: DollarSign,
      ...countChange(revCurrent, revPrevious),
    }),
    kpi({
      id: "orders",
      title: "Total Orders",
      value: String(orderCounts.current),
      description: "Orders in current period",
      color: "blue",
      icon: ShoppingCart,
      ...countChange(orderCounts.current, orderCounts.previous),
    }),
    kpi({
      id: "pending",
      title: "Pending Orders",
      value: String(pendingCounts.current),
      description: "Awaiting processing",
      color: "yellow",
      icon: Clock,
      ...countChange(pendingCounts.current, pendingCounts.previous, false),
    }),
    kpi({
      id: "delivered",
      title: "Delivered Orders",
      value: String(deliveredCounts.current),
      description: "Completed deliveries",
      color: "green",
      icon: Truck,
      ...countChange(deliveredCounts.current, deliveredCounts.previous),
    }),
    kpi({
      id: "customers",
      title: "New Customers",
      value: String(newCustomers.current),
      description: "Registered this period",
      color: "purple",
      icon: UserPlus,
      ...countChange(newCustomers.current, newCustomers.previous),
    }),
    kpi({
      id: "low-stock",
      title: "Low Stock Clothes",
      value: String(lowStock),
      description: "Clothing inventory at risk",
      color: "yellow",
      icon: Package,
      changePercent: 0,
      positiveIsGood: false,
    }),
    kpi({
      id: "failed-payments",
      title: "Failed Payments",
      value: String(failedPayments),
      description: "Requires finance review",
      color: "red",
      icon: CreditCard,
      changePercent: 0,
      positiveIsGood: false,
    }),
    kpi({
      id: "support",
      title: "New Support Issues",
      value: String(openAlerts),
      description: "Open alerts & tickets",
      color: "red",
      icon: AlertTriangle,
      changePercent: 0,
      positiveIsGood: false,
    }),
  ];
}

function buildOrdersKpis(data: AdminWorkspaceData): KpiCardModel[] {
  const orders = data.orders ?? [];
  const totalValue = orders.reduce((s, o) => s + getOrderTotal(o), 0);
  const count = (fn: (o: Row) => boolean) => orders.filter(fn).length;

  return [
    kpi({ id: "total", title: "Total Orders", value: String(orders.length), description: "In current view", color: "blue", icon: ClipboardList, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "new", title: "New Orders", value: String(count((o) => isPending(o) || norm(o.status) === "pending")), description: "Recently placed", color: "blue", icon: ShoppingCart, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "pending", title: "Pending Orders", value: String(count(isPending)), description: "Needs attention", color: "yellow", icon: Clock, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "processing", title: "Processing Orders", value: String(count((o) => ["processing", "quality_check"].includes(norm(o.status)))), description: "In production", color: "blue", icon: RotateCcw, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "tailoring", title: "Measurement Review", value: String(count((o) => norm(o.status) === "tailoring")), description: "Tailoring queue", color: "yellow", icon: Package, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "delivered", title: "Delivered Orders", value: String(count(isDelivered)), description: "Completed", color: "green", icon: CheckCircle2, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "cancelled", title: "Cancelled Orders", value: String(count(isCancelled)), description: "Lost sales", color: "red", icon: XCircle, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "value", title: "Total Order Value", value: money(totalValue), description: "Sum in current view", color: "green", icon: DollarSign, changePercent: 0, positiveIsGood: true }),
  ];
}

function norm(v: unknown) {
  return String(v ?? "").toLowerCase().trim();
}

function buildProductsKpis(data: AdminWorkspaceData): KpiCardModel[] {
  const products = data.products ?? [];
  const active = products.filter((p) => p.isActive !== false);
  const low = products.filter((p) => productStock(p) > 0 && productStock(p) <= 5);
  const out = products.filter((p) => productStock(p) <= 0);
  const featured = products.filter((p) => p.isFeatured);
  const draft = products.filter((p) => p.isActive === false);
  const best = [...products].sort((a, b) => Number(b.totalSold ?? 0) - Number(a.totalSold ?? 0))[0];
  const revenue = products.reduce((s, p) => s + Number(p.revenue ?? p.totalRevenue ?? 0), 0);

  return [
    kpi({ id: "total", title: "Total Clothes", value: String(products.length), description: "All clothing items", color: "blue", icon: Boxes, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "active", title: "Active Clothes", value: String(active.length), description: "Visible in store", color: "green", icon: CheckCircle2, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "low", title: "Low Stock Clothes", value: String(low.length), description: "Restock soon", color: "yellow", icon: AlertTriangle, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "out", title: "Out of Stock", value: String(out.length), description: "Unavailable items", color: "red", icon: XCircle, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "best", title: "Best Selling Item", value: String(best?.name ?? "—"), description: "Top performer", color: "purple", icon: Star, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "revenue", title: "Clothing Revenue", value: money(revenue), description: "Catalog revenue", color: "green", icon: TrendingUp, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "draft", title: "Draft Clothes", value: String(draft.length), description: "Not published", color: "gray", icon: FileText, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "featured", title: "Featured Clothes", value: String(featured.length), description: "Homepage highlights", color: "purple", icon: Star, changePercent: 0, positiveIsGood: true }),
  ];
}

function buildEmployeesKpis(data: AdminWorkspaceData): KpiCardModel[] {
  const users = (data.users ?? []).filter((u) => ["employee", "admin"].includes(norm(u.role)));
  const active = users.filter((u) => norm(u.status) === "active");
  const inactive = users.filter((u) => norm(u.status) !== "active");
  const newThisMonth = users.filter((u) => {
    if (!u.createdAt) return false;
    const d = new Date(String(u.createdAt));
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  return [
    kpi({ id: "total", title: "Total Employees", value: String(users.length), description: "Staff accounts", color: "blue", icon: UsersRound, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "active", title: "Active Employees", value: String(active.length), description: "Can sign in", color: "green", icon: CheckCircle2, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "inactive", title: "Inactive Employees", value: String(inactive.length), description: "Suspended or disabled", color: "gray", icon: UserRound, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "new", title: "New This Month", value: String(newThisMonth.length), description: "Recently added", color: "purple", icon: UserPlus, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "orders", title: "Assigned Orders", value: String(data.orders?.length ?? 0), description: "Operational load", color: "blue", icon: ClipboardList, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "tasks", title: "Completed Tasks", value: String(active.length), description: "Active workforce", color: "green", icon: CheckCircle2, changePercent: 0, positiveIsGood: true }),
  ];
}

function buildCustomersKpis(data: AdminWorkspaceData): KpiCardModel[] {
  const customers = (data.users ?? []).filter((u) => norm(u.role) === "customer");
  const active = customers.filter((u) => norm(u.accountStatus ?? u.status) === "active");
  const inactive = customers.filter((u) => norm(u.accountStatus ?? u.status) !== "active");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = customers.filter((u) => {
    const raw = u.createdAt ?? u.created_at;
    if (!raw) return false;
    const d = new Date(String(raw));
    return !Number.isNaN(d.getTime()) && d >= monthStart;
  });

  const returning = customers.filter((u) => Number(u.orderCount ?? u.totalOrders ?? 0) > 1);
  const withOrders = customers.filter((u) => Number(u.orderCount ?? u.totalOrders ?? 0) > 0);

  const orders = data.orders ?? [];
  const measurementOrders = orders.filter((o) => Boolean((o as any).measurementStatus) || Boolean((o as any).measurementId));
  const withMeasurements = customers.filter((u) => {
    const email = String(u.email ?? "").toLowerCase();
    return measurementOrders.some((o) => String((o as any).userEmail ?? (o as any).email ?? "").toLowerCase() === email);
  });

  const supportIssues = (data.alerts ?? []).filter((a) => !a.isResolved).length;

  return [
    kpi({ id: "total", title: "Total Customers", value: String(customers.length), description: "All customer accounts", color: "purple", icon: Users, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "active", title: "Active Customers", value: String(active.length), description: "Can sign in", color: "green", icon: CheckCircle2, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "inactive", title: "Inactive Customers", value: String(inactive.length), description: "Disabled or blocked", color: "gray", icon: UserRound, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "new_month", title: "New Customers This Month", value: String(newThisMonth.length), description: "Created this month", color: "blue", icon: UserPlus, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "returning", title: "Returning Customers", value: String(returning.length), description: "More than 1 order", color: "green", icon: RotateCcw, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "with_orders", title: "Customers With Orders", value: String(withOrders.length), description: "Converted shoppers", color: "blue", icon: ShoppingCart, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "with_measurements", title: "Customers With Measurements", value: String(withMeasurements.length), description: "Saved tailoring profiles", color: "teal", icon: FileText, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "support", title: "Customers With Support Issues", value: String(supportIssues), description: "Open issues", color: "red", icon: AlertTriangle, changePercent: 0, positiveIsGood: false }),
  ];
}

function buildPaymentsKpis(data: AdminWorkspaceData): KpiCardModel[] {
  const orders = data.orders ?? [];
  const paid = orders.filter(isPaid);
  const pending = orders.filter((o) => norm(o.paymentStatus) === "awaiting_verification");
  const failed = orders.filter((o) => norm(o.paymentStatus) === "failed");
  const refunded = orders.filter((o) => norm(o.paymentStatus) === "refunded");
  const stripe = paid.filter((o) => norm(o.paymentMethod).includes("stripe") || norm(o.paymentMethod) === "card");
  const bank = paid.filter((o) => ["bank", "transfer", "qr"].some((k) => norm(o.paymentMethod).includes(k)));
  const totalPaid = sumRevenue(paid);
  const successRate = orders.length ? (paid.length / orders.length) * 100 : 0;

  return [
    kpi({ id: "paid", title: "Total Paid Amount", value: money(totalPaid), description: "Verified payments", color: "green", icon: Wallet, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "stripe", title: "Stripe Revenue", value: money(sumRevenue(stripe)), description: "Card payments", color: "blue", icon: CreditCard, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "bank", title: "Bank / QR Revenue", value: money(sumRevenue(bank)), description: "Local transfers", color: "blue", icon: Banknote, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "pending", title: "Pending Verification", value: String(pending.length), description: "Proofs to review", color: "yellow", icon: Clock, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "failed", title: "Failed Payments", value: String(failed.length), description: "Declined or rejected", color: "red", icon: XCircle, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "refunds", title: "Refund Amount", value: money(sumRevenue(refunded)), description: "Returned funds", color: "red", icon: RotateCcw, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "currency", title: "Main Currency Revenue", value: money(totalPaid), description: "Primary settlement", color: "green", icon: Globe, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "rate", title: "Payment Success Rate", value: `${successRate.toFixed(1)}%`, description: "Paid vs all orders", color: "green", icon: TrendingUp, changePercent: 0, positiveIsGood: true }),
  ];
}

function buildRolesKpis(data: AdminWorkspaceData): KpiCardModel[] {
  const roles = data.roles ?? [];
  const users = data.users ?? [];
  const admins = users.filter((u) => norm(u.role) === "admin");
  const activeAdmins = admins.filter((u) => norm(u.status) === "active");

  return [
    kpi({ id: "roles", title: "Total Roles", value: String(roles.length), description: "Permission templates", color: "blue", icon: Shield, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "admins", title: "Admin Users", value: String(admins.length), description: "Full access accounts", color: "purple", icon: UsersRound, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "active", title: "Active Admins", value: String(activeAdmins.length), description: "Currently enabled", color: "green", icon: CheckCircle2, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "restricted", title: "Restricted Users", value: String(users.filter((u) => norm(u.status) !== "active").length), description: "Limited access", color: "gray", icon: UserRound, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "groups", title: "Permission Groups", value: String(data.permissions?.length ?? 0), description: "Granular permissions", color: "blue", icon: Shield, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "security", title: "Recent Security Actions", value: String((data.audit ?? []).length), description: "Audit events", color: "yellow", icon: AlertTriangle, changePercent: 0, positiveIsGood: false }),
  ];
}

function buildActivityKpis(data: AdminWorkspaceData): KpiCardModel[] {
  const audit = data.audit ?? [];
  const today = audit.filter((row) => {
    if (!row.createdAt) return false;
    const d = new Date(String(row.createdAt));
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return [
    kpi({ id: "total", title: "Total Activities", value: String(audit.length), description: "In current view", color: "blue", icon: ClipboardList, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "admin", title: "Admin Actions Today", value: String(today.length), description: "Today's events", color: "purple", icon: Shield, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "payments", title: "Payment Events", value: String(audit.filter((r) => norm(r.entityType).includes("payment")).length), description: "Financial trail", color: "green", icon: CreditCard, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "security", title: "Security Alerts", value: String(audit.filter((r) => norm(r.action).includes("security")).length), description: "Policy changes", color: "yellow", icon: AlertTriangle, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "failed", title: "Failed Actions", value: String(audit.filter((r) => norm(r.severity) === "error").length), description: "Errors logged", color: "red", icon: XCircle, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "errors", title: "Recent Errors", value: String(audit.filter((r) => norm(r.level) === "error").length), description: "System issues", color: "red", icon: AlertTriangle, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "products", title: "Product Changes", value: String(audit.filter((r) => norm(r.entityType).includes("product")).length), description: "Catalog updates", color: "blue", icon: Package, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "customers", title: "Customer Actions", value: String(audit.filter((r) => norm(r.entityType).includes("customer")).length), description: "Shopper events", color: "purple", icon: Users, changePercent: 0, positiveIsGood: true }),
  ];
}

function buildUploadedDesignKpis(data: AdminWorkspaceData): KpiCardModel[] {
  const rows = data.uploadedDesigns ?? [];
  const pending = rows.filter((row) => ["submitted", "in_review"].includes(norm(row.status)));
  const awaiting = rows.filter((row) => norm(row.status) === "awaiting_payment");
  const completed = rows.filter((row) => ["completed_request", "approved"].includes(norm(row.status)));
  const declined = rows.filter((row) => norm(row.status) === "rejected");
  const quotedValue = rows.reduce((sum, row) => sum + (Number(row.quotedPriceUsd ?? 0) || 0), 0);

  return [
    kpi({ id: "total", title: "Total Requests", value: String(rows.length), description: "All custom design requests", color: "blue", icon: ClipboardList, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "pending", title: "Pending Review", value: String(pending.length), description: "Requests needing a decision", color: "yellow", icon: Clock, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "awaiting", title: "Awaiting Payment", value: String(awaiting.length), description: "Approved quotes in customer carts", color: "blue", icon: CreditCard, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "completed", title: "Completed Requests", value: String(completed.length), description: "Paid custom design requests", color: "green", icon: CheckCircle2, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "declined", title: "Declined Requests", value: String(declined.length), description: "Requests not approved", color: "red", icon: XCircle, changePercent: 0, positiveIsGood: false }),
    kpi({ id: "quoted", title: "Total Quoted Value", value: money(quotedValue), description: "Value of issued custom quotes", color: "purple", icon: DollarSign, changePercent: 0, positiveIsGood: true }),
  ];
}

function buildSettingsKpis(): KpiCardModel[] {
  return [
    kpi({ id: "store", title: "Store Status", value: "Online", description: "Storefront availability", color: "green", icon: CheckCircle2, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "email", title: "Email Status", value: "Configured", description: "Transactional email", color: "green", icon: Mail, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "payment", title: "Payment Status", value: "Active", description: "Stripe + bank/QR", color: "green", icon: CreditCard, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "delivery", title: "Delivery Status", value: "Active", description: "Shipping & pickup", color: "blue", icon: Truck, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "currency", title: "Active Currencies", value: "USD, ETB", description: "Checkout currencies", color: "blue", icon: Globe, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "security", title: "Security Status", value: "Protected", description: "Auth & permissions", color: "purple", icon: Shield, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "translation", title: "Translation Status", value: "EN + AM", description: "Store languages", color: "gray", icon: Globe, changePercent: 0, positiveIsGood: true }),
    kpi({ id: "notifications", title: "Notification Status", value: "Enabled", description: "Admin alerts", color: "blue", icon: Bell, changePercent: 0, positiveIsGood: true }),
  ];
}

function buildGenericKpis(data: AdminWorkspaceData, color: KpiColor = "blue"): KpiCardModel[] {
  const count = (key: keyof AdminWorkspaceData) => (data[key] as Row[] | undefined)?.length ?? 0;
  return [
    kpi({ id: "records", title: "Records", value: String(count("orders") || count("products") || count("users") || count("audit")), description: "In current view", color, icon: ClipboardList, changePercent: 0, positiveIsGood: true }),
  ];
}

export function computePageKpis(pageId: AdminPageId, data: AdminWorkspaceData): KpiCardModel[] {
  switch (pageId) {
    case "dashboard":
      return buildDashboardKpis(data);
    case "orders":
      return buildOrdersKpis(data);
    case "products":
      return buildProductsKpis(data);
    case "employees":
      return buildEmployeesKpis(data);
    case "customers":
      return buildCustomersKpis(data);
    case "payments":
      return buildPaymentsKpis(data);
    case "roles":
      return buildRolesKpis(data);
    case "activity-logs":
      return buildActivityKpis(data);
    case "settings":
      return buildSettingsKpis();
    case "documents":
    case "sections":
    case "exchange-rate":
      return buildGenericKpis(data);
    case "uploaded-designs":
      return buildUploadedDesignKpis(data);
    default:
      return buildGenericKpis(data);
  }
}
