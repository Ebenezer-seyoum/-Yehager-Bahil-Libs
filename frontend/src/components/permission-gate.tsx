"use client";

import { useSession } from "next-auth/react";
import { can, canAny } from "@/lib/permissions";

export function PermissionGate({
  permission,
  anyOf,
  children,
}: {
  permission?: string;
  anyOf?: string[];
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const allowed = permission ? can(permissions, permission) : anyOf ? canAny(permissions, anyOf) : false;

  return allowed ? <>{children}</> : null;
}
