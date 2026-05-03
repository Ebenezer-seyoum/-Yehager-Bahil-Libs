import { eq } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { users } from "../lib/db/schema.js";

export async function upsertUserFromAuth(payload: {
  externalId: string;
  email: string;
  name?: string;
  role?: string;
}) {
  const role = payload.role ?? "customer";

  const [row] = await db
    .insert(users)
    .values({
      email: payload.email,
      name: payload.name ?? null,
      role,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: payload.name ?? null,
        role,
      },
    })
    .returning();

  return row;
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}
