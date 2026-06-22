import type { LucideIcon } from "lucide-react";

export type KpiColor = "green" | "blue" | "yellow" | "red" | "purple" | "teal" | "gray";

export type AdminPageId =
  | "dashboard"
  | "employees"
  | "customers"
  | "roles"
  | "products"
  | "sections"
  | "orders"
  | "returns-refunds"
  | "shipping-delivery"
  | "payments"
  | "transactions"
  | "customer-credits"
  | "profit-costs"
  | "coupons-discounts"
  | "documents"
  | "uploaded-designs"
  | "exchange-rate"
  | "backup-restore"
  | "support-inbox"
  | "alerts"
  | "settings"
  | "activity-logs"
  | "reports";

export type KpiCardModel = {
  id: string;
  title: string;
  value: string;
  description: string;
  changePercent: number;
  positiveIsGood: boolean;
  color: KpiColor;
  icon: LucideIcon;
  status?: "loading" | "empty" | "error" | "ready";
};

export type TabAccent =
  | "blue"
  | "green"
  | "yellow"
  | "red"
  | "purple"
  | "teal"
  | "orange"
  | "indigo"
  | "gray";

export type AdminTabVariant = "default" | "action";

export type AdminTabConfig = {
  id: string;
  label: string;
  icon: LucideIcon;
  badgeCount?: number;
  accent?: TabAccent;
  /** Primary CTA tab (e.g. + Add Employee) — styled like a top action button */
  variant?: AdminTabVariant;
  tableColumnsKey?: string;
  filterKey?: string;
};

export type AdminPageMeta = {
  id: AdminPageId;
  section: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tabs: AdminTabConfig[];
  defaultTab: string;
};

export type AdminWorkspaceData = {
  orders?: Record<string, unknown>[];
  products?: Record<string, unknown>[];
  users?: Record<string, unknown>[];
  alerts?: Record<string, unknown>[];
  support?: Record<string, unknown>[];
  notifications?: Record<string, unknown>[];
  measurements?: Record<string, unknown>[];
  audit?: Record<string, unknown>[];
  roles?: Record<string, unknown>[];
  permissions?: Record<string, unknown>[];
  documents?: Record<string, unknown>[];
  uploadedDesigns?: Record<string, unknown>[];
  exchangeRates?: Record<string, unknown>[];
  productDiscounts?: Record<string, unknown>[];
  coupons?: Record<string, unknown>[];
  creditCustomers?: Record<string, unknown>[];
  creditRules?: Record<string, unknown>[];
  ledgerEntries?: Record<string, unknown>[];
  activeCreditRule?: Record<string, unknown> | null;
  profitDefaults?: Record<string, unknown> | null;
  catalogProfitRows?: Record<string, unknown>[];
  customProfitRows?: Record<string, unknown>[];
  designerPayments?: Record<string, unknown>[];
  settings?: Record<string, unknown>;
  sections?: Record<string, unknown>[];
};

export type Role = { id: string; name: string; key?: string | null; isSystem?: boolean | null };
export type AccountStatus = "active" | "invited" | "pending" | "inactive" | "blocked" | "suspended";

export type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
  status?: string | null;
  accountStatus?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  profile?: {
    firstName?: string | null;
    fatherName?: string | null;
    grandfatherName?: string | null;
    gender?: string | null;
  };
};

export type EmployeeDirectoryUser = User & {
  assignedRoleId?: string | null;
  assignedRoleName?: string | null;
  roleId?: string | null;
  roleName?: string | null;
};

