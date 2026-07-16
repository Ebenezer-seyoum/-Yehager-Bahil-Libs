"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  BellRing,
  Boxes,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  FolderTree,
  Inbox,
  LayoutDashboard,
  Menu,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  canAccessNavigationItem,
  type NavigationGroup,
  type NavigationItem,
} from "@/lib/dashboard-navigation";

type NotificationCounts = {
  orders?: number;
  orderIds?: Array<string | null | undefined>;
  groupOrders?: number;
  payments?: number;
  paymentIds?: Array<string | null | undefined>;
  alerts?: number;
  support?: number;
  customDesigns?: number;
  customDesignIds?: Array<string | null | undefined>;
  customOrders?: number;
  customOrderIds?: Array<string | null | undefined>;
  refundIssues?: number;
  refundIssueIds?: Array<string | null | undefined>;
  shippingDelivery?: number;
  shippingDeliveryIds?: Array<string | null | undefined>;
  catalogPrices?: number;
  catalogPriceProductIds?: Array<string | null | undefined>;
  total?: number;
};

const icons = {
  dashboard: LayoutDashboard,
  users: UsersRound,
  customers: UserRound,
  products: Boxes,
  sections: FolderTree,
  orders: ClipboardList,
  payments: CreditCard,
  documents: FileText,
  exchange: ArrowLeftRight,
  alerts: BellRing,
  audit: ScrollText,
  roles: ShieldCheck,
  reports: BarChart3,
  settings: Settings,
  inbox: Inbox,
};

