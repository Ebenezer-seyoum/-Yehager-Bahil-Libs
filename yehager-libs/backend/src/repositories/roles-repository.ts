import { and, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { permissions, rolePermissions, roles, userRoles } from "../lib/db/schema.js";
import type { UserRole } from "../lib/auth/roles.js";

export async function findRoleByKey(key: string) {
  return db.query.roles.findFirst({
    where: eq(roles.key, key),
  });
}

export async function createRole(payload: { key: string; name: string; description?: string | null }) {
  const [created] = await db
    .insert(roles)
    .values({
      key: payload.key,
      name: payload.name,
      description: payload.description ?? null,
      isSystem: false,
    })
    .returning();
  return created;
}

export async function assignRoleToUser(userId: string, roleId: string) {
  await db
    .insert(userRoles)
    .values({ userId, roleId })
    .onConflictDoNothing();
}

export async function assignSystemRoleToUser(userId: string, role: UserRole) {
  const systemRole = await findRoleByKey(role);
  if (!systemRole) return;

  await db
    .insert(userRoles)
    .values({
      userId,
      roleId: systemRole.id,
    })
    .onConflictDoNothing();
}

export async function replaceSystemRoleForUser(userId: string, role: UserRole) {
  const systemRole = await findRoleByKey(role);
  if (!systemRole) return;

  const systemRoles = await db.query.roles.findMany({
    where: eq(roles.isSystem, true),
  });

  for (const currentRole of systemRoles) {
    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, currentRole.id)));
  }

  await db
    .insert(userRoles)
    .values({
      userId,
      roleId: systemRole.id,
    })
    .onConflictDoNothing();
}

export async function replaceNonSystemRolesForUser(userId: string, roleIds: string[]) {
  const systemRoles = await db.query.roles.findMany({
    where: eq(roles.isSystem, true),
  });
  const systemRoleIds = new Set(systemRoles.map((role) => role.id));

  const existing = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, userId),
  });

  for (const row of existing) {
    if (!systemRoleIds.has(row.roleId)) {
      await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, row.roleId)));
    }
  }

  for (const roleId of roleIds) {
    if (systemRoleIds.has(roleId)) continue;
    await db.insert(userRoles).values({ userId, roleId }).onConflictDoNothing();
  }
}

export async function listRolesWithPermissionKeys() {
  const roleRows = await db.query.roles.findMany({
    orderBy: (table, { asc }) => [asc(table.name)],
  });

  const permissionRows = await db
    .select({
      roleId: rolePermissions.roleId,
      key: permissions.key,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId));

  return roleRows.map((role) => ({
    ...role,
    permissions: permissionRows.filter((row) => row.roleId === role.id).map((row) => row.key).sort(),
  }));
}

export async function replaceRolePermissions(roleId: string, permissionKeys: string[]) {
  const existingRole = await db.query.roles.findFirst({
    where: eq(roles.id, roleId),
  });
  if (!existingRole) return null;

  const permissionRows =
    permissionKeys.length === 0
      ? []
      : await db.query.permissions.findMany({
          where: inArray(permissions.key, permissionKeys),
        });

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

  if (permissionRows.length > 0) {
    await db.insert(rolePermissions).values(
      permissionRows.map((permission) => ({
        roleId,
        permissionId: permission.id,
      })),
    );
  }

  return {
    ...existingRole,
    permissions: permissionRows.map((permission) => permission.key).sort(),
  };
}
