export type MeasurementField = {
  key: string;
  label: string;
  hint: string;
  required?: boolean;
};

export type MeasurementDisplayGroup = {
  title: string;
  fields: Array<[string, unknown]>;
};

export const TOP_MEASUREMENT_TITLE = "Shirt / Coat / Blazer Measurements";
export const PANTS_MEASUREMENT_TITLE = "Pants Measurements";

export const TOP_MEASUREMENT_FIELDS: MeasurementField[] = [
  { key: "neck", label: "Neck", hint: "Around the base of the neck where the collar sits", required: true },
  { key: "shoulderWidth", label: "Shoulder", hint: "Seam to seam across the top of the shoulder", required: true },
  { key: "chest", label: "Chest / Bust", hint: "Around the fullest part of the chest or bust", required: true },
  { key: "waist", label: "Waist", hint: "Around the narrowest part of your natural waist", required: true },
  { key: "hips", label: "Hip", hint: "Around the fullest part of the hips", required: true },
  { key: "torsoLength", label: "Shirt / Coat Length", hint: "From the back of the neck down to the desired hem", required: true },
  { key: "armLength", label: "Arm Length", hint: "From shoulder seam to wrist with arm slightly bent", required: true },
  { key: "bicepCircumference", label: "Bicep Circumference", hint: "Around the fullest part of the upper arm", required: false },
  { key: "wristCircumference", label: "Wrist Circumference", hint: "Around the wrist bone", required: false },
];

export const PANTS_MEASUREMENT_FIELDS: MeasurementField[] = [
  { key: "pantsWaist", label: "Pants Waist", hint: "Around the natural waistline", required: true },
  { key: "pantsHip", label: "Pants Hip", hint: "Around the fullest part of the hips", required: true },
  { key: "thighCircumference", label: "Thigh Circumference", hint: "Around the fullest part of the upper thigh", required: true },
  { key: "waistToPantsLength", label: "Waist to Length", hint: "From waist down to the desired pants hem", required: true },
];

export const HEM_STYLE_OPTIONS = [
  {
    value: "Straight",
    title: "Straight",
    description: "Clean, simple finish; the fabric lies flat at the bottom without any fold.",
  },
  {
    value: "Folded Hem",
    title: "Folded Hem",
    description: "Bottom edge is folded inward and stitched for a structured finish.",
  },
] as const;

export const PRESSING_STYLE_OPTIONS = [
  {
    value: "Creased",
    title: "Creased",
    description: "A sharp pressed crease runs down each leg for a formal tailored look.",
  },
  {
    value: "Plain (No Crease)",
    title: "Plain (No Crease)",
    description: "Ironed smooth without a crease line for a relaxed finish.",
  },
] as const;

const FIELD_ALIASES: Record<string, string> = {
  shoulder: "shoulderWidth",
  shoulder_width: "shoulderWidth",
  arm_length: "armLength",
  torso_length: "torsoLength",
  bicep: "bicepCircumference",
  wrist: "wristCircumference",
  pants_waist: "pantsWaist",
  pants_hip: "pantsHip",
  hip: "hips",
  thigh: "thighCircumference",
  outseam: "waistToPantsLength",
  waist_to_pants_length: "waistToPantsLength",
  hem_style: "hemStyle",
  pressing_style: "pressingStyle",
  tailor_note: "tailorNote",
  measurement_details: "measurementDetails",
};

const FIELD_LABELS: Record<string, string> = {
  gender: "Gender",
  tailorNote: "Tailor Note",
  hemStyle: "Hem Style",
  pressingStyle: "Pressing (Iron) Style",
  ...Object.fromEntries([...TOP_MEASUREMENT_FIELDS, ...PANTS_MEASUREMENT_FIELDS].map((field) => [field.key, field.label])),
};

const META_KEYS = new Set([
  "id",
  "userId",
  "customerId",
  "label",
  "name",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "measurementId",
  "measurementDetails",
  "familyGroupId",
  "eventId",
  "productId",
  "userEmail",
  "user_email",
  "email",
]);

export function hasMeasurementValue(value: unknown) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function canonicalMeasurementKey(key: string) {
  return FIELD_ALIASES[key] ?? FIELD_ALIASES[key.replace(/_([a-z])/g, (_, char) => String(char).toUpperCase())] ?? key;
}

export function measurementFieldLabel(key: string) {
  const canonical = canonicalMeasurementKey(key);
  return FIELD_LABELS[canonical] ?? key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/\s+/g, " ").trim().replace(/^./, (char) => char.toUpperCase());
}

export function normalizeMeasurementRecord(values: Record<string, unknown> = {}) {
  return Object.entries(values).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const canonical = canonicalMeasurementKey(key);
    if ((canonical === "measurementDetails" || canonical === "measurement_details") && value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(acc, normalizeMeasurementRecord(value as Record<string, unknown>));
      return acc;
    }
    if (!META_KEYS.has(canonical) && hasMeasurementValue(value)) {
      acc[canonical] = value;
    }
    return acc;
  }, {});
}

export function measurementValue(values: Record<string, unknown> | null | undefined, key: string) {
  const normalized = normalizeMeasurementRecord(values ?? {});
  return normalized[key] ?? "";
}

export function measurementDisplayGroups(values: Record<string, unknown> = {}): MeasurementDisplayGroup[] {
  const normalized = normalizeMeasurementRecord(values);
  const used = new Set<string>();
  const group = (title: string, keys: string[]) => {
    const fields = keys
      .filter((key) => hasMeasurementValue(normalized[key]))
      .map((key) => {
        used.add(key);
        return [measurementFieldLabel(key), normalized[key]] as [string, unknown];
      });
    return fields.length ? { title, fields } : null;
  };
  const groups = [
    group("Profile", ["gender", "tailorNote"]),
    group(TOP_MEASUREMENT_TITLE, TOP_MEASUREMENT_FIELDS.map((field) => field.key)),
    group(PANTS_MEASUREMENT_TITLE, [...PANTS_MEASUREMENT_FIELDS.map((field) => field.key), "inseam"]),
    group("Style Selections", ["hemStyle", "pressingStyle"]),
  ].filter(Boolean) as MeasurementDisplayGroup[];
  const additional = Object.entries(normalized)
    .filter(([key, value]) => !used.has(key) && hasMeasurementValue(value))
    .map(([key, value]) => [measurementFieldLabel(key), value] as [string, unknown]);
  if (additional.length) groups.push({ title: "Additional Details", fields: additional });
  return groups;
}

export function measurementSnapshotFromStringValues(values: Record<string, string>, extras: Record<string, unknown> = {}) {
  const snapshot: Record<string, unknown> = { ...extras };
  for (const field of [...TOP_MEASUREMENT_FIELDS, ...PANTS_MEASUREMENT_FIELDS]) {
    if (hasMeasurementValue(values[field.key])) snapshot[field.key] = Number(values[field.key]);
  }
  return normalizeMeasurementRecord(snapshot);
}
