import { deletePermission, listPermissionKeysForUser, listPermissions, replaceUserPermissions, updatePermission } from "../repositories/permissions-repository.js";
import { getUserById } from "../repositories/users-repository.js";
import { roles } from "../lib/db/schema.js";
import { db } from "../lib/db/drizzle.js";
import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

export async function getEffectivePermissionsForUser(userId: string) {
  const user = await getUserById(userId);
  if (user?.role === "employee" && user.roleStatus === "unassigned") {
    return [];
  }
  if (user?.role === "employee" && user.assignedRoleId) {
    const assignedRole = await db.query.roles.findFirst({ where: eq(roles.id, user.assignedRoleId) });
    if (assignedRole?.color === "inactive") return [];
  }
  return listPermissionKeysForUser(userId);
}

export async function hasPermission(userId: string, permissionKey: string) {
  const permissions = await getEffectivePermissionsForUser(userId);
  return permissions.includes(permissionKey);
}

export async function hasAnyPermission(userId: string, permissionKeys: string[]) {
  const permissions = await getEffectivePermissionsForUser(userId);
  return permissionKeys.some((permissionKey) => permissions.includes(permissionKey));
}

export async function listPermissionsForAdmin() {
  return listPermissions();
}

export async function updatePermissionForAdmin(permissionId: string, payload: { key: string; resource: string; action: string; description?: string | null }) {
  return updatePermission(permissionId, payload);
}

export async function deletePermissionForAdmin(permissionId: string) {
  return deletePermission(permissionId);
}

export async function updateUserPermissionsForAdmin(userId: string, permissionKeys: string[]) {
  const user = await getUserById(userId);
  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }
  if (user.role !== "employee") {
    throw new HTTPException(400, { message: "Permissions can only be assigned to employee accounts" });
  }
  return replaceUserPermissions(userId, permissionKeys);
}
