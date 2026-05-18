import { HTTPException } from "hono/http-exception";
import { db } from "../lib/db/drizzle.js";
import { auditLogs } from "../lib/db/schema.js";
import { hashPassword, verifyPassword } from "../lib/auth/password.js";
import { isUserRole, type UserRole } from "../lib/auth/roles.js";
import {
  createUser,
  getUserByEmail,
  getUserById,
  listUsers,
  deleteUserById,
  updateLastLoginAt,
  updateUserPasswordForAdmin,
  updateUserProfileForAdmin,
  updateUserRole,
  updateUserStatus,
  updateOwnPassword,
  upsertUserFromAuth,
} from "../repositories/users-repository.js";
import { getEffectivePermissionsForUser } from "./permissions-service.js";
import { ensureSystemRoleAssignment, replaceUserSystemRole } from "./roles-service.js";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toPublicUser<T extends { passwordHash?: string | null }>(user: T | undefined | null) {
  if (!user) return user ?? null;
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function syncCurrentUserFromAuth(payload: {
  sub: string;
  email?: string;
  role?: UserRole;
  name?: string;
}) {
  if (!payload.email) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  const user = await upsertUserFromAuth({
    externalId: payload.sub,
    email: normalizeEmail(payload.email),
    role: payload.role ?? "customer",
    name: payload.name,
  });
  await ensureSystemRoleAssignment(user.id, user.role);

  return toPublicUser(user);
}

export async function getCurrentUserByEmail(email?: string) {
  if (!email) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const user = await getUserByEmail(normalizeEmail(email));
  if (!user) return null;
  return {
    ...toPublicUser(user),
    permissions: await getEffectivePermissionsForUser(user.id),
  };
}

export async function updateCurrentUserProfile(payload: { email: string; name: string }) {
  const user = await getUserByEmail(normalizeEmail(payload.email));
  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const updated = await updateUserProfileForAdmin({
    userId: user.id,
    name: payload.name.trim(),
    email: user.email,
  });
  return toPublicUser(updated);
}

export async function changeCurrentUserPassword(payload: {
  email: string;
  currentPassword: string;
  newPassword: string;
}) {
  const user = await getUserByEmail(normalizeEmail(payload.email));
  if (!user?.passwordHash) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const matches = await verifyPassword(payload.currentPassword, user.passwordHash);
  if (!matches) {
    throw new HTTPException(401, { message: "Current password is incorrect" });
  }

  const updated = await updateOwnPassword({
    userId: user.id,
    passwordHash: await hashPassword(payload.newPassword),
  });
  return toPublicUser(updated);
}

export async function registerCustomer(payload: { email: string; name?: string; password: string }) {
  const email = normalizeEmail(payload.email);
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }

  const user = await createUser({
    email,
    name: payload.name?.trim() || email.split("@")[0],
    passwordHash: await hashPassword(payload.password),
    role: "customer",
  });

  if (!user) {
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }
  await ensureSystemRoleAssignment(user.id, user.role);

  return toPublicUser(user);
}

export async function authenticateUser(payload: { email: string; password: string }) {
  const user = await getUserByEmail(normalizeEmail(payload.email));
  if (!user?.passwordHash) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }
  if (user.status !== "active") {
    throw new HTTPException(403, { message: "Account is not active" });
  }

  const matches = await verifyPassword(payload.password, user.passwordHash);
  if (!matches) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  await ensureSystemRoleAssignment(user.id, user.role);
  await updateLastLoginAt(user.id);

  return {
    ...toPublicUser(user),
    permissions: await getEffectivePermissionsForUser(user.id),
  };
}

export async function listUsersForAdmin(limit = 200) {
  return listUsers(limit);
}

