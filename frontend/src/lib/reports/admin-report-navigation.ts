import { categories } from "./report-registry";

export type ReportNavChild = {
  href: string;
  label: string;
  kind: "category" | "report";
  categoryKey: string;
  reportKey?: string;
};

export function buildAdminReportNavChildren(): ReportNavChild[] {
  return [
    {
      href: "/admin/reports",
      label: "Reports Center",
      kind: "report",
      categoryKey: categories[0]?.key ?? "overview",
    },
  ];
}

export function reportHref(categoryKey: string, reportKey: string) {
  return `/admin/reports?category=${categoryKey}&report=${reportKey}`;
}
