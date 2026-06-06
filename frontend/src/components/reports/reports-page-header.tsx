"use client";

import { Sparkles } from "lucide-react";

export function ReportsPageHeader() {
  return (
    <div className="border-b border-slate-200 bg-white px-6 py-5 shadow-sm xl:px-8">
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
        <Sparkles className="h-3.5 w-3.5" />
        Reports Center
      </div>
      <h1 className="mt-3 text-[30px] font-black tracking-tight text-slate-950">Reports Center</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-500">View, analyze and export your business performance reports</p>
    </div>
  );
}
