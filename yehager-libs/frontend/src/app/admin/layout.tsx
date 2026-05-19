import { DashboardShell } from "@/components/dashboard-shell";
import { adminNavigation } from "@/lib/dashboard-navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      navigation={adminNavigation}
      title="Admin workspace"
      variant="admin"
    >
      {children}
    </DashboardShell>
  );
}
