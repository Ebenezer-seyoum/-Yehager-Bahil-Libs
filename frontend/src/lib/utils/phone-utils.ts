/**
 * Sanitizes and validates ISO2 country codes for flag lookups and telephone normalization.
 */
export function safeIso2(iso2?: string | null): string {
  if (!iso2) return "ET"; // Default to Ethiopia for this project context
  const sanitized = iso2.trim().toUpperCase();
  // Basic validation for ISO2 (2 capital letters)
  if (/^[A-Z]{2}$/.test(sanitized)) {
    return sanitized;
  }
  return "ET";
}
