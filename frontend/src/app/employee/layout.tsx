import { DashboardShell } from "@/components/dashboard-shell";
import { employeeNavigation } from "@/lib/dashboard-navigation";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      navigation={employeeNavigation}
      title="Operations workspace"
      subtitle="Focused tools for daily product and order work."
      variant="employee"
    >
      {children}
    </DashboardShell>
  );
}
