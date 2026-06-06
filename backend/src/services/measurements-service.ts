import { HTTPException } from "hono/http-exception";
import {
  deleteMeasurementForUser,
  getMeasurementForUser,
  insertMeasurement,
  listMeasurementsForUser,
  type MeasurementPatch,
  updateMeasurementForUser,
} from "../repositories/measurements-repository.js";
import { getUserByEmail } from "../repositories/users-repository.js";

function toMoneyString(value: number) {
  return value.toFixed(2);
}

export async function listMyMeasurements(userEmail?: string) {
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const user = await getUserByEmail(userEmail);
  return listMeasurementsForUser(userEmail, user?.id);
}

export async function createMyMeasurement(
  userEmail: string | undefined,
  body: {
    gender: string;
    chest: number;
    waist: number;
    hips: number;
    shoulderWidth: number;
    armLength: number;
    torsoLength: number;
    inseam?: number;
    neck?: number;
    label?: string;
  },
) {
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const user = await getUserByEmail(userEmail);

  return insertMeasurement({
    userId: user?.id,
    userEmail,
    gender: body.gender,
    chest: toMoneyString(body.chest),
    waist: toMoneyString(body.waist),
    hips: toMoneyString(body.hips),
    shoulderWidth: toMoneyString(body.shoulderWidth),
    armLength: toMoneyString(body.armLength),
    torsoLength: toMoneyString(body.torsoLength),
    inseam: body.inseam !== undefined ? toMoneyString(body.inseam) : undefined,
    neck: body.neck !== undefined ? toMoneyString(body.neck) : undefined,
    label: body.label,
  });
}

export async function getMyMeasurement(userEmail: string | undefined, id: string) {
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const user = await getUserByEmail(userEmail);
  const row = await getMeasurementForUser({ id, userEmail, userId: user?.id });
  if (!row) {
    throw new HTTPException(404, { message: "Measurement not found" });
  }
  return row;
}

export async function patchMyMeasurement(
  userEmail: string | undefined,
  id: string,
  body: Partial<{
    gender: string;
    chest: number;
    waist: number;
    hips: number;
    shoulderWidth: number;
    armLength: number;
    torsoLength: number;
    inseam: number | null;
    neck: number | null;
    label: string;
  }>,
) {
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const user = await getUserByEmail(userEmail);

  const patch: MeasurementPatch = {};
  if (body.gender !== undefined) patch.gender = body.gender;
  if (body.chest !== undefined) patch.chest = toMoneyString(body.chest);
  if (body.waist !== undefined) patch.waist = toMoneyString(body.waist);
  if (body.hips !== undefined) patch.hips = toMoneyString(body.hips);
  if (body.shoulderWidth !== undefined) patch.shoulderWidth = toMoneyString(body.shoulderWidth);
  if (body.armLength !== undefined) patch.armLength = toMoneyString(body.armLength);
  if (body.torsoLength !== undefined) patch.torsoLength = toMoneyString(body.torsoLength);
  if (body.inseam !== undefined) {
    patch.inseam = body.inseam === null ? null : toMoneyString(body.inseam);
  }
  if (body.neck !== undefined) {
    patch.neck = body.neck === null ? null : toMoneyString(body.neck);
  }
  if (body.label !== undefined) patch.label = body.label;

  if (Object.keys(patch).length === 0) {
    throw new HTTPException(400, { message: "No fields to update" });
  }

  const row = await updateMeasurementForUser({ id, userEmail, userId: user?.id, patch });
  if (!row) {
    throw new HTTPException(404, { message: "Measurement not found" });
  }
  return row;
}

export async function deleteMyMeasurement(userEmail: string | undefined, id: string) {
  if (!userEmail) {
    throw new HTTPException(400, { message: "Authenticated token must include email" });
  }
  const user = await getUserByEmail(userEmail);
  const row = await deleteMeasurementForUser({ id, userEmail, userId: user?.id });
  if (!row) {
    throw new HTTPException(404, { message: "Measurement not found" });
  }
}
