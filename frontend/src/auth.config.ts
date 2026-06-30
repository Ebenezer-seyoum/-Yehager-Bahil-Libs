import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { SignJWT } from "jose";

type AppRole = "admin" | "customer" | "employee";

type BackendAuthUser = {
  id?: string;
  email?: string;
  name?: string | null;
  displayName?: string | null;
  role?: AppRole;
  permissions?: string[];
  roleStatus?: "unassigned" | "assigned";
  assignedRoleId?: string | null;
  assignedRoleActive?: boolean | null;
  assignedRoleName?: string | null;
  accountStatus?: string;
  mustChangePassword?: boolean | null;
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function normalizeRole(value: unknown): AppRole {
  return value === "admin" || value === "employee" || value === "customer" ? value : "customer";
}

async function mintBackendBootstrapToken(user: { id?: string | null; email?: string | null; role?: unknown }) {
  if (!user.id || !user.email) return null;

  const secret = new TextEncoder().encode(requiredEnv("NEXTAUTH_SECRET"));
  return new SignJWT({
    email: user.email,
    role: normalizeRole(user.role),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(requiredEnv("AUTH_SHARED_JWT_ISSUER"))
    .setAudience(requiredEnv("AUTH_SHARED_JWT_AUDIENCE"))
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(secret);
}

async function syncBackendUserForProvider(user: {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: unknown;
}) {
  const token = await mintBackendBootstrapToken(user);
  if (!token) return null;

  const response = await fetch(`${requiredEnv("BACKEND_API_URL")}/api/v1/users/me/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    console.warn("[auth] backend provider sync failed", {
      status: response.status,
      error: errorPayload?.error?.message ?? errorPayload?.error ?? errorPayload ?? null,
    });
    return null;
  }

  const payload = (await response.json()) as { data?: BackendAuthUser };
  return payload.data ?? null;
}

function applyBackendUserToToken(token: JWT, user: BackendAuthUser) {
  if (user.id) token.sub = user.id;
  if (user.email) token.email = user.email;
  token.name = user.displayName ?? user.name ?? token.name;
  token.role = normalizeRole(user.role);
  token.permissions = Array.isArray(user.permissions) ? user.permissions : [];
  token.roleStatus = user.roleStatus === "unassigned" || user.roleStatus === "assigned"
    ? user.roleStatus
    : "assigned";
  token.assignedRoleId = typeof user.assignedRoleId === "string" ? user.assignedRoleId : null;
  token.assignedRoleActive = typeof user.assignedRoleActive === "boolean" ? user.assignedRoleActive : null;
  token.assignedRoleName = typeof user.assignedRoleName === "string" ? user.assignedRoleName : null;
  token.accountStatus = String(user.accountStatus ?? "active");
  token.mustChangePassword = Boolean(user.mustChangePassword);
}

const providers: NonNullable<NextAuthOptions["providers"]> = [
  CredentialsProvider({
    name: "Email/Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      // Safe debug (never log password)
      console.log("[auth] credentials authorize", {
        email: String(credentials.email).trim().toLowerCase(),
      });

      const response = await fetch(`${requiredEnv("BACKEND_API_URL")}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        const backendMessage = String(
          errorPayload?.message ?? errorPayload?.error?.message ?? errorPayload?.error ?? "",
        ).toLowerCase();
        console.warn("[auth] backend login failed", {
          status: response.status,
          error: errorPayload?.error?.message ?? errorPayload?.error ?? errorPayload ?? null,
        });
        if (response.status === 403 || backendMessage.includes("blocked")) {
          throw new Error("AccountBlocked");
        }
        return null;
      }

      const payload = (await response.json()) as { data?: BackendAuthUser };
      const user = payload.data;
      if (!user?.id || !user.email || !user.role) {
        console.warn("[auth] backend login payload missing fields", { user });
        return null;
      }

      const status = String(user.accountStatus ?? "active").toLowerCase();
      if (status === "inactive" || status === "blocked" || status === "pending" || status === "suspended") {
        throw new Error("AccountBlocked");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.displayName ?? user.name ?? undefined,
        role: user.role,
        permissions: user.permissions ?? [],
        roleStatus: user.roleStatus ?? "assigned",
        assignedRoleId: user.assignedRoleId ?? null,
        assignedRoleActive: user.assignedRoleActive ?? null,
        assignedRoleName: user.assignedRoleName ?? null,
        accountStatus: user.accountStatus ?? "active",
        mustChangePassword: Boolean(user.mustChangePassword),
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authConfig = {
  providers,
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as {
          id?: string;
          email?: string | null;
          name?: string | null;
          role?: unknown;
          permissions?: unknown;
          roleStatus?: unknown;
          assignedRoleId?: unknown;
          assignedRoleActive?: unknown;
          assignedRoleName?: unknown;
          accountStatus?: unknown;
          mustChangePassword?: unknown;
        };
        if (authUser.role) {
          applyBackendUserToToken(token, authUser as BackendAuthUser);
        } else {
          const backendUser = await syncBackendUserForProvider({
            id: authUser.id ?? token.sub,
            email: authUser.email ?? token.email,
            name: authUser.name ?? token.name,
          });
          if (backendUser?.id && backendUser.email && backendUser.role) {
            applyBackendUserToToken(token, backendUser);
          } else {
            token.role = normalizeRole(authUser.role);
            token.permissions = [];
            token.roleStatus = "assigned";
            token.assignedRoleId = null;
            token.assignedRoleActive = null;
            token.assignedRoleName = null;
            token.accountStatus = "active";
            token.mustChangePassword = false;
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.email = token.email ?? session.user.email ?? null;
        session.user.role = normalizeRole(token.role);
        session.user.permissions = Array.isArray(token.permissions) ? token.permissions : [];
        session.user.roleStatus = token.roleStatus === "unassigned" || token.roleStatus === "assigned"
          ? token.roleStatus
          : "assigned";
        session.user.assignedRoleId = typeof token.assignedRoleId === "string" ? token.assignedRoleId : null;
        session.user.assignedRoleActive = typeof token.assignedRoleActive === "boolean" ? token.assignedRoleActive : null;
        session.user.assignedRoleName = typeof token.assignedRoleName === "string" ? token.assignedRoleName : null;
        session.user.accountStatus = String(token.accountStatus ?? "active");
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }
      return session;
    },
  },
} satisfies NextAuthOptions;
