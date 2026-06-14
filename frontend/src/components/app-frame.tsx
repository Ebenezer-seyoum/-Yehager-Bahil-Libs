"use client";

import { usePathname } from "next/navigation";
import { SiteShell } from "@/components/site-shell";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()!;
  const isStandaloneRoute =
    pathname === "/signin" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/employee");

  if (isStandaloneRoute) {
    return <>{children}</>;
  }

  return <SiteShell>{children}</SiteShell>;
}
