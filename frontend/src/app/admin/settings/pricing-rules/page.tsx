import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { can } from "@/lib/permissions";
import { AccessRestricted } from "@/components/admin/access-restricted";
import { AdminSettingsChrome } from "@/components/admin/pages/admin-settings-chrome";
import { GlobalPricingRulesClient } from "@/components/admin/global-pricing-rules-client";

export default async function PricingRulesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/settings/pricing-rules");
  if (session.user.role !== "admin" && session.user.role !== "employee") redirect("/");
  if (!can(session.user.permissions, "settings.view")) {
    return <AccessRestricted requiredPermission="settings.view" sectionName="Global Pricing Rules" />;
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading pricing rules…</div>}>
      <AdminSettingsChrome>
        <GlobalPricingRulesClient
          canEdit={session.user.role === "admin" || can(session.user.permissions, "settings.edit")}
        />
      </AdminSettingsChrome>
    </Suspense>
  );
}
