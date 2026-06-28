"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { UserNotRegisteredError } from "@/components/user-not-registered-error";

export function AuthenticatedGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()!;
  const router = useRouter();
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const protectedPrefixes = ["/cart", "/checkout", "/my-account", "/upload-your-design", "/admin", "/employee"];
  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isPasswordRequiredRoute = pathname === "/change-password-required";

  useEffect(() => {
    if (isProtectedRoute && authError?.type === "auth_required") {
      navigateToLogin();
    }
  }, [authError, isProtectedRoute, navigateToLogin]);

  useEffect(() => {
    if (!isProtectedRoute || isLoadingAuth || isLoadingPublicSettings || authError) return;
    const profile = user as { role?: string | null; profileComplete?: boolean | null } | null;
    if (profile?.role === "customer" && profile.profileComplete === false && pathname !== "/my-account") {
      router.replace("/my-account?completeProfile=1");
    }
  }, [authError, isLoadingAuth, isLoadingPublicSettings, isProtectedRoute, pathname, router, user]);

  useEffect(() => {
    if (isLoadingAuth || isLoadingPublicSettings || authError) return;
    const profile = user as { mustChangePassword?: boolean | null } | null;
    if (profile?.mustChangePassword && !isPasswordRequiredRoute) {
      router.replace("/change-password-required");
    }
  }, [authError, isLoadingAuth, isLoadingPublicSettings, isPasswordRequiredRoute, router, user]);

  const profile = user as { mustChangePassword?: boolean | null } | null;
  if (profile?.mustChangePassword && !isPasswordRequiredRoute) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
      </div>
    );
  }

  if (!isProtectedRoute && !isPasswordRequiredRoute) {
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
