import { listPermissionKeysForUser, listPermissions, replaceUserPermissions, userHasAnyPermission } from "../repositories/permissions-repository.js";
import { getUserById } from "../repositories/users-repository.js";

export async function getEffectivePermissionsForUser(userId: string) {
  const user = await getUserById(userId);
  if (user?.role === "employee" && user.roleStatus === "unassigned") {
    return [];
  }
  return listPermissionKeysForUser(userId);
}

export async function hasPermission(userId: string, permissionKey: string) {
  return userHasAnyPermission(userId, [permissionKey]);
}

export async function hasAnyPermission(userId: string, permissionKeys: string[]) {
  return userHasAnyPermission(userId, permissionKeys);
}

export async function listPermissionsForAdmin() {
  return listPermissions();
}

export async function updateUserPermissionsForAdmin(userId: string, permissionKeys: string[]) {
  return replaceUserPermissions(userId, permissionKeys);
}
