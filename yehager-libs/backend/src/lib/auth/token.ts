import { jwtVerify } from "jose";
import { env } from "../../config/env.js";

export type AuthUser = {
  sub: string;
  email?: string;
  role?: string;
};

const secret = new TextEncoder().encode(env.NEXTAUTH_SECRET);

export async function verifyAccessToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: env.AUTH_SHARED_JWT_ISSUER,
    audience: env.AUTH_SHARED_JWT_AUDIENCE,
  });

  return {
    sub: String(payload.sub ?? ""),
    email: payload.email ? String(payload.email) : undefined,
    role: payload.role ? String(payload.role) : undefined,
  };
}
