import { SignJWT } from "jose";
import { auth } from "next-auth";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export async function mintBackendAccessToken() {
  const session = await auth();
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