export async function createEmployeeForAdmin(payload: {
  email: string;
  name: string;
  password: string;
  performedBy?: string;
}) {
  const email = normalizeEmail(payload.email);
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }

  const user = await createUser({
    email,
    name: payload.name.trim(),
    passwordHash: await hashPassword(payload.password),
    role: "employee",
  });

  if (!user) {
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }
  await ensureSystemRoleAssignment(user.id, user.role);

  await db.insert(auditLogs).values({
    action: "employee_account_created",
    category: "admin",
    severity: "info",
    entityType: "user",
    entityId: user.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin created employee account",
    metadata: {
      email: user.email,
      role: user.role,
    },
  });

  return toPublicUser(user);
}

export async function updateRoleForAdmin(payload: {
  userId: string;
  role: UserRole;
  performedBy?: string;
}) {
  if (!isUserRole(payload.role)) {
    throw new HTTPException(400, { message: "Invalid role" });
  }

  const existing = await getUserById(payload.userId);
  if (!existing) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const updated = await updateUserRole({
    userId: payload.userId,
    role: payload.role,
  });

  if (!updated) {
    throw new HTTPException(404, { message: "User not found" });
  }
  await replaceUserSystemRole(updated.id, updated.role);

  await db.insert(auditLogs).values({
    action: "user_role_updated",
    category: "admin",
    severity: "info",
    entityType: "user",
    entityId: updated.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin updated user role",
    metadata: {
      previous_role: existing.role,
      current_role: updated.role,
      email: updated.email,
    },
  });

  return toPublicUser(updated);
}

export async function updateUserProfileForAdminService(payload: {
  userId: string;
  name: string;
  email: string;
  performedBy?: string;
}) {
  const existing = await getUserById(payload.userId);
  if (!existing) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const email = normalizeEmail(payload.email);
  const emailOwner = await getUserByEmail(email);
  if (emailOwner && emailOwner.id !== payload.userId) {
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }

  const updated = await updateUserProfileForAdmin({
    userId: payload.userId,
    name: payload.name.trim(),
    email,
  });
  if (!updated) {
    throw new HTTPException(404, { message: "User not found" });
  }

  await db.insert(auditLogs).values({
    action: "user_profile_updated",
    category: "admin",
    severity: "info",
    entityType: "user",
    entityId: updated.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin updated user profile",
    metadata: { previous_email: existing.email, current_email: updated.email },
  });

  return toPublicUser(updated);
}

export async function updateUserStatusForAdmin(payload: {
  userId: string;
  status: "active" | "inactive" | "suspended";
  performedBy?: string;
}) {
  const existing = await getUserById(payload.userId);
  if (!existing) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const updated = await updateUserStatus({
    userId: payload.userId,
    status: payload.status,
  });
  if (!updated) {
    throw new HTTPException(404, { message: "User not found" });
  }

  await db.insert(auditLogs).values({
    action: "user_status_updated",
    category: "admin",
    severity: "info",
    entityType: "user",
    entityId: updated.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin updated user status",
    metadata: { previous_status: existing.status, current_status: updated.status },
  });

  return toPublicUser(updated);
}

export async function resetUserPasswordForAdmin(payload: {
  userId: string;
  password: string;
  performedBy?: string;
}) {
  const existing = await getUserById(payload.userId);
  if (!existing) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const updated = await updateUserPasswordForAdmin({
    userId: payload.userId,
    passwordHash: await hashPassword(payload.password),
  });
  if (!updated) {
    throw new HTTPException(404, { message: "User not found" });
  }

  await db.insert(auditLogs).values({
    action: "user_password_reset",
    category: "admin",
    severity: "warning",
    entityType: "user",
    entityId: updated.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin reset user password",
    metadata: { email: updated.email },
  });

  return toPublicUser(updated);
}

export async function deleteUserForAdmin(payload: { userId: string; performedBy?: string }) {
  const existing = await getUserById(payload.userId);
  if (!existing) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const deleted = await deleteUserById(payload.userId);
  if (!deleted) {
    throw new HTTPException(404, { message: "User not found" });
  }

  await db.insert(auditLogs).values({
    action: "user_deleted",
    category: "admin",
    severity: "warning",
    entityType: "user",
    entityId: deleted.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin deleted user",
    metadata: { email: deleted.email, role: deleted.role },
  });

  return toPublicUser(deleted);
}
