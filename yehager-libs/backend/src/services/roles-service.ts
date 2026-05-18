import type { UserRole } from "../lib/auth/roles.js";
import {
  assignSystemRoleToUser,
  listRolesWithPermissionKeys,
  replaceRolePermissions,
  replaceSystemRoleForUser,
} from "../repositories/roles-repository.js";

export async function ensureSystemRoleAssignment(userId: string, role: UserRole) {
  await assignSystemRoleToUser(userId, role);
}

export async function replaceUserSystemRole(userId: string, role: UserRole) {
  await replaceSystemRoleForUser(userId, role);
}

export async function listRolesForAdmin() {
  return listRolesWithPermissionKeys();
}

export async function updateRolePermissionsForAdmin(roleId: string, permissionKeys: string[]) {
  return replaceRolePermissions(roleId, permissionKeys);
}
