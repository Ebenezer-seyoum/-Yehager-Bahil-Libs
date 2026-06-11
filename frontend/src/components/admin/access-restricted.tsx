"use client";

import Link from "next/link";
import { LayoutDashboard, RefreshCw, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

export function AccessRestricted({
  requiredPermission,
  sectionName,
  description,
}: {
  requiredPermission: string;
  sectionName: string;
  description?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <div className="flex flex-col items-center p-8 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-rose-600">Access Restricted</p>
          <h1 className="mb-3 text-2xl font-black text-slate-950">You do not have permission to view this page.</h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-500">
            {description ??
              `This section contains ${sectionName.toLowerCase()} records and requires view access. Please contact your administrator to request permission.`}
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            Required permission: <span className="text-slate-950">{requiredPermission}</span>
          </div>

          <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
            <Link
              href="/admin"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              <LayoutDashboard className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
