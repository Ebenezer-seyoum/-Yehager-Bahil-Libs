import { categories, firstReportInCategory } from "./report-registry";

export type ReportNavChild = {
  href: string;
  label: string;
  kind: "category" | "report";
  categoryKey: string;
  reportKey?: string;
};

export function buildReportNavChildren(basePath: string): ReportNavChild[] {
  return categories.map((category) => {
    const reportKey = firstReportInCategory(category.key);

    return {
      href: reportHref(category.key, reportKey, basePath),
      label: category.title,
      kind: "category",
      categoryKey: category.key,
      reportKey,
    };
  });
}

export function buildAdminReportNavChildren(): ReportNavChild[] {
  return buildReportNavChildren("/admin/reports");
}

export function buildEmployeeReportNavChildren(): ReportNavChild[] {
  return buildReportNavChildren("/employee/reports");
}

export function reportHref(
  categoryKey: string,
  reportKey: string,
  basePath = "/admin/reports",
) {
  const params = new URLSearchParams({ category: categoryKey, report: reportKey });
  return `${basePath}?${params.toString()}`;
}
