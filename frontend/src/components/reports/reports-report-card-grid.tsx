"use client";

import { Check } from "lucide-react";
import {
  colorMap,
  type ReportCategoryKey,
  type ReportKey,
} from "@/lib/reports/report-registry";

type ReportCard = {
  key: ReportKey;
  category: ReportCategoryKey;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
};

export function ReportsReportCardGrid({
  reports,
  selectedReport,
  viewMode,
  onSelect,
}: {
  reports: ReportCard[];
  selectedReport: ReportKey;
  viewMode: "grid" | "list";
  onSelect: (category: ReportCategoryKey, report: ReportKey) => void;
}) {
  if (!reports.length) {
    return (
      <p className="py-12 text-center text-sm text-slate-500">No reports match your search.</p>
    );
  }

  return (
    <div
      className={
        viewMode === "grid"
          ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          : "flex flex-col gap-3"
      }
    >
      {reports.map((report) => {
        const Icon = report.icon;
        const active = selectedReport === report.key;

        return (
          <button
            key={report.key}
            type="button"
            onClick={() => onSelect(report.category, report.key)}
            className={`relative rounded-xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-md ${
              viewMode === "grid" ? "min-h-[104px] p-4" : "flex items-center gap-4 p-4"
            } ${
              active
                ? "border-blue-500 shadow-[0_0_0_1px_rgba(37,99,235,0.85)]"
                : "border-slate-200 shadow-sm"
            }`}
          >
            {active ? (
              <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check className="h-4 w-4" />
              </div>
            ) : null}

            <div className={`flex gap-3 ${viewMode === "list" ? "w-full items-center" : ""}`}>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                  colorMap[report.color] ?? colorMap.blue
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 pr-6">
                <div className="text-[14px] font-extrabold text-slate-900">{report.title}</div>
                <div className="mt-1.5 text-[12px] leading-5 text-slate-500">{report.subtitle}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
