// Unit conversion helpers. Storage is always inches.
export const inchesToCm = (inches) => Math.round(inches * 2.54 * 10) / 10;
export const cmToInches = (cm) => Math.round((cm / 2.54) * 10) / 10;

// Format a stored (inches) measurement value for display in the active unit.
export const formatMeasurement = (inchValue, unit = "in") => {
  if (inchValue === null || inchValue === undefined || inchValue === "") return "—";
  const n = parseFloat(inchValue);
  if (isNaN(n)) return "—";
  if (unit === "cm") return `${inchesToCm(n)} cm`;
  return `${n}"`;
};