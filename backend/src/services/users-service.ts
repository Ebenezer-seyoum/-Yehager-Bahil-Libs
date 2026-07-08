import { HTTPException } from "hono/http-exception";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import {
  auditLogs,
  cartItems,
  employeeProfiles,
  eventParticipants,
  events,
  familyGroups,
  familyMembers,
  measurements,
  orders,
  pendingCustomerRegistrations,
  roles,
  uploadedDesigns,
  users,
} from "../lib/db/schema.js";
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
  getPasswordResetRequestByTokenHash,
  markPasswordResetLinkSent,
  markPasswordResetRequestUsed,
  updateUserPresence,
} from "../repositories/users-repository.js";
import { getEffectivePermissionsForUser } from "./permissions-service.js";
import { assignAdditionalRoleToUser, ensureSystemRoleAssignment, replaceUserAdditionalRolesForAdmin, replaceUserSystemRole } from "./roles-service.js";
import { updateUserPermissionsForAdmin } from "./permissions-service.js";
import {
  resetPasswordLink,
  sendAccountStatusChangedEmail,
  sendAdminAccountStatusChangedEmail,
  sendCustomerVerificationCodeEmail,
  sendEmployeeRoleAssignedEmail,
  sendPasswordResetEmail,
  sendPasswordSetupEmail,
  sendRegistrationEmail,
} from "./email-service.js";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const CUSTOMER_VERIFICATION_EXPIRES_MINUTES = 10;
const CUSTOMER_VERIFICATION_RESEND_SECONDS = 60;
const CUSTOMER_VERIFICATION_MAX_ATTEMPTS = 5;

