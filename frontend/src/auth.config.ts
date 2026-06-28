import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

type AppRole = "admin" | "customer" | "employee";

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

      const payload = (await response.json()) as {
        data?: {
          id?: string;
          email?: string;
          name?: string | null;
          displayName?: string | null;
          role?: "admin" | "customer" | "employee";
          permissions?: string[];
          roleStatus?: "unassigned" | "assigned";
          assignedRoleId?: string | null;
          assignedRoleActive?: boolean | null;
          assignedRoleName?: string | null;
          accountStatus?: string;
          mustChangePassword?: boolean | null;
        };
      };
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
          role?: unknown;
          permissions?: unknown;
          roleStatus?: unknown;
          assignedRoleId?: unknown;
          assignedRoleActive?: unknown;
          assignedRoleName?: unknown;
          accountStatus?: unknown;
          mustChangePassword?: unknown;
        };
        token.role = normalizeRole(authUser.role);
        token.permissions = Array.isArray(authUser.permissions)
          ? authUser.permissions
          : [];
        token.roleStatus = authUser.roleStatus === "unassigned" || authUser.roleStatus === "assigned"
          ? authUser.roleStatus
          : "assigned";
        token.assignedRoleId = typeof authUser.assignedRoleId === "string" ? authUser.assignedRoleId : null;
        token.assignedRoleActive = typeof authUser.assignedRoleActive === "boolean" ? authUser.assignedRoleActive : null;
        token.assignedRoleName = typeof authUser.assignedRoleName === "string" ? authUser.assignedRoleName : null;
        token.accountStatus = String(authUser.accountStatus ?? "active");
        token.mustChangePassword = Boolean(authUser.mustChangePassword);
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
