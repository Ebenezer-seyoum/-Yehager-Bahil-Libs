"use client";

import { useEffect, useState } from "react";
import { Plus, Search as SearchIcon } from "lucide-react";
import { ReferenceRolePermissionPanel } from "@/components/reference-role-permission-panel";
import { AdminWorkspace } from "@/components/admin/admin-workspace";
import type { AdminWorkspaceData } from "@/lib/admin/types";

export const ADMIN_ROLE_CREATE_EVENT = "admin-roles:create-role";

export function AdminRolesWorkspace({
  data,
  users,
  roles,
  permissions,
  audit,
}: {
  data: AdminWorkspaceData;
  users: Omit<Parameters<typeof ReferenceRolePermissionPanel>[0], "activeTab">["users"];
  roles: Omit<Parameters<typeof ReferenceRolePermissionPanel>[0], "activeTab">["roles"];
  permissions: Omit<Parameters<typeof ReferenceRolePermissionPanel>[0], "activeTab">["permissions"];
  audit: Omit<Parameters<typeof ReferenceRolePermissionPanel>[0], "activeTab">["audit"];
}) {
  function SearchResultBadge({ query, activeTab }: { query: string; activeTab: string }) {
    const [finished, setFinished] = useState(false);
    const [count, setCount] = useState<number | null>(null);

    useEffect(() => {
      setFinished(false);
      if (!query || !query.trim()) {
        setCount(null);
        const t = setTimeout(() => setFinished(false), 300);
        return () => clearTimeout(t);
      }

      const handler = setTimeout(() => {
        const q = query.trim().toLowerCase();
        const source =
          activeTab === "admins"
            ? users
            : activeTab === "permissions"
              ? permissions
              : activeTab === "security"
                ? audit
                : roles;
        const matches = source.filter((item) =>
          Object.values(item as Record<string, unknown>)
            .map((value) => String(value ?? "").toLowerCase())
            .join(" ")
            .includes(q),
        ).length;
        setCount(matches);
        setFinished(true);
      }, 400);

      return () => clearTimeout(handler);
    }, [activeTab, query]);

    if (!finished || count == null || !query.trim()) return null;
    return (
      <div className="inline-flex items-center gap-2 text-sm text-slate-700" aria-live="polite">
        <SearchIcon className="h-4 w-4 text-primary" />
        <span className="font-medium">{count.toLocaleString()}</span>
        <span className="text-sm text-muted-foreground">results</span>
      </div>
    );
  }

  return (
    <AdminWorkspace
      pageId="roles"
      initialData={data}
      hideKpis
      filterPlaceholder="Search roles, permissions, employees, or security logs..."
      filterActions={({ activeTab, search }) => (
        <div className="flex items-center gap-3 w-full">
          <SearchResultBadge query={search} activeTab={activeTab} />
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(ADMIN_ROLE_CREATE_EVENT))}
              className="btn btn-add"
              aria-label="Add Role"
            >
              <Plus className="h-4 w-4" />
              Add Role
            </button>
          </div>
        </div>
      )}
    >
      {({ activeTab, search }) => (
        <ReferenceRolePermissionPanel
          users={users}
          roles={roles}
          permissions={permissions}
          audit={audit}
          activeTab={activeTab}
          search={search}
        />
      )}
    </AdminWorkspace>
  );
}
