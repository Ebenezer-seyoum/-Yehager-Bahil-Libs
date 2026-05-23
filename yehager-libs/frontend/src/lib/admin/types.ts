import type { LucideIcon } from "lucide-react";

export type KpiColor = "green" | "blue" | "yellow" | "red" | "purple" | "gray";

export type AdminPageId =
  | "dashboard"
  | "employees"
  | "customers"
  | "roles"
  | "products"
  | "sections"
  | "orders"
  | "payments"
  | "documents"
  | "exchange-rate"
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
  audit?: Record<string, unknown>[];
  roles?: Record<string, unknown>[];
  permissions?: Record<string, unknown>[];
  documents?: Record<string, unknown>[];
  exchangeRates?: Record<string, unknown>[];
  settings?: Record<string, unknown>;
  sections?: Record<string, unknown>[];
};
