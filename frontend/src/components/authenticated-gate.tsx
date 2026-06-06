"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UserNotRegisteredError } from "@/components/user-not-registered-error";

export function AuthenticatedGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const protectedPrefixes = ["/cart", "/checkout", "/my-account", "/upload-your-design", "/admin", "/employee"];
  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (isProtectedRoute && authError?.type === "auth_required") {
      navigateToLogin();
    }
  }, [authError, isProtectedRoute, navigateToLogin]);

  if (!isProtectedRoute) {
    return <>{children}</>;
  }

  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (authError?.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  if (authError?.type === "auth_required") {
    return null;
  }

  return <>{children}</>;
}
