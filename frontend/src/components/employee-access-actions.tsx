"use client";

import { RefreshCw, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { hardRefreshPage } from "@/lib/hard-refresh";

export function EmployeeAccessActions() {
  const [checking, setChecking] = useState(false);
  const [approved, setApproved] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      if (checkingRef.current || cancelled) return;
      checkingRef.current = true;
      setChecking(true);
      try {
        const response = await fetch("/api/backend/session", { cache: "no-store" });
        const payload = response.ok ? await response.json() : null;
        const profile = payload?.profile;
        const permissions = Array.isArray(profile?.permissions) ? profile.permissions : [];
        const accessGranted =
          profile?.role === "employee" &&
          profile?.roleStatus === "assigned" &&
          profile?.assignedRoleActive !== false &&
          permissions.length > 0;

        if (accessGranted && !cancelled) {
          setApproved(true);
          window.location.replace("/auth/redirect");
        }
      } catch {
        // Access polling is best-effort; the manual refresh remains available.
      } finally {
        checkingRef.current = false;
        if (!cancelled) setChecking(false);
      }
    };

    void checkAccess();
    const intervalId = window.setInterval(() => void checkAccess(), 10_000);
    const onFocus = () => void checkAccess();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <div className="mt-8 w-full">
      <p className="mb-3 text-xs font-semibold text-slate-500" aria-live="polite">
        {approved ? "Access approved. Opening your workspace…" : checking ? "Checking for role assignment…" : "Access is checked automatically every 10 seconds."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => hardRefreshPage()}
        disabled={approved}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800"
      >
        <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
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
    </div>
  );
}
