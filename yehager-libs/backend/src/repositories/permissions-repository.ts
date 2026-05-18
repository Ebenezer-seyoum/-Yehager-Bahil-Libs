import { and, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { permissions, rolePermissions, userRoles } from "../lib/db/schema.js";

export async function listPermissionKeysForUser(userId: string) {
  const rows = await db
    .select({ key: permissions.key })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(userRoles.userId, userId));

  return [...new Set(rows.map((row) => row.key))].sort();
}

export async function userHasAnyPermission(userId: string, permissionKeys: string[]) {
  if (permissionKeys.length === 0) return false;

  const rows = await db
    .select({ key: permissions.key })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(and(eq(userRoles.userId, userId), inArray(permissions.key, permissionKeys)))
    .limit(1);

  return rows.length > 0;
}

export async function listPermissions() {
  return db.query.permissions.findMany({
    orderBy: (table, { asc }) => [asc(table.resource), asc(table.action)],
  });
}
