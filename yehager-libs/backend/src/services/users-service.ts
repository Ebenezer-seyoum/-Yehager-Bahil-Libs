import { HTTPException } from "hono/http-exception";
import { getUserByEmail, upsertUserFromAuth } from "../repositories/users-repository.js";

export async function syncCurrentUserFromAuth(payload: {
  sub: string;
  email?: string;
  role?: string;
  name?: string;
}) {
  if (!payload.email) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }

  return upsertUserFromAuth({
    externalId: payload.sub,
    email: payload.email,
    role: payload.role,
    name: payload.name,
  });
}

export async function getCurrentUserByEmail(email?: string) {
  if (!email) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  return getUserByEmail(email);
}
