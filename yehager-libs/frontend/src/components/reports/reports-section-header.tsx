"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

export function ReportsSectionHeader({
  step,
  title,
  subtitle,
  right,
  collapsed,
  onToggle,
}: {
  step: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">
          {step}
        </div>
        <div>
          <h2 className="text-[18px] font-extrabold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {right}
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {collapsed ? (
              <>
                Show <ChevronDown className="h-4 w-4" />
              </>
            ) : (
              <>
                Hide <ChevronUp className="h-4 w-4" />
              </>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}
