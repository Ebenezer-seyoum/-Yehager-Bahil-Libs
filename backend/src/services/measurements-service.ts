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

function optionalMoney(value: number | null | undefined) {
  return value === null || value === undefined ? value : toMoneyString(value);
}

const detailKeys = [
  "bicepCircumference",
  "wristCircumference",
  "pantsWaist",
  "pantsHip",
  "thighCircumference",
  "waistToPantsLength",
  "hemStyle",
  "pressingStyle",
  "tailorNote",
] as const;

type MeasurementDetailsInput = Partial<Record<(typeof detailKeys)[number], number | string | null>>;

function buildMeasurementDetails(body: MeasurementDetailsInput) {
  const details: Record<string, unknown> = {};
  for (const key of detailKeys) {
    const value = body[key];
    if (value === undefined) continue;
    if (typeof value === "number") {
      details[key] = toMoneyString(value);
    } else if (value !== null && String(value).trim() !== "") {
      details[key] = value;
    }
  }
  return details;
}

function patchMeasurementDetails(current: Record<string, unknown> | null | undefined, body: MeasurementDetailsInput) {
  const details = { ...(current ?? {}) };
  for (const key of detailKeys) {
    const value = body[key];
    if (value === undefined) continue;
    if (value === null || String(value).trim() === "") {
      delete details[key];
    } else if (typeof value === "number") {
      details[key] = toMoneyString(value);
    } else {
      details[key] = value;
    }
  }
  return details;
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
    bicepCircumference?: number;
    wristCircumference?: number;
    pantsWaist?: number;
    pantsHip?: number;
    thighCircumference?: number;
    waistToPantsLength?: number;
    hemStyle?: string;
    pressingStyle?: string;
    tailorNote?: string;
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
    measurementDetails: buildMeasurementDetails(body),
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
    bicepCircumference: number | null;
    wristCircumference: number | null;
    pantsWaist: number | null;
    pantsHip: number | null;
    thighCircumference: number | null;
    waistToPantsLength: number | null;
    hemStyle: string | null;
    pressingStyle: string | null;
    tailorNote: string | null;
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
    patch.inseam = optionalMoney(body.inseam);
  }
  if (body.neck !== undefined) {
    patch.neck = optionalMoney(body.neck);
  }
  if (detailKeys.some((key) => body[key] !== undefined)) {
    const current = await getMeasurementForUser({ id, userEmail, userId: user?.id });
    if (!current) {
      throw new HTTPException(404, { message: "Measurement not found" });
    }
    patch.measurementDetails = patchMeasurementDetails(current.measurementDetails, body);
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
