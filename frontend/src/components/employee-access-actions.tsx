"use client";

import { RefreshCw, LogOut } from "lucide-react";
import { hardRefreshPage } from "@/lib/hard-refresh";

export function EmployeeAccessActions() {
  return (
    <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => hardRefreshPage()}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh Access
      </button>
      <button
        type="button"
        onClick={() => {
          window.location.replace("/api/logout");
        }}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}
