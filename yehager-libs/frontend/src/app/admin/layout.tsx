import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { adminNavigation } from "@/lib/dashboard-navigation";
import { apiRequest } from "@/lib/api-client";

type Order = {
  id?: string | null;
  orderType?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
};

type Alert = {
  isResolved?: boolean | null;
};

async function getAdminNotificationCounts() {
  try {
    const [ordersResponse, alertsResponse, supportResponse, customDesignsResponse] = await Promise.all([
      apiRequest<{ data?: Order[] }>("/api/v1/orders?limit=200"),
      apiRequest<{ data?: Alert[] }>("/api/v1/admin/alerts?limit=200"),
      apiRequest<{ count?: number }>("/api/v1/admin/support/unread-count").catch(() => ({ count: 0 })),
      apiRequest<{ unreadCount?: number }>("/api/v1/uploaded-designs/admin?limit=1").catch(() => ({ unreadCount: 0 })),
    ]);
    const orders = Array.isArray(ordersResponse?.data) ? ordersResponse.data : [];
    const alerts = Array.isArray(alertsResponse?.data) ? alertsResponse.data : [];

    const orderNotifications = orders.filter((order) => ["pending", "processing"].includes(order.status ?? "pending"));
    const groupOrderNotifications = orderNotifications.filter((order) => order.orderType === "group_order");
    return {
      orders: orderNotifications.length,
      orderIds: orderNotifications.map((order) => order.id).filter(Boolean),
      groupOrders: groupOrderNotifications.length,
      payments: orders.filter((order) => order.paymentStatus === "awaiting_verification").length,
      alerts: alerts.filter((alert) => !alert.isResolved).length,
      support: supportResponse?.count ?? 0,
      customDesigns: customDesignsResponse?.unreadCount ?? 0,
    };
  } catch {
    return { orders: 0, orderIds: [], groupOrders: 0, payments: 0, alerts: 0, support: 0, customDesigns: 0 };
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const notificationCounts = await getAdminNotificationCounts();

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
      >
        {children}
      </DashboardShell>
    </Suspense>
  );
}
