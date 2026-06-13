import { HTTPException } from "hono/http-exception";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { auditLogs, employeeProfiles, orders, roles } from "../lib/db/schema.js";
import { hashPassword, verifyPassword } from "../lib/auth/password.js";
import { isUserRole, type UserRole } from "../lib/auth/roles.js";
import crypto from "node:crypto";
import {
  createUser,
  getUserByEmail,
  getUserById,
  listUsers,
  deleteUserById,
  updateLastLoginAt,
  updateUserPasswordForAdmin,
  updateUserProfileForAdmin,
  updateEmployeeCoreForAdmin,
  updateUserRole,
  updateUserStatus,
  updateEmployeeAccess,
  updateOwnPassword,
  upsertUserFromAuth,
  createPasswordResetRequest,
  markPasswordResetLinkSent,
} from "../repositories/users-repository.js";
import { getEffectivePermissionsForUser } from "./permissions-service.js";
import { assignAdditionalRoleToUser, ensureSystemRoleAssignment, replaceUserAdditionalRolesForAdmin, replaceUserSystemRole } from "./roles-service.js";
import { updateUserPermissionsForAdmin } from "./permissions-service.js";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toPublicUser<T extends { passwordHash?: string | null }>(user: T | undefined | null) {
  if (!user) return user ?? null;
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function employeeDisplayName(
  profile?: { firstName?: string | null; fatherName?: string | null } | null,
  fallback?: string | null,
) {
  const firstFather = [profile?.firstName, profile?.fatherName]
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return firstFather || fallback || null;
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
  const assignedRole = user.assignedRoleId
    ? await db.query.roles.findFirst({ where: eq(roles.id, user.assignedRoleId) })
    : null;
  const profile = user.role === "employee"
    ? await db.query.employeeProfiles.findFirst({ where: eq(employeeProfiles.userId, user.id) })
    : null;
  return {
    ...toPublicUser(user),
    displayName: user.role === "employee" ? employeeDisplayName(profile, user.name) : user.name,
    profile,
    assignedRoleActive: assignedRole ? assignedRole.color !== "inactive" : null,
    assignedRoleName: assignedRole?.name ?? null,
    permissions: await getEffectivePermissionsForUser(user.id),
  };
}

export async function updateCurrentUserProfile(payload: {
  email: string;
  name?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  profile?: Partial<{
    firstName: string;
    fatherName: string;
    grandfatherName: string | null;
    gender: string;
    dateOfBirth: string | null;
    maritalStatus: string | null;
    country: string | null;
    city: string | null;
    address: string | null;
    employmentType: string | null;
    startDate: string | null;
    inviteStatus: string | null;
    notes: string | null;
  }>;
}) {
  const user = await getUserByEmail(normalizeEmail(payload.email));
  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const updated = await updateEmployeeCoreForAdmin({
    userId: user.id,
    name: payload.name?.trim(),
    phone: payload.phone ?? undefined,
    avatarUrl: payload.avatarUrl ?? undefined,
  });

  if (user.role === "employee" && payload.profile) {
    const currentProfile = await db.query.employeeProfiles.findFirst({
      where: eq(employeeProfiles.userId, user.id),
    });
    const profilePatch = payload.profile;
    const toTs = (value?: string | null) => (value ? new Date(value) : value === null ? null : undefined);

    if (currentProfile) {
      await db
        .update(employeeProfiles)
        .set({
          ...(profilePatch.firstName !== undefined ? { firstName: profilePatch.firstName.trim() } : {}),
          ...(profilePatch.fatherName !== undefined ? { fatherName: profilePatch.fatherName.trim() } : {}),
          ...(profilePatch.grandfatherName !== undefined ? { grandfatherName: profilePatch.grandfatherName?.trim() || null } : {}),
          ...(profilePatch.gender !== undefined ? { gender: profilePatch.gender.trim() } : {}),
          ...(profilePatch.dateOfBirth !== undefined ? { dateOfBirth: toTs(profilePatch.dateOfBirth) } : {}),
          ...(profilePatch.maritalStatus !== undefined ? { maritalStatus: profilePatch.maritalStatus?.trim() || null } : {}),
          ...(profilePatch.country !== undefined ? { country: profilePatch.country?.trim() || null } : {}),
          ...(profilePatch.city !== undefined ? { city: profilePatch.city?.trim() || null } : {}),
          ...(profilePatch.address !== undefined ? { address: profilePatch.address?.trim() || null } : {}),
          ...(profilePatch.employmentType !== undefined ? { employmentType: profilePatch.employmentType?.trim() || null } : {}),
          ...(profilePatch.startDate !== undefined ? { startDate: toTs(profilePatch.startDate) } : {}),
          ...(profilePatch.inviteStatus !== undefined ? { inviteStatus: profilePatch.inviteStatus?.trim() || "none" } : {}),
          ...(profilePatch.notes !== undefined ? { notes: profilePatch.notes?.trim() || null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(employeeProfiles.userId, user.id));
    } else if (profilePatch.firstName && profilePatch.fatherName && profilePatch.gender) {
      await db.insert(employeeProfiles).values({
        userId: user.id,
        firstName: profilePatch.firstName.trim(),
        fatherName: profilePatch.fatherName.trim(),
        grandfatherName: profilePatch.grandfatherName?.trim() || null,
        gender: profilePatch.gender.trim(),
        dateOfBirth: toTs(profilePatch.dateOfBirth),
        maritalStatus: profilePatch.maritalStatus?.trim() || null,
        country: profilePatch.country?.trim() || null,
        city: profilePatch.city?.trim() || null,
        address: profilePatch.address?.trim() || null,
        employmentType: profilePatch.employmentType?.trim() || null,
        startDate: toTs(profilePatch.startDate),
        inviteStatus: profilePatch.inviteStatus?.trim() || "none",
        notes: profilePatch.notes?.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  return getCurrentUserByEmail(updated.email);
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
    throw new HTTPException(403, { message: "Please contact admin. Account has been blocked." });
  }

  const matches = await verifyPassword(payload.password, user.passwordHash);
  if (!matches) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }

  await ensureSystemRoleAssignment(user.id, user.role);
  await updateLastLoginAt(user.id);

  const assignedRole = user.assignedRoleId
    ? await db.query.roles.findFirst({ where: eq(roles.id, user.assignedRoleId) })
    : null;
  const profile = user.role === "employee"
    ? await db.query.employeeProfiles.findFirst({ where: eq(employeeProfiles.userId, user.id) })
    : null;

  return {
    ...toPublicUser(user),
    displayName: user.role === "employee" ? employeeDisplayName(profile, user.name) : user.name,
    profile,
    assignedRoleActive: assignedRole ? assignedRole.color !== "inactive" : null,
    assignedRoleName: assignedRole?.name ?? null,
    permissions: await getEffectivePermissionsForUser(user.id),
  };
}

export async function listUsersForAdmin(limit = 200) {
  return listUsers(limit);
}

export async function getEmployeeDetailForAdmin(userId: string) {
  const user = await getUserById(userId);
  if (!user) {
    throw new HTTPException(404, { message: "Employee not found" });
  }

  const profile = await db.query.employeeProfiles.findFirst({
    where: eq(employeeProfiles.userId, user.id),
  });

  const assignedRole = user.assignedRoleId
    ? await db.query.roles.findFirst({ where: eq(roles.id, user.assignedRoleId) })
    : null;

  const permissions = await getEffectivePermissionsForUser(user.id);

  const activity = await db.query.auditLogs.findMany({
    where: and(eq(auditLogs.performedBy, user.email)),
    orderBy: [desc(auditLogs.createdAt)],
    limit: 50,
  });

  const orderIds = activity
    .filter((row) => String(row.entityType ?? "").toLowerCase().includes("order"))
    .map((row) => String(row.entityId ?? ""))
    .filter((id) => /^[0-9a-fA-F-]{36}$/.test(id));

  const handledOrders = orderIds.length
    ? await db.query.orders.findMany({
        where: inArray(orders.id, Array.from(new Set(orderIds))),
        orderBy: [desc(orders.createdAt)],
        limit: 50,
      })
    : [];

  return {
    user: toPublicUser(user),
    profile,
    assignedRole,
    permissions,
    activity,
    handledOrders,
  };
}

export async function createEmployeeForAdmin(payload: {
  email: string;
  name: string;
  password: string;
  roleId?: string;
  status?: "active" | "inactive" | "suspended";
  accountStatus?: "active" | "invited" | "pending";
  phone?: string | null;
  avatarUrl?: string | null;
  profile?: {
    firstName: string;
    fatherName: string;
    grandfatherName?: string | null;
    gender: string;
    dateOfBirth?: string | null;
    maritalStatus?: string | null;
    country?: string | null;
    city?: string | null;
    address?: string | null;
    employmentType?: string | null;
    startDate?: string | null;
    inviteStatus?: string | null;
    notes?: string | null;
  };
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
    status: payload.status ?? "active",
    accountStatus: payload.accountStatus ?? "active",
    roleStatus: payload.roleId ? "assigned" : "unassigned",
    phone: payload.phone ?? null,
    avatarUrl: payload.avatarUrl ?? null,
  });

  if (!user) {
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }
  await ensureSystemRoleAssignment(user.id, user.role);
  if (payload.roleId) {
    await assignAdditionalRoleToUser(user.id, payload.roleId);
  }

  if (payload.profile) {
    await db.insert(employeeProfiles).values({
      userId: user.id,
      firstName: payload.profile.firstName.trim(),
      fatherName: payload.profile.fatherName.trim(),
      grandfatherName: payload.profile.grandfatherName ?? null,
      gender: payload.profile.gender,
      dateOfBirth: payload.profile.dateOfBirth ? new Date(payload.profile.dateOfBirth) : null,
      maritalStatus: payload.profile.maritalStatus ?? null,
      country: payload.profile.country ?? null,
      city: payload.profile.city ?? null,
      address: payload.profile.address ?? null,
      employmentType: payload.profile.employmentType ?? null,
      startDate: payload.profile.startDate ? new Date(payload.profile.startDate) : null,
      inviteStatus: payload.profile.inviteStatus ?? "none",
      notes: payload.profile.notes ?? null,
      updatedAt: new Date(),
    });
  }

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

export async function createCustomerForAdmin(payload: {
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
    role: "customer",
  });
  if (!user) {
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }
  await ensureSystemRoleAssignment(user.id, user.role);

  await db.insert(auditLogs).values({
    action: "customer_account_created",
    category: "admin",
    severity: "info",
    entityType: "user",
    entityId: user.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin created customer account",
    metadata: { email: user.email, role: user.role },
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

export async function assignEmployeeAccessForAdmin(payload: {
  userId: string;
  roleId?: string | null;
  permissionKeys?: string[];
  performedBy?: string;
}) {
  const user = await getUserById(payload.userId);
  if (!user) throw new HTTPException(404, { message: "User not found" });
  if (user.role !== "employee") {
    throw new HTTPException(400, { message: "Access assignment is only supported for employee accounts" });
  }

  if (payload.roleId) {
    const role = await db.query.roles.findFirst({ where: eq(roles.id, payload.roleId) });
    if (!role) throw new HTTPException(400, { message: "Selected role was not found" });
    if (role.color === "inactive") {
      throw new HTTPException(400, { message: "Inactive roles cannot be assigned to employees. Activate the role before assigning it." });
    }
  }

  const roleIds = payload.roleId ? [payload.roleId] : [];
  await replaceUserAdditionalRolesForAdmin(user.id, roleIds);

  const permissionKeys = Array.from(new Set(payload.permissionKeys ?? []));
  await updateUserPermissionsForAdmin(user.id, permissionKeys);

  const updated = await updateEmployeeAccess({
    userId: user.id,
    roleStatus: roleIds.length > 0 || permissionKeys.length > 0 ? "assigned" : "unassigned",
    assignedRoleId: payload.roleId ?? null,
  });

  await db.insert(auditLogs).values({
    action: "employee_access_assigned",
    category: "admin",
    severity: "info",
    entityType: "user",
    entityId: user.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin assigned employee access",
    metadata: {
      assignedRoleId: payload.roleId ?? null,
      permissions: permissionKeys,
    },
  });

  return toPublicUser(updated);
}

export async function updateUserProfileForAdminService(payload: {
  userId: string;
  name?: string;
  email?: string;
  phone?: string | null;
  accountStatus?: "active" | "invited" | "pending";
  avatarUrl?: string | null;
  profile?: Partial<{
    firstName: string;
    fatherName: string;
    grandfatherName: string | null;
    gender: string;
    dateOfBirth: string | null;
    maritalStatus: string | null;
    country: string | null;
    city: string | null;
    address: string | null;
    employmentType: string | null;
    startDate: string | null;
    inviteStatus: string | null;
    notes: string | null;
  }>;
  performedBy?: string;
}) {
  const existing = await getUserById(payload.userId);
  if (!existing) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const nextEmail = payload.email ? normalizeEmail(payload.email) : undefined;
  if (nextEmail && nextEmail !== existing.email) {
    const emailOwner = await getUserByEmail(nextEmail);
    if (emailOwner && emailOwner.id !== payload.userId) {
      throw new HTTPException(409, { message: "An account with this email already exists" });
    }
  }

  const updated = await updateEmployeeCoreForAdmin({
    userId: payload.userId,
    name: payload.name?.trim(),
    email: nextEmail,
    phone: payload.phone ?? undefined,
    accountStatus: payload.accountStatus,
    avatarUrl: payload.avatarUrl ?? undefined,
  });
  if (!updated) {
    throw new HTTPException(404, { message: "User not found" });
  }

  if (existing.role === "employee" && payload.profile) {
    const currentProfile = await db.query.employeeProfiles.findFirst({
      where: eq(employeeProfiles.userId, existing.id),
    });

    const profilePatch = payload.profile;
    const toTs = (value?: string | null) => (value ? new Date(value) : value === null ? null : undefined);

    if (currentProfile) {
      await db
        .update(employeeProfiles)
        .set({
          ...(profilePatch.firstName !== undefined ? { firstName: profilePatch.firstName.trim() } : {}),
          ...(profilePatch.fatherName !== undefined ? { fatherName: profilePatch.fatherName.trim() } : {}),
          ...(profilePatch.grandfatherName !== undefined ? { grandfatherName: profilePatch.grandfatherName?.trim() || null } : {}),
          ...(profilePatch.gender !== undefined ? { gender: profilePatch.gender.trim() } : {}),
          ...(profilePatch.dateOfBirth !== undefined ? { dateOfBirth: toTs(profilePatch.dateOfBirth) } : {}),
          ...(profilePatch.maritalStatus !== undefined ? { maritalStatus: profilePatch.maritalStatus?.trim() || null } : {}),
          ...(profilePatch.country !== undefined ? { country: profilePatch.country?.trim() || null } : {}),
          ...(profilePatch.city !== undefined ? { city: profilePatch.city?.trim() || null } : {}),
          ...(profilePatch.address !== undefined ? { address: profilePatch.address?.trim() || null } : {}),
          ...(profilePatch.employmentType !== undefined ? { employmentType: profilePatch.employmentType?.trim() || null } : {}),
          ...(profilePatch.startDate !== undefined ? { startDate: toTs(profilePatch.startDate) } : {}),
          ...(profilePatch.inviteStatus !== undefined ? { inviteStatus: (profilePatch.inviteStatus ?? "none").trim() || "none" } : {}),
          ...(profilePatch.notes !== undefined ? { notes: profilePatch.notes?.trim() || null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(employeeProfiles.userId, existing.id));
    } else {
      if (!profilePatch.firstName || !profilePatch.fatherName || !profilePatch.gender) {
        throw new HTTPException(400, { message: "Employee profile is missing required fields" });
      }
      await db.insert(employeeProfiles).values({
        userId: existing.id,
        firstName: profilePatch.firstName.trim(),
        fatherName: profilePatch.fatherName.trim(),
        grandfatherName: profilePatch.grandfatherName?.trim() || null,
        gender: profilePatch.gender.trim(),
        dateOfBirth: toTs(profilePatch.dateOfBirth),
        maritalStatus: profilePatch.maritalStatus?.trim() || null,
        country: profilePatch.country?.trim() || null,
        city: profilePatch.city?.trim() || null,
        address: profilePatch.address?.trim() || null,
        employmentType: profilePatch.employmentType?.trim() || null,
        startDate: toTs(profilePatch.startDate),
        inviteStatus: profilePatch.inviteStatus?.trim() || "none",
        notes: profilePatch.notes?.trim() || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
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

function sha256Hex(value: string) {
  // Avoid leaking raw tokens to the DB; store only the hash.
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function sendPasswordResetLinkForAdmin(payload: { userId: string; performedBy?: string }) {
  const existing = await getUserById(payload.userId);
  if (!existing) {
    throw new HTTPException(404, { message: "User not found" });
  }
  if (!existing.email) {
    throw new HTTPException(400, { message: "User email is required to send a reset link" });
  }

  // Generate secure random token; never return it to the client.
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await createPasswordResetRequest({ userId: payload.userId, tokenHash, expiresAt });
  const updated = await markPasswordResetLinkSent({ userId: payload.userId });

  await db.insert(auditLogs).values({
    action: "user_password_reset_link_sent",
    category: "admin",
    severity: "info",
    entityType: "user",
    entityId: updated.id,
    performedBy: payload.performedBy ?? "admin",
    details: "Admin sent password reset link",
    metadata: { email: updated.email },
  });

  // Email sending is environment-specific. If no mail provider is configured,
  // we still record the request and rely on ops to wire up mail delivery.
  return toPublicUser(updated);
}

export async function requestPasswordResetByEmail(payload: { email: string }) {
  const email = normalizeEmail(payload.email);
  const user = await getUserByEmail(email);

  // Avoid account enumeration: always behave as if the email was accepted.
  if (!user?.id) {
    return { accepted: true };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await createPasswordResetRequest({ userId: user.id, tokenHash, expiresAt });
  await markPasswordResetLinkSent({ userId: user.id });

  // Email delivery is wired up by ops; we only track the request for now.
  return { accepted: true };
}

export async function deleteUserForAdmin(payload: { userId: string; performedBy?: string }) {
  const existing = await getUserById(payload.userId);
  if (!existing) {
    throw new HTTPException(404, { message: "User not found" });
  }

  const history = await db.query.auditLogs.findFirst({
    where: and(eq(auditLogs.entityType, "user"), eq(auditLogs.entityId, payload.userId)),
    columns: { id: true },
  });
  if (history) {
    throw new HTTPException(409, {
      message: "This account can’t be deleted because it has activity history. Please block the account instead.",
    });
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
