import { describe, expect, it } from "vitest";
import {
  PASSWORD_MAX_LENGTH,
  passwordMeetsPolicy,
  passwordPolicyChecks,
  strongPasswordSchema,
  temporaryPasswordSchema,
} from "../../lib/auth/password-policy.js";

describe("password policy", () => {
  it("accepts a password with every required character class", () => {
    expect(passwordMeetsPolicy("Strong#Pass1")).toBe(true);
    expect(strongPasswordSchema.safeParse("Strong#Pass1").success).toBe(true);
  });

  it.each([
    ["Short1!", "length"],
    ["lowercase1!", "uppercase"],
    ["UPPERCASE1!", "lowercase"],
    ["NoNumber!", "number"],
    ["NoSpecial1", "special"],
  ])("rejects %s when %s is missing", (password, missingCheck) => {
    expect(passwordPolicyChecks(password)[missingCheck as keyof ReturnType<typeof passwordPolicyChecks>]).toBe(false);
    expect(strongPasswordSchema.safeParse(password).success).toBe(false);
  });

  it("allows an admin-issued employee temporary password without complexity rules", () => {
    expect(temporaryPasswordSchema.safeParse("1234").success).toBe(true);
    expect(strongPasswordSchema.safeParse("1234").success).toBe(false);
  });

  it("rejects empty, whitespace-only, and oversized temporary passwords", () => {
    expect(temporaryPasswordSchema.safeParse("").success).toBe(false);
    expect(temporaryPasswordSchema.safeParse("   ").success).toBe(false);
    expect(temporaryPasswordSchema.safeParse("a".repeat(PASSWORD_MAX_LENGTH + 1)).success).toBe(false);
  });
});
