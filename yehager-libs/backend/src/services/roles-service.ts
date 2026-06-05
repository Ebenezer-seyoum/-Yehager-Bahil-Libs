import type { UserRole } from "../lib/auth/roles.js";
import {
  assignSystemRoleToUser,
  assignRoleToUser,
  createRole,
  deleteRole,
  listRolesWithPermissionKeys,
  replaceNonSystemRolesForUser,
  replaceRolePermissions,
  replaceSystemRoleForUser,
  updateRole,
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

export async function createRoleForAdmin(payload: { key: string; name: string; description?: string | null }) {
  return createRole(payload);
}

export async function updateRoleForAdmin(roleId: string, payload: { name: string; description?: string | null }) {
  return updateRole(roleId, payload);
}

export async function deleteRoleForAdmin(roleId: string) {
  return deleteRole(roleId);
}

export async function assignAdditionalRoleToUser(userId: string, roleId: string) {
  await assignRoleToUser(userId, roleId);
}

export async function updateRolePermissionsForAdmin(roleId: string, permissionKeys: string[]) {
  return replaceRolePermissions(roleId, permissionKeys);
}

export async function replaceUserAdditionalRolesForAdmin(userId: string, roleIds: string[]) {
  await replaceNonSystemRolesForUser(userId, roleIds);
}
