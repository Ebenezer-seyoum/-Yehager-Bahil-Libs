import { desc, eq } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { users } from "../lib/db/schema.js";
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
}) {
  const [row] = await db
    .insert(users)
    .values({
      email: payload.email,
      name: payload.name ?? null,
      passwordHash: payload.passwordHash,
      role: payload.role,
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
      avatarUrl: users.avatarUrl,
      lastLoginAt: users.lastLoginAt,
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
  const [row] = await db
    .update(users)
    .set({
      lastLoginAt: new Date(),
      updatedAt: new Date(),
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

export async function updateUserPasswordForAdmin(payload: { userId: string; passwordHash: string }) {
  const [row] = await db
    .update(users)
    .set({
      passwordHash: payload.passwordHash,
      mustChangePassword: true,
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
