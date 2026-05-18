import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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

export const authConfig = {
  providers: [
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
          return null;
        }

        const payload = (await response.json()) as {
          data?: {
            id?: string;
            email?: string;
            name?: string | null;
            role?: "admin" | "customer" | "employee";
            permissions?: string[];
          };
        };
        const user = payload.data;
        if (!user?.id || !user.email || !user.role) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          permissions: user.permissions ?? [],
        };
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as { role?: unknown; permissions?: unknown };
        token.role = normalizeRole(authUser.role);
        token.permissions = Array.isArray(authUser.permissions)
          ? authUser.permissions
          : [];
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.email = token.email ?? session.user.email ?? null;
        session.user.role = normalizeRole(token.role);
        session.user.permissions = Array.isArray(token.permissions) ? token.permissions : [];
      }
      return session;
    },
  },
} satisfies NextAuthOptions;
