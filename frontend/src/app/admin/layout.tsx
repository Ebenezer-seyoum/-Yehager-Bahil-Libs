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
  payment: number;
  custom_request: number;
  custom_order: number;
  catalog_order: number;
  refund_issue: number;
  shipping_delivery: number;
  catalog_price_submission: number;
  total: number;
  paymentIds?: string[];
  customRequestIds?: string[];
  customOrderIds?: string[];
  catalogOrderIds?: string[];
  refundIssueIds?: string[];
  shippingDeliveryIds?: string[];
  catalogPriceProductIds?: string[];
};

async function getDashboardNotificationCounts(
  canViewAlerts: boolean,
  canViewSupport: boolean,
) {
  const [summaryResponse, supportResponse] = await Promise.all([
    canViewAlerts
      ? apiRequest<{ data?: SummaryCounts }>("/api/v1/admin/summary-counts").catch(() => null)
      : Promise.resolve(null),
    canViewSupport
      ? apiRequest<{ count?: number }>("/api/v1/admin/support/unread-count").catch(() => null)
      : Promise.resolve(null),
  ]);
  const counts = summaryResponse?.data;

  return {
    orders: counts?.catalog_order ?? 0,
    orderIds: counts?.catalogOrderIds ?? [],
    payments: counts?.payment ?? 0,
    paymentIds: counts?.paymentIds ?? [],
    customDesigns: counts?.custom_request ?? counts?.custom_order ?? 0,
    customDesignIds: counts?.customRequestIds ?? [],
    customOrders: counts?.custom_order ?? 0,
    customOrderIds: counts?.customOrderIds ?? [],
    refundIssues: counts?.refund_issue ?? 0,
    refundIssueIds: counts?.refundIssueIds ?? [],
    shippingDelivery: counts?.shipping_delivery ?? 0,
    shippingDeliveryIds: counts?.shippingDeliveryIds ?? [],
    catalogPrices: counts?.catalog_price_submission ?? 0,
    catalogPriceProductIds: counts?.catalogPriceProductIds ?? [],
    total: counts?.total ?? 0,
    alerts: 0,
    support: supportResponse?.count ?? 0,
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
    isAdmin || permissions.includes("alerts.view"),
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
