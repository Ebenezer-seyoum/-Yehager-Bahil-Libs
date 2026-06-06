"use client";

import {
  categories,
  colorMap,
  firstReportInCategory,
  type ReportCategoryKey,
} from "@/lib/reports/report-registry";

export function ReportsCategorySidebar({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: ReportCategoryKey;
  onSelectCategory: (category: ReportCategoryKey) => void;
}) {
  return (
    <aside className="w-full border-r border-slate-200 bg-white p-4 lg:w-[320px] lg:shrink-0">
      <h3 className="mb-3 text-[14px] font-extrabold text-slate-800">Report Categories</h3>

      <div className="space-y-1">
        {categories.map((category) => {
          const Icon = category.icon;
          const active = selectedCategory === category.key;

          return (
            <button
              key={category.key}
              type="button"
              onClick={() => onSelectCategory(category.key)}
              className={`group flex w-full items-center gap-3 border-l-[3px] px-3 py-3 text-left transition ${
                active
                  ? "border-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50"
                  : "border-transparent hover:bg-slate-50"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                  colorMap[category.color] ?? colorMap.blue
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`text-[14px] font-extrabold ${
                    active ? "text-blue-700" : "text-slate-800"
                  }`}
                >
                  {category.title}
                </div>
                <div className="truncate text-[12px] text-slate-500">{category.subtitle}</div>
              </div>

              <span className={active ? "text-blue-600" : "text-slate-300"}>›</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export { firstReportInCategory };
