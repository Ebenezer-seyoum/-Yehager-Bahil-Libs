import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { adminNavigation } from "@/lib/dashboard-navigation";
import { apiRequest } from "@/lib/api-client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";

type AdminProfilePayload = {
  name?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
};

async function getAdminNotificationCounts() {
  try {
    const response = await apiRequest<{
      data?: {
        payment: number;
        custom_request: number;
        custom_order: number;
        catalog_order: number;
        refund_issue: number;
        shipping_delivery: number;
        total: number;
        paymentIds?: string[];
        customRequestIds?: string[];
        customOrderIds?: string[];
        catalogOrderIds?: string[];
        refundIssueIds?: string[];
        shippingDeliveryIds?: string[];
      };
    }>("/api/v1/admin/summary-counts");
    const counts = response?.data;
    
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
      total: counts?.total ?? 0,
      // Keep other placeholders for now if needed by DashboardShell
      alerts: 0,
      support: 0,
    };
  } catch {
    return { orders: 0, orderIds: [], payments: 0, paymentIds: [], customDesigns: 0, customDesignIds: [], customOrders: 0, customOrderIds: [], refundIssues: 0, refundIssueIds: [], shippingDelivery: 0, shippingDeliveryIds: [], total: 0, alerts: 0, support: 0 };
  }
}

async function getAdminProfile() {
  try {
    const response = await apiRequest<{ data: AdminProfilePayload | null }>("/api/v1/users/me");
    return response.data ?? null;
  } catch {
    return null;
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const [notificationCounts, profile] = await Promise.all([
    session?.user?.role === "admin" ? getAdminNotificationCounts() : Promise.resolve({}),
    getAdminProfile(),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading admin…
        </div>
      }
    >
      <DashboardShell
        navigation={adminNavigation}
        title="Admin workspace"
        variant="admin"
        notificationCounts={notificationCounts}
        accountProfile={{
          displayName: profile?.displayName ?? profile?.name ?? null,
          avatarUrl: profile?.avatarUrl ?? null,
        }}
      >
        {children}
      </DashboardShell>
    </Suspense>
  );
}
