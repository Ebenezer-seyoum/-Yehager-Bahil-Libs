import { and, eq, or } from "drizzle-orm";
import { db } from "../lib/db/drizzle.js";
import { measurements } from "../lib/db/schema.js";

function ownedByUserFilter(userEmail: string, userId?: string) {
  if (userId) {
    return or(eq(measurements.userEmail, userEmail), eq(measurements.userId, userId));
  }
  return eq(measurements.userEmail, userEmail);
}

export async function listMeasurementsForUser(userEmail: string, userId?: string) {
  return db.query.measurements.findMany({
    where: ownedByUserFilter(userEmail, userId),
    orderBy: (table, { desc: d }) => [d(table.updatedAt)],
  });
}

export async function getMeasurementForUser(params: { id: string; userEmail: string; userId?: string }) {
  return db.query.measurements.findFirst({
    where: and(eq(measurements.id, params.id), ownedByUserFilter(params.userEmail, params.userId)),
  });
}

export type MeasurementInsert = {
  userId?: string;
  userEmail: string;
  gender: string;
  chest: string;
  waist: string;
  hips: string;
  shoulderWidth: string;
  armLength: string;
  torsoLength: string;
  inseam?: string;
  neck?: string;
  measurementDetails?: Record<string, unknown>;
  label?: string;
};

export async function insertMeasurement(payload: MeasurementInsert) {
  const [row] = await db
    .insert(measurements)
    .values({
      userId: payload.userId,
      userEmail: payload.userEmail,
      gender: payload.gender,
      chest: payload.chest,
      waist: payload.waist,
      hips: payload.hips,
      shoulderWidth: payload.shoulderWidth,
      armLength: payload.armLength,
      torsoLength: payload.torsoLength,
      inseam: payload.inseam,
      neck: payload.neck,
      measurementDetails: payload.measurementDetails ?? {},
      label: payload.label ?? "My Measurements",
    })
    .returning();

  return row;
}

export type MeasurementPatch = Partial<{
  gender: string;
  chest: string;
  waist: string;
  hips: string;
  shoulderWidth: string;
  armLength: string;
  torsoLength: string;
  inseam: string | null;
  neck: string | null;
  measurementDetails: Record<string, unknown>;
  label: string;
}>;

export async function updateMeasurementForUser(params: {
  id: string;
  userEmail: string;
  userId?: string;
  patch: MeasurementPatch;
}) {
  const [row] = await db
    .update(measurements)
    .set({
      ...params.patch,
      updatedAt: new Date(),
    })
    .where(and(eq(measurements.id, params.id), ownedByUserFilter(params.userEmail, params.userId)))
    .returning();

  return row;
}

export async function deleteMeasurementForUser(params: { id: string; userEmail: string; userId?: string }) {
  const [row] = await db
    .delete(measurements)
    .where(and(eq(measurements.id, params.id), ownedByUserFilter(params.userEmail, params.userId)))
    .returning({ id: measurements.id });

  return row;
}