export function DashboardShell({
  children,
  navigation,
  title,
  subtitle,
  variant,
  notificationCounts,
  accountProfile,
}: {
  children: React.ReactNode;
  navigation: readonly NavigationGroup[];
  title: string;
  subtitle?: string;
  variant: "admin" | "employee";
  notificationCounts?: NotificationCounts;
  accountProfile?: {
    displayName?: string | null;
    avatarUrl?: string | null;
    assignedRoleName?: string | null;
    assignedRoleActive?: boolean | null;
    roleStatus?: "unassigned" | "assigned" | null;
    permissions?: string[] | null;
  };
}) {
  const pathname = usePathname()!;
  const router = useRouter();
  const searchParams = useSearchParams()!;
  const { data: session, update: updateSession } = useSession();
  const isReportsRoute = pathname.startsWith("/admin/reports");
  const isActivityRoute = pathname.startsWith("/admin/audit");
  const shellTitle = isReportsRoute
    ? "Reports Center"
    : isActivityRoute
      ? "Activity Logs"
      : title;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [refreshedPermissions, setRefreshedPermissions] = useState<string[] | null>(null);
  const [refreshedRoleStatus, setRefreshedRoleStatus] = useState<"unassigned" | "assigned" | null>(null);
  const [refreshedAssignedRoleName, setRefreshedAssignedRoleName] = useState<string | null>(accountProfile?.assignedRoleName ?? null);
  const [refreshedAssignedRoleActive, setRefreshedAssignedRoleActive] = useState<boolean | null>(accountProfile?.assignedRoleActive ?? null);
  const [refreshedName, setRefreshedName] = useState<string | null>(accountProfile?.displayName ?? null);
  const [refreshedAvatarUrl, setRefreshedAvatarUrl] = useState<string | null>(accountProfile?.avatarUrl ?? null);
  const permissions = useMemo(
    () => refreshedPermissions ?? accountProfile?.permissions ?? session?.user?.permissions ?? [],
    [accountProfile?.permissions, refreshedPermissions, session?.user?.permissions],
  );
  const isUnassignedEmployee =
    session?.user?.role === "employee" &&
    ((refreshedRoleStatus ?? accountProfile?.roleStatus ?? session.user.roleStatus) === "unassigned" ||
      (refreshedAssignedRoleActive ?? session.user.assignedRoleActive) === false ||
      permissions.length === 0);
  const showPendingAccess = isUnassignedEmployee && pathname !== "/admin/profile";
  const isFullAdmin = session?.user?.role === "admin";
  const hasAccess = (permission: string) => isFullAdmin || permissions.includes(permission);
  const shellRoleLabel = session?.user?.role === "employee" ? "Employee" : "Admin";
  const assignedRoleLabel =
    session?.user?.role === "employee"
      ? refreshedAssignedRoleName ?? session.user.assignedRoleName ?? (isUnassignedEmployee ? "Access pending" : "Assigned employee")
      : session?.user?.role ?? variant;
  const visibleGroups = useMemo(
    () =>
      isFullAdmin
        ? navigation
        : isUnassignedEmployee
        ? []
        : navigation
            .map((group) => ({
              ...group,
              items: group.items.filter((item) => canAccessNavigationItem(permissions, item)),
            }))
            .filter((group) => group.items.length > 0),
    [isFullAdmin, isUnassignedEmployee, navigation, permissions],
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [expandedNavItems, setExpandedNavItems] = useState<Record<string, boolean>>({
    "/admin/reports": true,
  });

  function isReportChildActive(href: string) {
    if (!isReportsRoute) return false;
    const queryIndex = href.indexOf("?");
    if (queryIndex === -1) {
      return true;
    }
    const params = new URLSearchParams(href.slice(queryIndex + 1));
    const activeCategory = searchParams.get("category") ?? "overview";
    const activeReport = searchParams.get("report") ?? "business-overview";
    return activeCategory === params.get("category") && activeReport === params.get("report");
  }

  function isNavItemActive(item: NavigationItem) {
    if (item.children?.length) {
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    }
    return (
      pathname === item.href ||
      (item.href !== "/admin" &&
        item.href !== "/employee" &&
        pathname.startsWith(`${item.href}/`) &&
        !(item.href === "/admin/orders" && pathname.startsWith("/admin/orders/documents")))
    );
  }

  function isChildActive(href: string) {
    const queryIndex = href.indexOf("?");
    const childPath = queryIndex === -1 ? href : href.slice(0, queryIndex);
    if (pathname !== childPath) return false;
    if (queryIndex === -1) return true;

    const params = new URLSearchParams(href.slice(queryIndex + 1));
    for (const [key, value] of params.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  }
  const profileHref = session?.user?.role === "employee" ? "/admin/profile" : "/admin/settings";
  const adminTopBar = variant === "admin" || variant === "employee";
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const counts = notificationCounts ?? {};
  const [viewedOrderIds, setViewedOrderIds] = useState<string[]>([]);
  const [viewedPaymentIds, setViewedPaymentIds] = useState<string[]>([]);
  const [viewedCustomDesignIds, setViewedCustomDesignIds] = useState<string[]>([]);
  const [viewedShippingDeliveryIds, setViewedShippingDeliveryIds] = useState<string[]>([]);
  const [visibleSupportCount, setVisibleSupportCount] = useState(counts.support ?? 0);
  const [visibleCatalogPriceCount, setVisibleCatalogPriceCount] = useState(counts.catalogPrices ?? 0);
  const [catalogPriceProductIds, setCatalogPriceProductIds] = useState<string[]>(
    (counts.catalogPriceProductIds ?? []).filter(Boolean).map(String),
  );
  const activeOrderIds = (counts.orderIds ?? []).filter(Boolean).map(String);
  const activePaymentIds = (counts.paymentIds ?? []).filter(Boolean).map(String);
  const activeCustomDesignIds = (counts.customDesignIds ?? []).filter(Boolean).map(String);
  const activeCustomOrderIds = (counts.customOrderIds ?? []).filter(Boolean).map(String);
  const activeRefundIssueIds = (counts.refundIssueIds ?? []).filter(Boolean).map(String);
  const activeShippingDeliveryIds = (counts.shippingDeliveryIds ?? []).filter(Boolean).map(String);
  const visibleOrderCount = activeOrderIds.length > 0
    ? activeOrderIds.filter((id) => !viewedOrderIds.includes(id)).length
    : Math.max((counts.orders ?? 0) - viewedOrderIds.length, 0);
  const visiblePaymentCount = activePaymentIds.length > 0
    ? activePaymentIds.filter((id) => !viewedPaymentIds.includes(id)).length
    : counts.payments ?? 0;
  const visibleCustomDesignCount = activeCustomDesignIds.length > 0
    ? activeCustomDesignIds.filter((id) => !viewedCustomDesignIds.includes(id)).length
    : Math.max((counts.customDesigns ?? 0) - viewedCustomDesignIds.length, 0);
  const visibleCustomOrderCount = activeCustomOrderIds.length > 0
    ? activeCustomOrderIds.filter((id) => !viewedOrderIds.includes(id)).length
    : Math.max((counts.customOrders ?? 0) - viewedOrderIds.length, 0);
  const visibleRefundIssueCount = activeRefundIssueIds.length > 0
    ? activeRefundIssueIds.filter((id) => !viewedOrderIds.includes(id)).length
    : counts.refundIssues ?? 0;
  const visibleShippingDeliveryCount = activeShippingDeliveryIds.length > 0
    ? activeShippingDeliveryIds.filter((id) => !viewedShippingDeliveryIds.includes(id)).length
    : Math.max((counts.shippingDelivery ?? 0) - viewedShippingDeliveryIds.length, 0);
  const canViewAlerts = hasAccess("alerts.view");
  const canViewProducts = hasAccess("products.view");
  const canViewSupport = hasAccess("support.view");
  const notificationItems = [
    {
      href: catalogPriceProductIds[0] ? `/admin/inventory/${catalogPriceProductIds[0]}` : "/admin/inventory?tab=new-prices",
      label: "New catalog price submitted",
      value: visibleCatalogPriceCount,
      permissions: ["products.view"],
      Icon: Boxes,
      accent: "bg-emerald-400",
      active: "border-emerald-400/30 bg-emerald-400/10 text-emerald-50",
      badge: "bg-emerald-400 text-slate-950",
    },
    {
      href: "/admin/payments",
      label: "New payments received",
      value: visiblePaymentCount,
      permissions: ["payments.view"],
      Icon: CreditCard,
      accent: "bg-amber-400",
      active: "border-amber-400/30 bg-amber-400/10 text-amber-50",
      badge: "bg-amber-400 text-slate-950",
    },
    {
      href: "/admin/custom-orders?tab=requests&filter=awaiting-review",
      label: "Custom requests awaiting review",
      value: visibleCustomDesignCount,
      permissions: ["uploaded_designs.view"],
      Icon: FileText,
      accent: "bg-violet-400",
      active: "border-violet-400/30 bg-violet-400/10 text-violet-50",
      badge: "bg-violet-400 text-slate-950",
    },
    {
      href: "/admin/custom-orders?tab=orders&filter=awaiting-review",
      label: "Custom orders awaiting review",
      value: visibleCustomOrderCount,
      permissions: ["orders.view"],
      Icon: ClipboardList,
      accent: "bg-fuchsia-400",
      active: "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-50",
      badge: "bg-fuchsia-400 text-slate-950",
    },
    {
      href: "/admin/catalog-orders?filter=awaiting-review",
      label: "Catalog orders awaiting review",
      value: visibleOrderCount,
      permissions: ["orders.view"],
      Icon: ClipboardList,
      accent: "bg-blue-400",
      active: "border-blue-400/30 bg-blue-400/10 text-blue-50",
      badge: "bg-blue-400 text-slate-950",
    },
    {
      href: "/admin/orders/shipping-delivery",
      label: "Orders ready for delivery",
      value: visibleShippingDeliveryCount,
      permissions: ["shipping.view"],
      Icon: ClipboardList,
      accent: "bg-cyan-400",
      active: "border-cyan-400/30 bg-cyan-400/10 text-cyan-50",
      badge: "bg-cyan-400 text-slate-950",
    },
    {
      href: "/admin/orders/returns-refunds?filter=awaiting-review",
      label: "Refund issues awaiting review",
      value: visibleRefundIssueCount,
      permissions: ["returns.view"],
      Icon: ArrowLeftRight,
      accent: "bg-rose-400",
      active: "border-rose-400/30 bg-rose-400/10 text-rose-50",
      badge: "bg-rose-400 text-white",
    },
  ].filter((item) => item.permissions.some(hasAccess));
  const totalNotifications = notificationItems.reduce((total, item) => total + item.value, 0);
  const badgeForHref = (href: string) => {
    if (variant !== "admin") return 0;
    if (href === "/admin/orders" || href === "/admin/catalog-orders") return visibleOrderCount;
    if (href === "/admin/group-orders") return counts.groupOrders ?? 0;
    if (href === "/admin/payments") return visiblePaymentCount;
    if (href === "/admin/uploaded-designs" || href === "/admin/custom-orders") return visibleCustomDesignCount + visibleCustomOrderCount;
    if (href === "/admin/orders/shipping-delivery") return visibleShippingDeliveryCount;
    if (href === "/admin/orders/returns-refunds") return visibleRefundIssueCount;
    if (href === "/admin/inventory") return visibleCatalogPriceCount;
    if (href === "/admin/alerts") return totalNotifications;
    if (href === "/admin/support-inbox") return visibleSupportCount;
    return 0;
  };
  const displayAccountName = refreshedName ?? session?.user?.name ?? "Account";
  const initials =
    displayAccountName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    session?.user?.email?.slice(0, 2).toUpperCase() ||
    "U";
  const profileImage =
    refreshedAvatarUrl ||
    (session?.user as { image?: string | null; avatarUrl?: string | null } | undefined)?.image ||
    (session?.user as { image?: string | null; avatarUrl?: string | null } | undefined)?.avatarUrl ||
    null;

  useEffect(() => {
    if (!session?.user?.id) return;

    const refreshAccess = async () => {
      try {
        const response = await fetch("/api/backend/session", { cache: "no-store" });
        const payload = response.ok ? await response.json() : null;
        if (!payload) return;
        const nextPermissions = payload?.profile?.permissions;
        const nextRoleStatus = payload?.profile?.roleStatus;
        const nextAssignedRoleName = payload?.profile?.assignedRoleName;
        const nextAssignedRoleActive = payload?.profile?.assignedRoleActive;
        const nextEmployeeProfile = payload?.profile?.profile;
        const nextProfileDisplayName = [
          nextEmployeeProfile?.firstName,
          nextEmployeeProfile?.fatherName,
        ]
          .map((part) => String(part ?? "").trim())
          .filter(Boolean)
          .join(" ");
        const nextName = nextProfileDisplayName || payload?.profile?.displayName || payload?.profile?.name;
        const nextAvatarUrl = payload?.profile?.avatarUrl;
        if (Array.isArray(nextPermissions)) setRefreshedPermissions(nextPermissions);
        if (nextRoleStatus === "assigned" || nextRoleStatus === "unassigned") setRefreshedRoleStatus(nextRoleStatus);
        if (typeof nextAssignedRoleName === "string") setRefreshedAssignedRoleName(nextAssignedRoleName);
        if (nextAssignedRoleName === null) setRefreshedAssignedRoleName(null);
        if (typeof nextAssignedRoleActive === "boolean") setRefreshedAssignedRoleActive(nextAssignedRoleActive);
        if (nextAssignedRoleActive === null) setRefreshedAssignedRoleActive(null);
        if (typeof nextName === "string") setRefreshedName(nextName);
        if (nextName === null) setRefreshedName(null);
        if (typeof nextAvatarUrl === "string") setRefreshedAvatarUrl(nextAvatarUrl);
        if (nextAvatarUrl === null) setRefreshedAvatarUrl(null);

        // Rebuild the NextAuth JWT and server-rendered layout after the
        // backend returns the latest role assignment.
        await updateSession();
        router.refresh();
      } catch {
        // Permission polling is best-effort; existing access remains visible.
      }
    };

    const handleFocus = () => void refreshAccess();
    void refreshAccess();
    const intervalId = window.setInterval(() => void refreshAccess(), 15000);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [router, session?.user?.id, updateSession]);

  useEffect(() => {
    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string | null; avatarUrl?: string | null }>).detail;
      if (typeof detail?.name === "string") setRefreshedName(detail.name);
      if (detail?.name === null) setRefreshedName(null);
      if (typeof detail?.avatarUrl === "string") setRefreshedAvatarUrl(detail.avatarUrl);
      if (detail?.avatarUrl === null) setRefreshedAvatarUrl(null);
    };
    window.addEventListener("dashboard-profile-updated", onProfileUpdated);
    return () => window.removeEventListener("dashboard-profile-updated", onProfileUpdated);
  }, []);

  useEffect(() => {
    if (variant !== "admin" || !canViewSupport) return;
    const timeoutId = window.setTimeout(() => setVisibleSupportCount(counts.support ?? 0), 0);
    return () => window.clearTimeout(timeoutId);
  }, [canViewSupport, counts.support, variant]);

  useEffect(() => {
    if (variant !== "admin" || !canViewAlerts || !canViewProducts) return;
    const refreshCatalogPriceNotifications = () => {
      fetch("/api/backend/admin/summary-counts", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : null)
        .then((payload) => {
          const data = payload?.data;
          if (!data) return;
          const ids = Array.isArray(data.catalogPriceProductIds)
            ? data.catalogPriceProductIds.filter(Boolean).map(String)
            : [];
          setCatalogPriceProductIds(ids);
          setVisibleCatalogPriceCount(Number(data.catalog_price_submission ?? ids.length) || 0);
        })
        .catch(() => undefined);
    };
    refreshCatalogPriceNotifications();
    const intervalId = window.setInterval(refreshCatalogPriceNotifications, 15000);
    window.addEventListener("focus", refreshCatalogPriceNotifications);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshCatalogPriceNotifications);
    };
  }, [canViewAlerts, canViewProducts, variant]);

  useEffect(() => {
    if (variant !== "admin") return;
    const onCatalogPriceViewed = (event: Event) => {
      const productId = (event as CustomEvent<string>).detail;
      if (!productId) return;
      setCatalogPriceProductIds((current) => current.filter((id) => id !== productId));
      setVisibleCatalogPriceCount((current) => Math.max(current - 1, 0));
    };
    window.addEventListener("admin-catalog-price-viewed", onCatalogPriceViewed);
    return () => window.removeEventListener("admin-catalog-price-viewed", onCatalogPriceViewed);
  }, [variant]);

  useEffect(() => {
    if (variant !== "admin") return;
    const onSupportRead = () => {
      setVisibleSupportCount((current) => Math.max(current - 1, 0));
    };
    window.addEventListener("admin-support-read", onSupportRead);
    return () => window.removeEventListener("admin-support-read", onSupportRead);
  }, [variant]);

  useEffect(() => {
    if (variant !== "admin") return;
    const readTimeout = window.setTimeout(() => {
      try {
        const viewedOrdersRaw = window.localStorage.getItem("admin-viewed-order-notifications");
        const viewedPaymentsRaw = window.localStorage.getItem("admin-viewed-payment-notifications");
        const viewedDesignsRaw = window.localStorage.getItem("admin-viewed-custom-design-notifications");
        const viewedShippingRaw = window.localStorage.getItem("admin-viewed-shipping-delivery-notifications");
        setViewedOrderIds(viewedOrdersRaw ? JSON.parse(viewedOrdersRaw) : []);
        setViewedPaymentIds(viewedPaymentsRaw ? JSON.parse(viewedPaymentsRaw) : []);
        setViewedCustomDesignIds(viewedDesignsRaw ? JSON.parse(viewedDesignsRaw) : []);
        setViewedShippingDeliveryIds(viewedShippingRaw ? JSON.parse(viewedShippingRaw) : []);
      } catch {
        setViewedOrderIds([]);
        setViewedPaymentIds([]);
        setViewedCustomDesignIds([]);
        setViewedShippingDeliveryIds([]);
      }
    }, 0);
    const onViewed = (event: Event) => {
      const orderId = (event as CustomEvent<string>).detail;
      if (!orderId) return;
      setViewedOrderIds((current) => {
        const next = Array.from(new Set([...current, orderId]));
        try { window.localStorage.setItem("admin-viewed-order-notifications", JSON.stringify(next)); } catch {}
        return next;
      });
    };
    const onPaymentViewed = (event: Event) => {
      const orderId = (event as CustomEvent<string>).detail;
      if (!orderId) return;
      setViewedPaymentIds((current) => {
        const next = Array.from(new Set([...current, orderId]));
        try { window.localStorage.setItem("admin-viewed-payment-notifications", JSON.stringify(next)); } catch {}
        return next;
      });
    };
    const onCustomViewed = (event: Event) => {
      const designId = (event as CustomEvent<string>).detail;
      if (!designId) return;
      setViewedCustomDesignIds((current) => {
        const next = Array.from(new Set([...current, designId]));
        try { window.localStorage.setItem("admin-viewed-custom-design-notifications", JSON.stringify(next)); } catch {}
        return next;
      });
    };
    const onShippingViewed = (event: Event) => {
      const orderId = (event as CustomEvent<string>).detail;
      if (!orderId) return;
      setViewedShippingDeliveryIds((current) => {
        const next = Array.from(new Set([...current, orderId]));
        try { window.localStorage.setItem("admin-viewed-shipping-delivery-notifications", JSON.stringify(next)); } catch {}
        return next;
      });
    };
    window.addEventListener("admin-order-viewed", onViewed);
    window.addEventListener("admin-payment-viewed", onPaymentViewed);
    window.addEventListener("admin-custom-design-viewed", onCustomViewed);
    window.addEventListener("admin-shipping-delivery-viewed", onShippingViewed);
    return () => {
      window.clearTimeout(readTimeout);
      window.removeEventListener("admin-order-viewed", onViewed);
      window.removeEventListener("admin-payment-viewed", onPaymentViewed);
      window.removeEventListener("admin-custom-design-viewed", onCustomViewed);
      window.removeEventListener("admin-shipping-delivery-viewed", onShippingViewed);
    };
  }, [variant]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setCollapsedGroups((current) => {
        const next = { ...current };
        for (const group of visibleGroups) {
          if (group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))) {
            next[group.label] = false;
          }
        }
        return next;
      });
    }, 0);
    return () => window.clearTimeout(id);
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
            <p className="text-xs font-medium text-sidebar-foreground/65">
              {session?.user?.role === "employee" ? "Employee Console" : "Admin Console"}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {isUnassignedEmployee ? (
          <section className="rounded-2xl border border-sidebar-border bg-sidebar-accent/30 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sidebar-foreground/70">Access Pending</p>
            <p className="mt-2 text-sm text-sidebar-foreground/80">No role assigned yet.</p>
          </section>
        ) : null}
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
              <div
                className={
                  variant === "admin" && (group.label === "Users" || group.label === "Reports")
                    ? "ml-3 space-y-1 border-l border-sidebar-border pl-3"
                    : "space-y-1"
                }
              >
                {group.items.map((item) => {
                  const Icon = icons[item.icon];
                  const badgeCount = badgeForHref(item.href);
                  const active = isNavItemActive(item);
                  const hasChildren = Boolean(item.children?.length);
                  const childrenOpen = expandedNavItems[item.href] ?? false;

                  return (
                    <div key={`${item.href}-${item.label}`}>
                      <div className="flex items-center gap-1">
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedNavItems((current) => ({
                                ...current,
                                [item.href]: !childrenOpen,
                              }))
                            }
                            className="flex h-9 w-7 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
                            aria-label={childrenOpen ? "Collapse" : "Expand"}
                          >
                            {childrenOpen ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                        ) : null}

                        <Link
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={
                            active
                              ? "flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-sidebar-primary px-3 py-2.5 text-[15px] font-bold text-sidebar-primary-foreground shadow-sm"
                              : "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-sidebar-foreground/88 transition hover:bg-sidebar-accent hover:text-white"
                          }
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {badgeCount > 0 ? (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-black text-white shadow-sm shadow-blue-950/30">
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          ) : null}
                        </Link>
                      </div>

                      {hasChildren && childrenOpen ? (
                        <ul className="mb-2 ml-4 mt-1 space-y-0.5 border-l border-sidebar-border/80 pl-2">
                          {item.children?.map((child) => {
                            const childActive = child.kind === "report" || child.kind === "category" ? isReportChildActive(child.href) : isChildActive(child.href);
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  onClick={() => setMobileOpen(false)}
                                  className={
                                    childActive
                                      ? "block rounded-xl bg-sidebar-primary px-3 py-2.5 text-[15px] font-bold text-sidebar-primary-foreground shadow-sm"
                                      : "block rounded-xl px-3 py-2.5 text-[15px] font-semibold text-sidebar-foreground/88 transition hover:bg-sidebar-accent hover:text-white"
                                  }
                                >
                                  {child.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-xl bg-sidebar-accent p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{shellRoleLabel}</p>
          <p className="mt-1 truncate text-sm font-medium">{refreshedName ?? session?.user?.name ?? session?.user?.email ?? "Signed in"}</p>
          <p className="mt-1 truncate text-xs font-semibold text-sidebar-foreground/60">{assignedRoleLabel}</p>
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
                {shellRoleLabel}
              </p>
              <h1 className={adminTopBar ? "truncate text-lg font-bold tracking-tight text-white sm:text-xl" : "truncate text-lg font-semibold"}>{shellTitle}</h1>
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

            {canViewAlerts ? <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((value) => !value)}
                className={
                  adminTopBar
                    ? "relative rounded-2xl border border-white/10 bg-sidebar-accent/80 p-2.5 shadow-inner shadow-black/20 transition hover:bg-sidebar-accent"
                    : "relative rounded-xl border border-border p-2.5"
                }
                aria-label={`${shellRoleLabel} notifications`}
              >
                <Bell className="h-4 w-4" />
                {totalNotifications > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-black text-white shadow-sm shadow-blue-950/30">
                    {totalNotifications > 99 ? "99+" : totalNotifications}
                  </span>
                ) : null}
              </button>
              {notificationsOpen ? (
                <div className="absolute right-0 top-full z-40 mt-2 w-96 rounded-2xl border border-sidebar-border bg-sidebar p-2 text-sidebar-foreground shadow-2xl">
                  <div className="px-3 py-2">
                    <p className="text-sm font-bold text-white">{shellRoleLabel} notifications</p>
                    <p className="text-xs text-sidebar-foreground/65">Items that need attention now.</p>
                  </div>
                  <div className="my-1 h-px bg-sidebar-border" />
                  {notificationItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setNotificationsOpen(false)}
                      className={item.value > 0 ? `mt-1 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition hover:bg-sidebar-accent ${item.active}` : "mt-1 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-sidebar-accent hover:text-white"}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.value > 0 ? item.accent : "bg-sidebar-accent text-sidebar-foreground/60"}`}>
                          <item.Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 truncate font-semibold">{item.label}</span>
                      </span>
                      <span className={item.value > 0 ? `rounded-full px-2 py-0.5 text-xs font-black ${item.badge}` : "text-xs text-sidebar-foreground/55"}>
                        {item.value}
                      </span>
                    </Link>
                  ))}
                  <Link
                    href="/admin/alerts"
                    onClick={() => setNotificationsOpen(false)}
                    className="mt-2 block rounded-xl border border-sidebar-border px-3 py-2 text-center text-xs font-bold text-sidebar-foreground/75 transition hover:bg-sidebar-accent hover:text-white"
                  >
                    View all notifications
                  </Link>
                </div>
              ) : null}
            </div> : null}

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
                {profileImage ? (
                  <img src={profileImage} alt={displayAccountName} className="h-9 w-9 rounded-full object-cover ring-2 ring-white/20" />
                ) : (
                  <span
                    className={
                      adminTopBar
                        ? "flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground"
                        : "flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold"
                    }
                  >
                    {initials}
                  </span>
                )}
                <span className={adminTopBar ? "hidden max-w-[120px] truncate text-sm font-medium text-white sm:block" : "hidden max-w-[120px] truncate text-sm sm:block"}>
                  {displayAccountName}
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
                    <p className="text-sm font-medium">{displayAccountName}</p>
                    <p className={adminTopBar ? "truncate text-xs text-sidebar-foreground/65" : "truncate text-xs text-muted-foreground"}>
                      {session?.user?.email}
                    </p>
                    <p className={adminTopBar ? "mt-1 text-[11px] font-bold uppercase tracking-wider text-sidebar-primary" : "mt-1 text-[11px] font-bold uppercase tracking-wider text-primary"}>
                      {assignedRoleLabel}
                    </p>
                  </div>
                  <div className={adminTopBar ? "my-1 h-px bg-sidebar-border" : "my-1 h-px bg-border"} />
                  <Link
                    href={profileHref}
                    onClick={() => setProfileOpen(false)}
                    className={
                      adminTopBar
                        ? "mb-1 block rounded-xl bg-emerald-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-900"
                        : "mb-1 block rounded-xl bg-emerald-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-900"
                    }
                  >
                    Profile settings
                  </Link>
                  <Link
                    href="/?staffPreview=1"
                    onClick={() => setProfileOpen(false)}
                    className={
                      adminTopBar
                        ? "mb-1 block rounded-xl bg-zinc-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-zinc-700"
                        : "mb-1 block rounded-xl bg-zinc-800 px-3 py-2 text-sm font-bold text-white transition hover:bg-zinc-700"
                    }
                  >
                    View as Customer
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.replace("/api/logout");
                    }}
                    className={
                      adminTopBar
                        ? "block w-full rounded-xl bg-red-800 px-3 py-2 text-left text-sm font-bold text-white transition hover:bg-red-900"
                        : "block w-full rounded-xl bg-red-800 px-3 py-2 text-left text-sm font-bold text-white transition hover:bg-red-900"
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
          {showPendingAccess ? (
            <div className="mx-auto w-full max-w-3xl">
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="border-b border-border p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Employee access</p>
                  <h1 className="mt-2 text-3xl font-semibold">Access denied</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Your employee account is active, but there are no active roles or permissions available for your account right now.
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Please contact your administrator to activate your assigned role or update your access permissions, then refresh this page.
                  </p>
                </div>
                <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
                  >
                    Refresh Access
                  </button>
                  <p className="text-xs text-muted-foreground">
                    If you believe this is a mistake, please contact the system administrator.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
