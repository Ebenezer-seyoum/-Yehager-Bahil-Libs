import { DashboardShell } from "@/components/dashboard-shell";
import { adminNavigation } from "@/lib/dashboard-navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      navigation={adminNavigation}
      title="Admin workspace"
      subtitle="Executive overview, staff control, operational visibility, and system governance."
      variant="admin"
    >
      {children}
    </DashboardShell>
  );
}
