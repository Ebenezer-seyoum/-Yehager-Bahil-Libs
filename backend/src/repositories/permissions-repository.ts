import { and, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { permissions, rolePermissions, userPermissions, userRoles } from "../lib/db/schema.js";

export async function listPermissionKeysForUser(userId: string) {
  const roleRows = await db
    .select({ key: permissions.key })
    .from(userRoles)
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, userRoles.roleId))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(userRoles.userId, userId));
  const directRows = await db
    .select({ key: permissions.key })
    .from(userPermissions)
    .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
    .where(eq(userPermissions.userId, userId));

  return [...new Set([...roleRows, ...directRows].map((row) => row.key))].sort();
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

  if (rows.length > 0) return true;

  const directRows = await db
    .select({ key: permissions.key })
    .from(userPermissions)
    .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
    .where(and(eq(userPermissions.userId, userId), inArray(permissions.key, permissionKeys)))
    .limit(1);

  return directRows.length > 0;
}

export async function listPermissions() {
  return db.query.permissions.findMany({
    orderBy: (table, { asc }) => [asc(table.resource), asc(table.action)],
  });
}

export async function updatePermission(permissionId: string, payload: { key: string; resource: string; action: string; description?: string | null }) {
  const [updated] = await db
    .update(permissions)
    .set({
      key: payload.key,
      resource: payload.resource,
      action: payload.action,
      description: payload.description ?? null,
    })
    .where(eq(permissions.id, permissionId))
    .returning();
  return updated ?? null;
}

export async function deletePermission(permissionId: string) {
  const [deleted] = await db.delete(permissions).where(eq(permissions.id, permissionId)).returning();
  return deleted ?? null;
}

export async function replaceUserPermissions(userId: string, permissionKeys: string[]) {
  const permissionRows =
    permissionKeys.length === 0
      ? []
      : await db.query.permissions.findMany({
          where: inArray(permissions.key, permissionKeys),
        });

  await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
  if (permissionRows.length > 0) {
    await db.insert(userPermissions).values(
      permissionRows.map((permission) => ({
        userId,
        permissionId: permission.id,
      })),
    );
  }

  return permissionRows.map((permission) => permission.key).sort();
}
