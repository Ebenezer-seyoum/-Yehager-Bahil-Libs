import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: "Email/Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const configuredEmail = process.env.AUTH_DEMO_EMAIL;
        const configuredPassword = process.env.AUTH_DEMO_PASSWORD;

        if (!configuredEmail || !configuredPassword) {
          throw new Error("AUTH_DEMO_EMAIL and AUTH_DEMO_PASSWORD must be configured");
        }

        if (credentials?.email !== configuredEmail || credentials?.password !== configuredPassword) {
          return null;
        }

        return {
          id: configuredEmail,
          email: configuredEmail,
          name: "Yehager User",
          role: credentials?.role === "admin" ? "admin" : "customer",
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
        token.role = (user as { role?: string }).role ?? "customer";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.email = token.email ?? session.user.email ?? null;
        session.user.role = (token.role as string | undefined) ?? "customer";
      }
      return session;
    },
  },
} satisfies NextAuthOptions;
