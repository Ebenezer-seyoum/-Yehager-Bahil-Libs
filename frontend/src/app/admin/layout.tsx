import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { adminNavigation } from "@/lib/dashboard-navigation";
import { apiRequest } from "@/lib/api-client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";

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
    const response = await apiRequest<{ data?: { payment: number; custom_order: number; catalog_order: number; total: number } }>("/api/v1/admin/summary-counts");
    const counts = response?.data;
    
    return {
      orders: counts?.catalog_order ?? 0,
      payments: counts?.payment ?? 0,
      customDesigns: counts?.custom_order ?? 0,
      total: counts?.total ?? 0,
      // Keep other placeholders for now if needed by DashboardShell
      alerts: 0,
      support: 0,
    };
  } catch {
    return { orders: 0, payments: 0, customDesigns: 0, total: 0, alerts: 0, support: 0 };
  }
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const notificationCounts = session?.user?.role === "admin" ? await getAdminNotificationCounts() : {};

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
