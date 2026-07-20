import { describe, expect, it } from "vitest";
import { passwordMeetsPolicy, passwordPolicyChecks, strongPasswordSchema } from "../../lib/auth/password-policy.js";

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
});
