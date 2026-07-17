import { eq } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { dashboardPreferences } from "../lib/db/schema.js";
import { getUserByEmail } from "../repositories/users-repository.js";

const DEFAULTS = { topBarColor: "#0f172a", sidebarColor: "#0f172a" };
const colorPattern = /^#[0-9a-fA-F]{6}$/;

export async function getDashboardPreferences(email: string) {
  const user = await getUserByEmail(email);
  if (!user) throw new Error("Authenticated user not found");
  const row = await db.query.dashboardPreferences.findFirst({ where: eq(dashboardPreferences.userId, user.id) });
  return row ?? { ...DEFAULTS, userId: user.id };
}

export async function updateDashboardPreferences(email: string, values: { topBarColor: string; sidebarColor: string }) {
  const user = await getUserByEmail(email);
  if (!user) throw new Error("Authenticated user not found");
  if (!colorPattern.test(values.topBarColor) || !colorPattern.test(values.sidebarColor)) throw new Error("Colors must be six-digit hexadecimal values");
  const [row] = await db.insert(dashboardPreferences).values({ userId: user.id, topBarColor: values.topBarColor, sidebarColor: values.sidebarColor, updatedAt: new Date() }).onConflictDoUpdate({ target: dashboardPreferences.userId, set: { topBarColor: values.topBarColor, sidebarColor: values.sidebarColor, updatedAt: new Date() } }).returning();
  return row;
}
