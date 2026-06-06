import "server-only";

import { SignJWT } from "jose";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth-options";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

/** Server-only: mints a short-lived JWT for the Hono API. Do not import from client components. */
export async function mintBackendAccessToken() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("No authenticated user found");
  }

  const secret = new TextEncoder().encode(requiredEnv("NEXTAUTH_SECRET"));
  const issuer = requiredEnv("AUTH_SHARED_JWT_ISSUER");
  const audience = requiredEnv("AUTH_SHARED_JWT_AUDIENCE");

  const token = await new SignJWT({
    email: session.user.email,
    role: session.user.role ?? "customer",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(session.user.id)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);

  return token;
}
