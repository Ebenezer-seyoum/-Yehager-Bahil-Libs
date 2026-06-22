"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "ybl-staff-preview";

function staffDashboardHref(role?: string | null) {
  return role === "employee" ? "/employee" : "/admin";
}

export function useStaffPreviewMode() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const role = String(session?.user?.role ?? "").toLowerCase();
  const isStaff = role === "admin" || role === "employee";
  const queryActive = searchParams?.get("staffPreview") === "1";
  const storedActive = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      window.addEventListener("staff-preview-change", onStoreChange);
      return () => {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener("staff-preview-change", onStoreChange);
      };
    },
    () => window.localStorage.getItem(STORAGE_KEY) === "1",
    () => false,
  );

  useEffect(() => {
    if (queryActive) {
      window.localStorage.setItem(STORAGE_KEY, "1");
      window.dispatchEvent(new Event("staff-preview-change"));
    }
  }, [queryActive]);

  return {
    isStaff,
    isStaffPreview: isStaff && (queryActive || storedActive),
    dashboardHref: staffDashboardHref(role),
  };
}

export function StaffPreviewModeBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { isStaffPreview, dashboardHref } = useStaffPreviewMode();
  const role = String(session?.user?.role ?? "").toLowerCase();
  const currentPath = pathname ?? "";
  const isDashboardRoute = currentPath.startsWith("/admin") || currentPath.startsWith("/employee");
  const roleLabel = useMemo(() => (role === "employee" ? "employee" : "admin"), [role]);

  if (!isStaffPreview || isDashboardRoute) return null;

  function exitPreview() {
    window.localStorage.removeItem(STORAGE_KEY);
    router.push(dashboardHref);
  }

  return (
    <div className="border-b border-red-950 bg-[#4a0505] px-4 py-3 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em]">Staff Preview Mode</p>
          <p className="mt-1 text-sm leading-6 text-red-50">
            You are reviewing the customer storefront in {roleLabel} preview mode. All navigation and browsing features remain available, while cart checkout and order submission are disabled to prevent staff accounts from creating customer orders.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={exitPreview} className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-black text-[#4a0505] hover:bg-red-50">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export function StaffPreviewOrderNotice({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-red-900 bg-[#4a0505] p-4 text-sm text-red-50 ${className}`}>
      <p className="font-black uppercase tracking-[0.14em] text-white">Checkout disabled in staff preview</p>
      <p className="mt-1 leading-6">This storefront is open for review only. Admin and employee accounts cannot create carts, checkout, or place customer orders.</p>
    </div>
  );
}
