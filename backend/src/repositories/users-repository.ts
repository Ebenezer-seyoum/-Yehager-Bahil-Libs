import { desc, eq } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { passwordResetRequests, users } from "../lib/db/schema.js";
import type { UserRole } from "../lib/auth/roles.js";

export async function upsertUserFromAuth(payload: {
  externalId: string;
  email: string;
  name?: string;
  role?: UserRole;
}) {
  const role = payload.role ?? "customer";

  const [row] = await db
    .insert(users)
    .values({
      email: payload.email,
      name: payload.name ?? null,
      role,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: payload.name ?? null,
      },
    })
    .returning();

  return row;
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

export async function getUserById(userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
  });
}

export async function createUser(payload: {
  email: string;
  name?: string;
  passwordHash: string;
  role: UserRole;
  status?: "active" | "inactive" | "suspended";
  accountStatus?: "active" | "invited" | "pending";
  roleStatus?: "unassigned" | "assigned";
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  notes?: string | null;
  avatarUrl?: string | null;
  mustChangePassword?: boolean;
  passwordStatus?: string;
  lastPasswordResetAt?: Date | null;
  lastPasswordResetMethod?: string | null;
}) {
  const [row] = await db
    .insert(users)
    .values({
      email: payload.email,
      name: payload.name ?? null,
      passwordHash: payload.passwordHash,
      role: payload.role,
      status: payload.status ?? "active",
      accountStatus: payload.accountStatus ?? "active",
      roleStatus: payload.roleStatus ?? "assigned",
      phone: payload.phone ?? null,
      address: payload.address ?? null,
      country: payload.country ?? null,
      city: payload.city ?? null,
      notes: payload.notes ?? null,
      avatarUrl: payload.avatarUrl ?? null,
      mustChangePassword: payload.mustChangePassword ?? false,
      passwordStatus: payload.passwordStatus ?? "never_reset",
      lastPasswordResetAt: payload.lastPasswordResetAt ?? null,
      lastPasswordResetMethod: payload.lastPasswordResetMethod ?? null,
    })
    .onConflictDoNothing()
    .returning();

  return row;
}

export async function listUsers(limit = 200) {
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      status: users.status,
      accountStatus: users.accountStatus,
      roleStatus: users.roleStatus,
      assignedRoleId: users.assignedRoleId,
      phone: users.phone,
      address: users.address,
      country: users.country,
      city: users.city,
      notes: users.notes,
      avatarUrl: users.avatarUrl,
      lastLoginAt: users.lastLoginAt,
      profileCompletedAt: users.profileCompletedAt,
      isOnline: users.isOnline,
      lastSeenAt: users.lastSeenAt,
      lastHeartbeatAt: users.lastHeartbeatAt,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit);
}

export async function updateUserRole(payload: { userId: string; role: UserRole }) {
  const [row] = await db
    .update(users)
    .set({
      role: payload.role,
      updatedAt: new Date(),
    })
    .where(eq(users.id, payload.userId))
    .returning();

  return row;
}

export async function updateLastLoginAt(userId: string) {
  const now = new Date();
  const [row] = await db
    .update(users)
    .set({
      lastLoginAt: now,
      isOnline: true,
      lastSeenAt: now,
      lastHeartbeatAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
    .returning();

  return row;
}

export async function updateUserProfileForAdmin(payload: { userId: string; name: string; email: string }) {
  const [row] = await db
    .update(users)
    .set({
      name: payload.name,
      email: payload.email,
      updatedAt: new Date(),
    })
    .where(eq(users.id, payload.userId))
    .returning();

  return row;
}

export async function updateEmployeeCoreForAdmin(payload: {
  userId: string;
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  notes?: string | null;
  profileCompletedAt?: Date | null;
  accountStatus?: "active" | "invited" | "pending";
  avatarUrl?: string | null;
}) {
  const [row] = await db
    .update(users)
    .set({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.email !== undefined ? { email: payload.email } : {}),
      ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
      ...(payload.address !== undefined ? { address: payload.address } : {}),
      ...(payload.country !== undefined ? { country: payload.country } : {}),
      ...(payload.city !== undefined ? { city: payload.city } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
      ...(payload.profileCompletedAt !== undefined ? { profileCompletedAt: payload.profileCompletedAt } : {}),
      ...(payload.accountStatus !== undefined ? { accountStatus: payload.accountStatus } : {}),
      ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, payload.userId))
    .returning();

  return row;
}

export async function updateUserStatus(payload: { userId: string; status: "active" | "inactive" | "suspended" }) {
  const [row] = await db
    .update(users)
    .set({
      status: payload.status,
      updatedAt: new Date(),
    })
    .where(eq(users.id, payload.userId))
    .returning();

  return row;
}

export async function updateUserPresence(payload: { userId: string; online: boolean }) {
  const now = new Date();
  const [row] = await db
    .update(users)
    .set({
      isOnline: payload.online,
      lastSeenAt: now,
      lastHeartbeatAt: payload.online ? now : null,
      updatedAt: now,
    })
    .where(eq(users.id, payload.userId))
    .returning();

  return row;
}

export async function getPasswordResetRequestByTokenHash(tokenHash: string) {
  return db.query.passwordResetRequests.findFirst({
    where: eq(passwordResetRequests.tokenHash, tokenHash),
    orderBy: [desc(passwordResetRequests.createdAt)],
  });
}

export async function markPasswordResetRequestUsed(requestId: string) {
  const [row] = await db
    .update(passwordResetRequests)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetRequests.id, requestId))
    .returning();
  return row;
}

export async function updateEmployeeAccess(payload: {
  userId: string;
  roleStatus: "unassigned" | "assigned";
  assignedRoleId: string | null;
}) {
  const [row] = await db
    .update(users)
    .set({
      roleStatus: payload.roleStatus,
      assignedRoleId: payload.assignedRoleId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, payload.userId))
    .returning();

  return row;
}

export async function updateUserPasswordForAdmin(payload: { userId: string; passwordHash: string }) {
  const [row] = await db
    .update(users)
    .set({
      passwordHash: payload.passwordHash,
      mustChangePassword: true,
      passwordStatus: "temporary_password_set",
      lastPasswordResetAt: new Date(),
      lastPasswordResetMethod: "temporary_password",
      updatedAt: new Date(),
    })
    .where(eq(users.id, payload.userId))
    .returning();

  return row;
}

export async function updateOwnPassword(payload: { userId: string; passwordHash: string }) {
  const [row] = await db
    .update(users)
    .set({
      passwordHash: payload.passwordHash,
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, payload.userId))
    .returning();

  return row;
}

export async function deleteUserById(userId: string) {
  const [row] = await db.delete(users).where(eq(users.id, userId)).returning();
  return row;
}

export async function createPasswordResetRequest(payload: { userId: string; tokenHash: string; expiresAt: Date }) {
  const [row] = await db
    .insert(passwordResetRequests)
    .values({
      userId: payload.userId,
      tokenHash: payload.tokenHash,
      expiresAt: payload.expiresAt,
    })
    .returning();
  return row;
}

export async function markPasswordResetLinkSent(payload: { userId: string }) {
  const [row] = await db
    .update(users)
    .set({
      passwordStatus: "reset_link_sent",
      lastPasswordResetRequestedAt: new Date(),
      lastPasswordResetMethod: "email_reset_link",
      updatedAt: new Date(),
    })
    .where(eq(users.id, payload.userId))
    .returning();
  return row;
}
