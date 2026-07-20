export const PASSWORD_MIN_LENGTH = 8;

export function passwordPolicyChecks(password: string) {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function passwordMeetsPolicy(password: string) {
  return Object.values(passwordPolicyChecks(password)).every(Boolean);
}

export const PASSWORD_REQUIREMENTS = [
  { key: "length", label: "At least 8 characters" },
  { key: "uppercase", label: "At least one uppercase letter" },
  { key: "lowercase", label: "At least one lowercase letter" },
  { key: "number", label: "At least one number" },
  { key: "special", label: "At least one special character" },
] as const;