function verificationCodeHash(email: string, code: string) {
  return crypto
    .createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}:${process.env.NEXTAUTH_SECRET ?? "yehager"}`)
    .digest("hex");
}

function generateVerificationCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function toPublicUser<T extends { passwordHash?: string | null }>(user: T | undefined | null) {
  if (!user) return user ?? null;
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function isFreshOnline(user: { isOnline?: boolean | null; lastHeartbeatAt?: Date | string | null }) {
  if (!user.isOnline || !user.lastHeartbeatAt) return false;
  const heartbeat = new Date(user.lastHeartbeatAt).getTime();
  return Number.isFinite(heartbeat) && Date.now() - heartbeat < 5 * 60 * 1000;
}

function customerProfileComplete(user: { name?: string | null; phone?: string | null; address?: string | null }) {
  return Boolean(user.name?.trim() && user.phone?.trim() && user.address?.trim());
}

function withComputedUserState<T extends {
  passwordHash?: string | null;
  role?: string | null;
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  isOnline?: boolean | null;
  lastHeartbeatAt?: Date | string | null;
}>(user: T | undefined | null): (Omit<T, "passwordHash"> & {
  isOnline: boolean;
  profileComplete: boolean;
  requiredProfileMissing: { name?: boolean; phone?: boolean; address?: boolean };
}) | null {
  if (!user) return user ?? null;
  const safeUser = toPublicUser(user) as Record<string, unknown>;
  const isCustomer = user.role === "customer";
  return {
    ...safeUser,
    isOnline: isFreshOnline(user),
    profileComplete: isCustomer ? customerProfileComplete(user) : true,
    requiredProfileMissing: isCustomer
      ? {
          name: !user.name?.trim(),
          phone: !user.phone?.trim(),
          address: !user.address?.trim(),
        }
      : {},
  } as Omit<T, "passwordHash"> & {
    isOnline: boolean;
    profileComplete: boolean;
    requiredProfileMissing: { name?: boolean; phone?: boolean; address?: boolean };
  };
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

const BLOCKED_EMPLOYEE_ASSIGNMENT_ROLE_KEYS = new Set(["admin", "employee", "customer"]);

async function getAssignableEmployeeRole(roleId: string) {
  const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
  if (!role) throw new HTTPException(400, { message: "Selected role was not found" });
  if (role.isSystem || BLOCKED_EMPLOYEE_ASSIGNMENT_ROLE_KEYS.has(role.key)) {
    throw new HTTPException(400, { message: "Admin, employee, and customer roles cannot be assigned as employee work roles." });
  }
  if (role.color === "inactive") {
    throw new HTTPException(400, { message: "Inactive roles cannot be assigned to employees. Activate the role before assigning it." });
  }
  return role;
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

  return withComputedUserState(user);
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
    ...withComputedUserState(user),
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
  address?: string | null;
  country?: string | null;
  city?: string | null;
  notes?: string | null;
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

  const nextName = payload.name?.trim();
  const nextPhone = payload.phone ?? undefined;
  const nextAddress = payload.address !== undefined ? payload.address?.trim() || null : undefined;
  const updated = await updateEmployeeCoreForAdmin({
    userId: user.id,
    name: nextName,
    phone: nextPhone,
    address: nextAddress,
    country: payload.country !== undefined ? payload.country?.trim() || null : undefined,
    city: payload.city !== undefined ? payload.city?.trim() || null : undefined,
    notes: payload.notes !== undefined ? payload.notes?.trim() || null : undefined,
    profileCompletedAt: user.role === "customer" && customerProfileComplete({
      name: nextName ?? user.name,
      phone: nextPhone ?? user.phone,
      address: nextAddress ?? user.address,
    }) ? user.profileCompletedAt ?? new Date() : undefined,
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
  return withComputedUserState(updated);
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
  await sendRegistrationEmail({ to: user.email, name: user.name });

  return toPublicUser(user);
}

export async function authenticateUser(payload: { email: string; password: string }) {
  const user = await getUserByEmail(normalizeEmail(payload.email));
  if (!user?.passwordHash) {
    throw new HTTPException(401, { message: "Invalid credentials" });
  }
  if (user.status !== "active") {
    throw new HTTPException(403, { message: "Your account is inactive. Please contact admin to activate it." });
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
    ...withComputedUserState({ ...user, isOnline: true, lastHeartbeatAt: new Date() }),
    displayName: user.role === "employee" ? employeeDisplayName(profile, user.name) : user.name,
    profile,
    assignedRoleActive: assignedRole ? assignedRole.color !== "inactive" : null,
    assignedRoleName: assignedRole?.name ?? null,
    permissions: await getEffectivePermissionsForUser(user.id),
  };
}

export async function listUsersForAdmin(limit = 200) {
  const rows = await listUsers(limit);
  return rows.map((user) => withComputedUserState(user));
}

export async function listCustomersForAdmin(limit = 200) {
  const users = await listUsers(limit);
  return users.filter((user) => user.role === "customer");
}

async function requireCustomerForAdmin(userId: string) {
  const user = await getUserById(userId);
  if (!user || user.role !== "customer") {
    throw new HTTPException(404, { message: "Customer not found" });
  }
  return user;
}

export async function getCustomerDetailForAdmin(userId: string) {
  const user = await requireCustomerForAdmin(userId);
  return {
    user: withComputedUserState(user),
    permissions: await getEffectivePermissionsForUser(user.id),
  };
}

export async function listCustomerMeasurementsForAdmin(userId: string) {
  const user = await requireCustomerForAdmin(userId);
  const email = String(user.email ?? "").trim().toLowerCase();
  const filters = email
    ? or(eq(measurements.userId, user.id), eq(measurements.userEmail, email))
    : eq(measurements.userId, user.id);

  return db.query.measurements.findMany({
    where: filters,
    orderBy: [desc(measurements.updatedAt)],
  });
}

export async function startCustomerRegistration(payload: { email: string; name?: string; password: string }) {
  const email = normalizeEmail(payload.email);
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }

  const now = new Date();
  const code = generateVerificationCode();
  const expiresAt = new Date(now.getTime() + CUSTOMER_VERIFICATION_EXPIRES_MINUTES * 60 * 1000);
  const resendAvailableAt = new Date(now.getTime() + CUSTOMER_VERIFICATION_RESEND_SECONDS * 1000);

  await db
    .insert(pendingCustomerRegistrations)
    .values({
      email,
      name: payload.name?.trim() || email.split("@")[0],
      passwordHash: await hashPassword(payload.password),
      codeHash: verificationCodeHash(email, code),
      attempts: 0,
      expiresAt,
      resendAvailableAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: pendingCustomerRegistrations.email,
      set: {
        name: payload.name?.trim() || email.split("@")[0],
        passwordHash: await hashPassword(payload.password),
        codeHash: verificationCodeHash(email, code),
        attempts: 0,
        expiresAt,
        resendAvailableAt,
        verifiedAt: null,
        updatedAt: now,
      },
    });

  await sendCustomerVerificationCodeEmail({
    to: email,
    name: payload.name?.trim() || email.split("@")[0],
    code,
    expiresInMinutes: CUSTOMER_VERIFICATION_EXPIRES_MINUTES,
  });

  return {
    email,
    expiresAt,
    resendAvailableAt,
  };
}

export async function resendCustomerRegistrationCode(payload: { email: string }) {
  const email = normalizeEmail(payload.email);
  const pending = await db.query.pendingCustomerRegistrations.findFirst({
    where: eq(pendingCustomerRegistrations.email, email),
  });
  if (!pending) {
    throw new HTTPException(404, { message: "No pending registration found for this email" });
  }
  if (pending.verifiedAt) {
    throw new HTTPException(400, { message: "This registration has already been verified" });
  }

  const now = new Date();
  if (pending.resendAvailableAt > now) {
    throw new HTTPException(429, { message: "Please wait before requesting another code" });
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(now.getTime() + CUSTOMER_VERIFICATION_EXPIRES_MINUTES * 60 * 1000);
  const resendAvailableAt = new Date(now.getTime() + CUSTOMER_VERIFICATION_RESEND_SECONDS * 1000);

  await db
    .update(pendingCustomerRegistrations)
    .set({
      codeHash: verificationCodeHash(email, code),
      attempts: 0,
      expiresAt,
      resendAvailableAt,
      updatedAt: now,
    })
    .where(eq(pendingCustomerRegistrations.email, email));

  await sendCustomerVerificationCodeEmail({
    to: email,
    name: pending.name,
    code,
    expiresInMinutes: CUSTOMER_VERIFICATION_EXPIRES_MINUTES,
  });

  return { email, expiresAt, resendAvailableAt };
}

export async function verifyCustomerRegistration(payload: { email: string; code: string }) {
  const email = normalizeEmail(payload.email);
  const pending = await db.query.pendingCustomerRegistrations.findFirst({
    where: eq(pendingCustomerRegistrations.email, email),
  });
  if (!pending || pending.verifiedAt) {
    throw new HTTPException(404, { message: "No pending registration found for this email" });
  }

  const now = new Date();
  if (pending.expiresAt < now) {
    throw new HTTPException(400, { message: "Verification code expired. Please request a new code." });
  }
  if (pending.attempts >= CUSTOMER_VERIFICATION_MAX_ATTEMPTS) {
    throw new HTTPException(429, { message: "Too many verification attempts. Please request a new code." });
  }

  const matches = verificationCodeHash(email, payload.code) === pending.codeHash;
  if (!matches) {
    await db
      .update(pendingCustomerRegistrations)
      .set({ attempts: pending.attempts + 1, updatedAt: now })
      .where(eq(pendingCustomerRegistrations.email, email));
    throw new HTTPException(400, { message: "Invalid verification code" });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    await db.delete(pendingCustomerRegistrations).where(eq(pendingCustomerRegistrations.email, email));
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }

  const user = await createUser({
    email,
    name: pending.name || email.split("@")[0],
    passwordHash: pending.passwordHash,
    role: "customer",
  });
  if (!user) {
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }

  await ensureSystemRoleAssignment(user.id, user.role);
  await db.delete(pendingCustomerRegistrations).where(eq(pendingCustomerRegistrations.email, email));
  await sendRegistrationEmail({ to: user.email, name: user.name });

  return withComputedUserState(user);
}

const requiredFamilyMeasurementFields = ["chest", "waist", "hips", "shoulderWidth", "armLength", "torsoLength"];

function hasSavedValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function groupIdFromOrderItem(item: Record<string, unknown>) {
  const metadata = (item.itemMetadata ?? item.item_metadata) as Record<string, unknown> | undefined;
  return String(metadata?.group_id ?? metadata?.groupId ?? "");
}

export async function getCustomerActivityForAdmin(userId: string) {
  const user = await requireCustomerForAdmin(userId);
  const email = String(user.email ?? "").trim().toLowerCase();
  const userOrders = await db.query.orders.findMany({
    where: or(eq(orders.userId, user.id), eq(orders.userEmail, email)),
    orderBy: [desc(orders.createdAt)],
    limit: 200,
  });
  const ownedEvents = await db.query.events.findMany({
    where: eq(events.ownerEmail, email),
    orderBy: [desc(events.updatedAt)],
    limit: 200,
  });
  const joinedParticipants = await db.query.eventParticipants.findMany({
    where: eq(eventParticipants.participantEmail, email),
    orderBy: [desc(eventParticipants.updatedAt)],
    limit: 200,
  });

  const eventIds = Array.from(new Set([
    ...ownedEvents.map((event) => event.id),
    ...joinedParticipants.map((participant) => participant.eventId),
    ...userOrders.map((order) => order.eventId).filter(Boolean),
  ] as string[]));

  const [eventRows, participantRows, familyRows, memberRows, cartRows, designRows] = await Promise.all([
    eventIds.length
      ? db.query.events.findMany({
          where: inArray(events.id, eventIds),
          orderBy: [desc(events.updatedAt)],
        })
      : [],
    eventIds.length
      ? db.query.eventParticipants.findMany({
          where: inArray(eventParticipants.eventId, eventIds),
          orderBy: [desc(eventParticipants.createdAt)],
        })
      : [],
    eventIds.length
      ? db.query.familyGroups.findMany({
          where: or(eq(familyGroups.leadEmail, email), inArray(familyGroups.eventId, eventIds)),
          orderBy: [desc(familyGroups.updatedAt)],
        })
      : db.query.familyGroups.findMany({
          where: eq(familyGroups.leadEmail, email),
          orderBy: [desc(familyGroups.updatedAt)],
        }),
    eventIds.length
      ? db.query.familyMembers.findMany({
          where: inArray(familyMembers.eventId, eventIds),
          orderBy: [desc(familyMembers.createdAt)],
        })
      : [],
    db.query.cartItems.findMany({
      where: eq(cartItems.userEmail, email),
      orderBy: [desc(cartItems.updatedAt)],
      limit: 200,
    }),
    db.query.uploadedDesigns.findMany({
      where: eq(uploadedDesigns.userEmail, email),
      orderBy: [desc(uploadedDesigns.updatedAt)],
      limit: 200,
    }),
  ]);

  const familyGroupIds = Array.from(new Set(familyRows.map((group) => group.id)));
  const directMembers = familyGroupIds.length
    ? await db.query.familyMembers.findMany({
        where: inArray(familyMembers.familyGroupId, familyGroupIds),
        orderBy: [desc(familyMembers.createdAt)],
      })
    : [];
  const allMembersById = new Map([...memberRows, ...directMembers].map((member) => [member.id, member]));
  const members = Array.from(allMembersById.values());
  const orderGroupIds = new Set(
    userOrders.flatMap((order) => (order.items ?? []).map((item) => groupIdFromOrderItem(item))).filter(Boolean),
  );
  const cartGroupIds = new Set(
    cartRows.map((item) => String(item.itemMetadata?.group_id ?? item.itemMetadata?.groupId ?? "")).filter(Boolean),
  );
  const paidGroupIds = new Set(
    userOrders
      .filter((order) => String(order.paymentStatus ?? "").toLowerCase() === "paid")
      .flatMap((order) => (order.items ?? []).map((item) => groupIdFromOrderItem(item)))
      .filter(Boolean),
  );

  const familySummaries = familyRows.map((group) => {
    const groupMembers = members.filter((member) => member.familyGroupId === group.id);
    const readyMemberCount = groupMembers.filter((member) =>
      requiredFamilyMeasurementFields.every((field) => hasSavedValue(member.measurements?.[field])),
    ).length;
    const hasOutfit = Boolean(group.productId || group.uploadedDesignId);
    const ordered = orderGroupIds.has(group.id);
    const paid = paidGroupIds.has(group.id);
    const inCart = cartGroupIds.has(group.id);
    const allReady = groupMembers.length > 0 && readyMemberCount === groupMembers.length;
    const currentStep = paid || ordered ? 4 : allReady || inCart ? 3 : hasOutfit ? 2 : 1;
    return {
      ...group,
      memberCount: groupMembers.length,
      readyMemberCount,
      inCart,
      ordered,
      paid,
      currentStep,
    };
  });

  const orderEventIds = new Set(userOrders.map((order) => order.eventId).filter(Boolean));
  const paidEventIds = new Set(userOrders.filter((order) => String(order.paymentStatus ?? "").toLowerCase() === "paid").map((order) => order.eventId).filter(Boolean));
  const eventSummaries = eventRows.map((event) => {
    const eventParticipantRows = participantRows.filter((participant) => participant.eventId === event.id);
    const eventOrders = userOrders.filter((order) => order.eventId === event.id);
    const familyForEvent = familySummaries.filter((group) => group.eventId === event.id);
    const participantCount = eventParticipantRows.length;
    const orderCount = eventOrders.length;
    const paidCount = eventOrders.filter((order) => String(order.paymentStatus ?? "").toLowerCase() === "paid").length;
    const hasOutfit = Boolean(event.productId || event.uploadedDesignId);
    const currentStep = orderEventIds.has(event.id) || paidEventIds.has(event.id) ? 4 : participantCount > 0 || familyForEvent.length > 0 ? 3 : hasOutfit ? 2 : 1;
    return {
      ...event,
      participantCount,
      orderCount,
      paidCount,
      familyGroupCount: familyForEvent.length,
      currentStep,
      isOwner: event.ownerEmail === email,
      joinedByCustomer: eventParticipantRows.some((participant) => participant.participantEmail === email),
    };
  });

  return {
    orders: userOrders,
    events: eventSummaries,
    eventParticipants: participantRows,
    familyGroups: familySummaries,
    familyMembers: members,
    cartItems: cartRows,
    uploadedDesigns: designRows,
  };
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
  const assignedRole = payload.roleId ? await getAssignableEmployeeRole(payload.roleId) : null;

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
    mustChangePassword: true,
    passwordStatus: "temporary_password_set",
    lastPasswordResetAt: new Date(),
    lastPasswordResetMethod: "temporary_password",
  });

  if (!user) {
    throw new HTTPException(409, { message: "An account with this email already exists" });
  }
  await ensureSystemRoleAssignment(user.id, user.role);
  let createdUser = user;
  if (assignedRole) {
    await assignAdditionalRoleToUser(user.id, assignedRole.id);
    const updatedAccess = await updateEmployeeAccess({
      userId: user.id,
      roleStatus: "assigned",
      assignedRoleId: assignedRole.id,
    });
    if (updatedAccess) createdUser = updatedAccess;
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

  const setup = await createPasswordResetToken(user.id, true);
  await markPasswordResetLinkSent({ userId: user.id });
  await sendPasswordSetupEmail({
    to: user.email,
    name: user.name,
    link: setup.link,
    expiresAt: setup.expiresAt,
    accountType: "employee",
  });

  return toPublicUser(createdUser);
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
    mustChangePassword: true,
    passwordStatus: "temporary_password_set",
    lastPasswordResetAt: new Date(),
    lastPasswordResetMethod: "temporary_password",
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
  const setup = await createPasswordResetToken(user.id, true);
  await markPasswordResetLinkSent({ userId: user.id });
  await sendPasswordSetupEmail({
    to: user.email,
    name: user.name,
    link: setup.link,
    expiresAt: setup.expiresAt,
    accountType: "customer",
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

  const assignedRole = payload.roleId ? await getAssignableEmployeeRole(payload.roleId) : null;

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

  await sendEmployeeRoleAssignedEmail({
    to: user.email,
    name: user.name,
    roleName: assignedRole?.name ?? undefined,
    permissionKeys,
  });

  return toPublicUser(updated);
}

export async function updateUserProfileForAdminService(payload: {
  userId: string;
  name?: string;
  email?: string;
  phone?: string | null;
  address?: string | null;
  country?: string | null;
  city?: string | null;
  notes?: string | null;
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

  const nextName = payload.name?.trim();
  const nextAddress = payload.address !== undefined ? payload.address?.trim() || null : undefined;
  const updated = await updateEmployeeCoreForAdmin({
    userId: payload.userId,
    name: nextName,
    email: nextEmail,
    phone: payload.phone ?? undefined,
    address: nextAddress,
    country: payload.country !== undefined ? payload.country?.trim() || null : undefined,
    city: payload.city !== undefined ? payload.city?.trim() || null : undefined,
    notes: payload.notes !== undefined ? payload.notes?.trim() || null : undefined,
    profileCompletedAt: existing.role === "customer" && customerProfileComplete({
      name: nextName ?? existing.name,
      phone: payload.phone ?? existing.phone,
      address: nextAddress ?? existing.address,
    }) ? existing.profileCompletedAt ?? new Date() : undefined,
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

  return withComputedUserState(updated);
}

export async function updateCustomerProfileForAdmin(payload: Parameters<typeof updateUserProfileForAdminService>[0]) {
  await requireCustomerForAdmin(payload.userId);
  const updated = await updateUserProfileForAdminService(payload);
  if (!updated || updated.role !== "customer") {
    throw new HTTPException(404, { message: "Customer not found" });
  }
  return updated;
}

export async function updateUserStatusForAdmin(payload: {
  userId: string;
  status: "active" | "inactive";
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

  if (existing.status !== updated.status) {
    await sendAccountStatusChangedEmail({
      to: updated.email,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      changedBy: payload.performedBy ?? "admin",
    });
    await sendAdminAccountStatusChangedEmail({
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      changedBy: payload.performedBy ?? "admin",
    });
  }

  return withComputedUserState(updated);
}

export async function updateCustomerStatusForAdmin(payload: Parameters<typeof updateUserStatusForAdmin>[0]) {
  await requireCustomerForAdmin(payload.userId);
  const updated = await updateUserStatusForAdmin(payload);
  if (!updated || updated.role !== "customer") {
    throw new HTTPException(404, { message: "Customer not found" });
  }
  return updated;
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

  return withComputedUserState(updated);
}

export async function updateCurrentUserPresence(payload: { email: string; online: boolean }) {
  const user = await getUserByEmail(normalizeEmail(payload.email));
  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }
  const updated = await updateUserPresence({ userId: user.id, online: payload.online });
  return withComputedUserState(updated);
}

export async function resetCustomerPasswordForAdmin(payload: Parameters<typeof resetUserPasswordForAdmin>[0]) {
  await requireCustomerForAdmin(payload.userId);
  const updated = await resetUserPasswordForAdmin(payload);
  if (!updated || updated.role !== "customer") {
    throw new HTTPException(404, { message: "Customer not found" });
  }
  return updated;
}

function sha256Hex(value: string) {
  // Avoid leaking raw tokens to the DB; store only the hash.
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function createPasswordResetToken(userId: string, isSetup = false) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60);
  await createPasswordResetRequest({ userId, tokenHash, expiresAt });
  return { token, expiresAt, link: resetPasswordLink(token, isSetup) };
}

export async function sendPasswordResetLinkForAdmin(payload: { userId: string; performedBy?: string }) {
  const existing = await getUserById(payload.userId);
  if (!existing) {
    throw new HTTPException(404, { message: "User not found" });
  }
  if (!existing.email) {
    throw new HTTPException(400, { message: "User email is required to send a reset link" });
  }

  const reset = await createPasswordResetToken(payload.userId);
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

  await sendPasswordResetEmail({
    to: updated.email,
    name: updated.name,
    link: reset.link,
    expiresAt: reset.expiresAt,
    accountType: updated.role,
  });
  return toPublicUser(updated);
}

export async function requestPasswordResetByEmail(payload: { email: string }) {
  const email = normalizeEmail(payload.email);
  const user = await getUserByEmail(email);

  // Avoid account enumeration: always behave as if the email was accepted.
  if (!user?.id) {
    return { accepted: true };
  }

  const reset = await createPasswordResetToken(user.id);
  await markPasswordResetLinkSent({ userId: user.id });
  await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    link: reset.link,
    expiresAt: reset.expiresAt,
    accountType: user.role,
  });

  return { accepted: true };
}

export async function confirmPasswordResetWithToken(payload: { token: string; password: string }) {
  const tokenHash = sha256Hex(payload.token);
  const request = await getPasswordResetRequestByTokenHash(tokenHash);
  if (!request || request.usedAt) {
    throw new HTTPException(400, { message: "Password reset link is invalid or already used." });
  }
  if (request.expiresAt < new Date()) {
    throw new HTTPException(400, { message: "Password reset link has expired. Please request a new one." });
  }

  const updated = await updateOwnPassword({
    userId: request.userId,
    passwordHash: await hashPassword(payload.password),
  });
  if (!updated) {
    throw new HTTPException(404, { message: "User not found" });
  }

  await markPasswordResetRequestUsed(request.id);
  await db
    .update(users)
    .set({
      passwordStatus: "reset_completed",
      lastPasswordResetAt: new Date(),
      lastPasswordResetMethod: "email_reset_link",
      updatedAt: new Date(),
    })
    .where(eq(users.id, request.userId));

  return withComputedUserState(updated);
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

export async function deleteCustomerForAdmin(payload: { userId: string; performedBy?: string }) {
  await requireCustomerForAdmin(payload.userId);
  const deleted = await deleteUserForAdmin(payload);
  if (!deleted || deleted.role !== "customer") {
    throw new HTTPException(404, { message: "Customer not found" });
  }
  return deleted;
}
