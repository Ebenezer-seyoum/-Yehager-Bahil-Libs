import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { adminNavigation } from "@/lib/dashboard-navigation";
import { apiRequest } from "@/lib/api-client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";

type DashboardProfilePayload = {
  name?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  assignedRoleName?: string | null;
  assignedRoleActive?: boolean | null;
  roleStatus?: "unassigned" | "assigned" | null;
  permissions?: string[] | null;
  profile?: {
    firstName?: string | null;
    fatherName?: string | null;
  } | null;
};

type SummaryCounts = {
  orders: number;
  customOrders: number;
  payments: number;
  customDesigns: number;
  refundIssues: number;
  shippingDelivery: number;
  catalogPrices: number;
  support?: number;
  alerts?: number;
  total: number;
  paymentIds?: string[];
  customDesignIds?: string[];
  customOrderIds?: string[];
  orderIds?: string[];
  refundIssueIds?: string[];
  shippingDeliveryIds?: string[];
  catalogPriceProductIds?: string[];
};

async function getDashboardNotificationCounts(
  canUseNotifications: boolean,
  canViewSupport: boolean,
) {
  const [summaryResponse, supportResponse] = await Promise.all([
    canUseNotifications
      ? apiRequest<{ data?: SummaryCounts }>("/api/v1/notifications/summary").catch(() => null)
      : Promise.resolve(null),
    canViewSupport
      ? apiRequest<{ count?: number }>("/api/v1/admin/support/unread-count").catch(() => null)
      : Promise.resolve(null),
  ]);
  const counts = summaryResponse?.data;

  return {
    orders: counts?.orders ?? 0,
    orderIds: counts?.orderIds ?? [],
    payments: counts?.payments ?? 0,
    paymentIds: counts?.paymentIds ?? [],
    customDesigns: counts?.customDesigns ?? 0,
    customDesignIds: counts?.customDesignIds ?? [],
    customOrders: counts?.customOrders ?? 0,
    customOrderIds: counts?.customOrderIds ?? [],
    refundIssues: counts?.refundIssues ?? 0,
    refundIssueIds: counts?.refundIssueIds ?? [],
    shippingDelivery: counts?.shippingDelivery ?? 0,
    shippingDeliveryIds: counts?.shippingDeliveryIds ?? [],
    catalogPrices: counts?.catalogPrices ?? 0,
    catalogPriceProductIds: counts?.catalogPriceProductIds ?? [],
    total: counts?.total ?? 0,
    alerts: counts?.alerts ?? 0,
    support: Math.max(counts?.support ?? 0, supportResponse?.count ?? 0),
  };
}

async function getDashboardProfile() {
  try {
    const response = await apiRequest<{ data: DashboardProfilePayload | null }>(
      "/api/v1/users/me",
    );
    return response.data ?? null;
  } catch {
    return null;
  }
}

function dashboardDisplayName(profile: DashboardProfilePayload | null) {
  const employeeName = [profile?.profile?.firstName, profile?.profile?.fatherName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return employeeName || profile?.displayName || profile?.name || null;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const profile = await getDashboardProfile();
  const permissions = profile?.permissions ?? session?.user?.permissions ?? [];
  const isAdmin = session?.user?.role === "admin";
  const isEmployee = session?.user?.role === "employee";
  const notificationCounts = await getDashboardNotificationCounts(
    isAdmin || permissions.length > 0,
    isAdmin || permissions.includes("support.view"),
  );

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading dashboard…
        </div>
      }
    >
      <DashboardShell
        navigation={adminNavigation}
        title={isEmployee ? "Employee workspace" : "Admin workspace"}
        variant="admin"
        notificationCounts={notificationCounts}
        accountProfile={{
          displayName: dashboardDisplayName(profile),
          avatarUrl: profile?.avatarUrl ?? null,
          assignedRoleName: profile?.assignedRoleName ?? null,
          assignedRoleActive: profile?.assignedRoleActive ?? null,
          roleStatus: profile?.roleStatus ?? null,
          permissions: profile?.permissions ?? null,
        }}
      >
        {children}
      </DashboardShell>
    </Suspense>
  );
}
