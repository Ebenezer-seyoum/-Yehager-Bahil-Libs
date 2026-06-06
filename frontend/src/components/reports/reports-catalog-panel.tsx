"use client";

import {
  categories,
  colorMap,
  getReport,
  reportsForCategory,
  reportsList,
  type ReportCategoryKey,
  type ReportKey,
} from "@/lib/reports/report-registry";

export function ReportsCatalogPanel({
  selectedCategory,
  selectedReport,
  onSelectReport,
}: {
  selectedCategory: ReportCategoryKey;
  selectedReport: ReportKey;
  onSelectReport: (category: ReportCategoryKey, report: ReportKey) => void;
}) {
  const current = getReport(selectedReport);

  return (
    <div className="space-y-6 px-2 py-4 sm:px-4">
      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Active report</p>
        <h3 className="mt-1 text-lg font-bold text-slate-900">{current.title}</h3>
        <p className="mt-2 text-sm text-slate-600">{current.subtitle}</p>
      </div>

      {categories.map((category) => {
        const reports = reportsForCategory(category.key);
        if (!reports.length) return null;

        return (
          <div key={category.key}>
            <h4 className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              {category.title}
            </h4>
            <ul className="space-y-1">
              {reports.map((report) => {
                const Icon = report.icon;
                const active = selectedReport === report.key;
                return (
                  <li key={report.key}>
                    <button
                      type="button"
                      onClick={() => onSelectReport(category.key, report.key)}
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition ${
                        active
                          ? "border-blue-500 bg-white shadow-sm"
                          : "border-transparent bg-white/60 hover:border-slate-200 hover:bg-white hover:shadow-sm"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                          colorMap[report.color] ?? colorMap.blue
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-bold text-slate-900">{report.title}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{report.subtitle}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <p className="text-center text-xs text-slate-400">
        {reportsList.length} reports available across {categories.length} categories
      </p>
    </div>
  );
}
