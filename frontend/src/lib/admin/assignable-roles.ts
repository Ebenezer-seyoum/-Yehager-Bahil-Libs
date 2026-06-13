type RoleLike = {
  key?: string | null;
  name?: string | null;
  isSystem?: boolean | null;
};

const BLOCKED_ASSIGNABLE_ROLE_KEYS = new Set(["admin", "employee", "customer"]);

function normalizeRoleKey(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isAssignableEmployeeRole(role: RoleLike) {
  const key = normalizeRoleKey(role.key ?? role.name);
  return role.isSystem !== true && !BLOCKED_ASSIGNABLE_ROLE_KEYS.has(key);
}

export function filterAssignableEmployeeRoles<T extends RoleLike>(roles: T[]) {
  return roles.filter(isAssignableEmployeeRole);
}
