import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";
import { apiRequest } from "@/lib/api-client";
import { can } from "@/lib/permissions";
import { findCoverageRequirement } from "@/lib/admin/permission-coverage";
import { PermissionCoverageDetailClient } from "@/components/admin/pages/permission-coverage-detail-client";
import { AccessRestricted } from "@/components/admin/access-restricted";

type Permission = {
  id: string;
  key: string;
  resource: string;
  action: string;
  description: string | null;
};

type Role = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
};

type PageProps = {
  params: Promise<{ coverageId: string }>;
};

export default async function PermissionCoverageDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/signin?callbackUrl=/admin/roles");
  if (!can(session.user.permissions, "roles.view")) {
    return <AccessRestricted requiredPermission="roles.view" sectionName="Role and permission" />;
  }

  const { coverageId } = await params;
  const requirement = findCoverageRequirement(coverageId);
  if (!requirement) redirect("/admin/roles");

  let permissions: Permission[] = [];
  let roles: Role[] = [];
  try {
    const [permissionsResponse, rolesResponse] = await Promise.all([
      apiRequest<{ data: Permission[] }>("/api/v1/admin/permissions"),
      apiRequest<{ data: Role[] }>("/api/v1/admin/roles"),
    ]);
    permissions = permissionsResponse.data ?? [];
    roles = rolesResponse.data ?? [];
  } catch {
    permissions = [];
    roles = [];
  }

  const permission = permissions.find((item) => item.key === requirement.permissionKey);

  return (
    <PermissionCoverageDetailClient
      row={{
        ...requirement,
        permission,
        status: permission ? "available" : "missing",
      }}
      roleItems={roles}
    />
  );
}
