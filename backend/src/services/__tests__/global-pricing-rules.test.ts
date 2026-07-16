import { describe, expect, it } from "vitest";
import {
  calculateRolePricing,
  resolveGlobalPricingRuleValues,
} from "../global-pricing-rules.js";

describe("global role pricing rules", () => {
  const rules = resolveGlobalPricingRuleValues([]);

  it("uses the configured default values", () => {
    expect(rules).toMatchObject({
      woman_outfit_addition: 6500,
      men_full_set_addition: 6500,
      men_pants_base: 1700,
      men_pants_addition: 4000,
      men_top_addition: 4000,
      boy_pants_base: 1000,
    });
  });

  it("calculates every men's role from one Telegram estimate", () => {
    expect(calculateRolePricing({ customerType: "man", outfitOption: "full_set", telegramEstimateEtb: 8000, rules })).toMatchObject({ designerPriceEtb: 8000, markupAmountEtb: 6500, sellingPriceEtb: 14500 });
    expect(calculateRolePricing({ customerType: "man", outfitOption: "pants_only", telegramEstimateEtb: 8000, rules })).toMatchObject({ designerPriceEtb: 1700, markupAmountEtb: 4000, sellingPriceEtb: 5700 });
    expect(calculateRolePricing({ customerType: "man", outfitOption: "top_only", telegramEstimateEtb: 8000, rules })).toMatchObject({ designerPriceEtb: 6300, markupAmountEtb: 4000, sellingPriceEtb: 10300 });
  });

  it("calculates boys with the lower pants base", () => {
    expect(calculateRolePricing({ customerType: "boy", outfitOption: "pants_only", telegramEstimateEtb: 8000, rules })).toMatchObject({ designerPriceEtb: 1000, sellingPriceEtb: 5000 });
    expect(calculateRolePricing({ customerType: "boy", outfitOption: "top_only", telegramEstimateEtb: 8000, rules })).toMatchObject({ designerPriceEtb: 7000, sellingPriceEtb: 11000 });
  });

  it("adds one global amount for women and girls", () => {
    expect(calculateRolePricing({ customerType: "woman", outfitOption: "standard", telegramEstimateEtb: 4000, rules }).sellingPriceEtb).toBe(10500);
    expect(calculateRolePricing({ customerType: "girl", outfitOption: "standard", telegramEstimateEtb: 4000, rules }).sellingPriceEtb).toBe(10500);
  });

  it("rejects a full estimate below the configured pants base", () => {
    expect(() => calculateRolePricing({ customerType: "man", outfitOption: "top_only", telegramEstimateEtb: 1600, rules })).toThrow("at least 1,700 ETB");
  });
});
