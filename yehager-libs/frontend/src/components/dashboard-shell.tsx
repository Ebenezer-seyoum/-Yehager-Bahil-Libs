"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  BellRing,
  Boxes,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Menu,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { can } from "@/lib/permissions";

type NavigationIcon =
  | "dashboard"
  | "users"
  | "customers"
  | "products"
  | "orders"
  | "exchange"
  | "alerts"
  | "audit"
  | "roles"
  | "reports"
  | "settings";

type NavigationItem = {
  href: string;
  label: string;
  icon: NavigationIcon;
  permission: string;
};

type NavigationGroup = {
  label: string;
  items: readonly NavigationItem[];
};

const icons = {
  dashboard: LayoutDashboard,
  users: UsersRound,
  customers: UserRound,
  products: Boxes,
  orders: ClipboardList,
  exchange: ArrowLeftRight,
  alerts: BellRing,
  audit: ScrollText,
  roles: ShieldCheck,
  reports: BarChart3,
  settings: Settings,
};

export function DashboardShell({
  children,
  navigation,
  title,
  subtitle,
  variant,
}: {
  children: React.ReactNode;
  navigation: readonly NavigationGroup[];
  title: string;
  subtitle?: string;
  variant: "admin" | "employee";
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [refreshedPermissions, setRefreshedPermissions] = useState<string[] | null>(null);
  const permissions = refreshedPermissions ?? session?.user?.permissions ?? [];
  const visibleGroups =
    variant === "admin"
      ? navigation
      : navigation
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => can(permissions, item.permission)),
          }))
          .filter((group) => group.items.length > 0);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const profileHref = variant === "admin" ? "/admin/settings" : "/employee/settings";
  const adminTopBar = variant === "admin";
  const initials =
    session?.user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    session?.user?.email?.slice(0, 2).toUpperCase() ||
    "U";

  useEffect(() => {
    if (!session?.user?.id || (session.user.permissions?.length ?? 0) > 0) {
      return;
    }

    fetch("/api/backend/session")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const permissions = payload?.profile?.permissions;
        if (Array.isArray(permissions)) {
          setRefreshedPermissions(permissions);
        }
      })
      .catch(() => {
        setRefreshedPermissions([]);
      });
  }, [session?.user?.id, session?.user?.permissions]);

  useEffect(() => {
    setCollapsedGroups((current) => {
      const next = { ...current };
      for (const group of visibleGroups) {
        if (group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))) {
          next[group.label] = false;
        }
      }
      return next;
    });
  }, [pathname, visibleGroups]);

  const sidebar = (
    <aside className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Link href={variant === "admin" ? "/admin" : "/employee"} className="flex items-center gap-3">
          <img
            src="https://media.base44.com/images/public/69cc55fa50bba233144fe99d/5050da81c_YeHagerBahilLibs-03.png"
            alt="Yehager Bahil Libs"
            className="h-11 w-11 rounded-full object-cover"
          />
          <div>
            <p className="text-[15px] font-bold tracking-tight text-white">Yehager Bahil Libs</p>
            <p className="text-xs font-medium text-sidebar-foreground/65">{variant === "admin" ? "Admin Console" : "Employee Console"}</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {visibleGroups.map((group) => (
          <section key={group.label}>
            <button
              type="button"
              onClick={() =>
                setCollapsedGroups((current) => ({
                  ...current,
                  [group.label]: !current[group.label],
                }))
              }
              className={
                variant === "admin" && group.label === "Users"
                  ? "mb-2 flex w-full items-center justify-between rounded-xl bg-sidebar-accent px-3 py-2.5 text-left text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-sidebar-accent/90"
                  : "flex w-full items-center justify-between px-3 pb-2 text-left text-xs font-bold uppercase tracking-[0.2em] text-sidebar-foreground/65 transition hover:text-sidebar-foreground"
              }
            >
              <span>{group.label}</span>
              {collapsedGroups[group.label] ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {!collapsedGroups[group.label] ? (
              <div className={variant === "admin" && group.label === "Users" ? "ml-3 space-y-1 border-l border-sidebar-border pl-3" : "space-y-1"}>
                {group.items.map((item) => {
                  const Icon = icons[item.icon];
                  const active = pathname === item.href || (item.href !== "/admin" && item.href !== "/employee" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={
                        active
                          ? "flex items-center gap-3 rounded-xl bg-sidebar-primary px-3 py-2.5 text-[15px] font-bold text-sidebar-primary-foreground shadow-sm"
                          : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-sidebar-foreground/88 transition hover:bg-sidebar-accent hover:text-white"
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </section>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-xl bg-sidebar-accent p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{variant}</p>
          <p className="mt-1 truncate text-sm font-medium">{session?.user?.email ?? "Signed in"}</p>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="dashboard-theme min-h-screen bg-background text-foreground">
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">{sidebar}</div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
          <div className="relative h-full w-72">{sidebar}</div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header
          className={
            adminTopBar
              ? "sticky top-0 z-30 border-b border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[0_14px_32px_rgba(0,0,0,0.28)]"
              : "sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur"
          }
        >
          <div className="flex min-h-20 flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:h-20 lg:flex-nowrap lg:px-8 lg:py-0">
            <button
              type="button"
              className={adminTopBar ? "rounded-xl border border-white/10 bg-sidebar-accent/80 p-2 lg:hidden" : "rounded-xl border border-border p-2 lg:hidden"}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={
                  adminTopBar
                    ? "text-[11px] font-semibold uppercase tracking-[0.28em] text-sidebar-primary"
                    : "text-xs uppercase tracking-[0.2em] text-primary"
                }
              >
                {variant}
              </p>
              <h1 className={adminTopBar ? "truncate text-lg font-bold tracking-tight text-white sm:text-xl" : "truncate text-lg font-semibold"}>{title}</h1>
            </div>

            <div
              className={
                adminTopBar
                  ? "order-3 hidden w-full items-center gap-2 rounded-2xl border border-white/10 bg-sidebar-accent/80 px-4 py-2.5 text-sm text-sidebar-foreground/75 shadow-inner shadow-black/20 md:flex lg:order-none lg:max-w-sm"
                  : "hidden w-full max-w-sm items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground md:flex"
              }
            >
              <Search className={adminTopBar ? "h-4 w-4 text-sidebar-primary" : "h-4 w-4"} />
              Search anything...
            </div>

            <button
              type="button"
              className={
                adminTopBar
                  ? "relative rounded-2xl border border-white/10 bg-sidebar-accent/80 p-2.5 shadow-inner shadow-black/20 transition hover:bg-sidebar-accent"
                  : "relative rounded-xl border border-border p-2.5"
              }
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                className={
                adminTopBar
                  ? "flex items-center gap-2 rounded-2xl border border-white/10 bg-sidebar-accent/80 px-1.5 py-1.5 shadow-inner shadow-black/20 transition hover:bg-sidebar-accent sm:px-2"
                  : "flex items-center gap-2 rounded-xl border border-border px-2 py-1.5"
                }
              >
                <span
                  className={
                    adminTopBar
                      ? "flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground"
                      : "flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold"
                  }
                >
                  {initials}
                </span>
                <span className={adminTopBar ? "hidden max-w-[120px] truncate text-sm font-medium text-white sm:block" : "hidden max-w-[120px] truncate text-sm sm:block"}>
                  {session?.user?.name ?? "Account"}
                </span>
                <ChevronDown className={adminTopBar ? "hidden h-4 w-4 text-sidebar-foreground/60 sm:block" : "hidden h-4 w-4 text-muted-foreground sm:block"} />
              </button>
              {profileOpen ? (
                <div
                  className={
                    adminTopBar
                      ? "absolute right-0 top-full z-40 mt-2 w-60 rounded-2xl border border-sidebar-border bg-sidebar p-2 text-sidebar-foreground shadow-2xl"
                      : "absolute right-0 top-full z-40 mt-2 w-60 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl"
                  }
                >
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{session?.user?.name ?? "Account"}</p>
                    <p className={adminTopBar ? "truncate text-xs text-sidebar-foreground/65" : "truncate text-xs text-muted-foreground"}>
                      {session?.user?.email}
                    </p>
                  </div>
                  <div className={adminTopBar ? "my-1 h-px bg-sidebar-border" : "my-1 h-px bg-border"} />
                  <Link
                    href={profileHref}
                    onClick={() => setProfileOpen(false)}
                    className={
                      adminTopBar
                        ? "block rounded-xl px-3 py-2 text-sm transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        : "block rounded-xl px-3 py-2 text-sm transition hover:bg-secondary"
                    }
                  >
                    Profile settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className={
                      adminTopBar
                        ? "block w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        : "block w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-secondary"
                    }
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          {subtitle ? (
            <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
