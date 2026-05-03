import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  providers: [
    // Add your providers here, e.g. Google, Credentials, etc.
  ],
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
} satisfies NextAuthConfig;
