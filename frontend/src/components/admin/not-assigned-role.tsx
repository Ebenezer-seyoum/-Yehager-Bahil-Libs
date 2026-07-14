"use client";

import { ShieldAlert, RefreshCw, LogOut } from "lucide-react";

export function NotAssignedRole() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="flex flex-col items-center p-8 text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <ShieldAlert className="h-12 w-12" />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-slate-900">Access Pending</h1>
          <p className="mb-8 text-sm leading-relaxed text-slate-500">
            Your employee account has been created, but you haven't been assigned a role yet. 
            Please contact your system administrator to assign you a role before you can access the dashboard.
          </p>

          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-95"
            >
              <RefreshCw className="h-4.5 w-4.5" />
              Refresh Page
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.replace("/api/logout");
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
            >
              <LogOut className="h-4.5 w-4.5" />
              Sign Out
            </button>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 p-4 text-center text-xs text-slate-400">
          If you believe this is an error, please reach out to IT support.
        </div>
      </div>
    </div>
  );
}
