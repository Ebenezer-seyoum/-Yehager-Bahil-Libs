export const GLOBAL_PRICING_RULE_DEFINITIONS = [
  { ruleKey: "woman_outfit_addition", label: "Women's Outfit Addition", defaultValue: 6500 },
  { ruleKey: "men_full_set_addition", label: "Men's Full Set Addition", defaultValue: 6500 },
  { ruleKey: "men_pants_base", label: "Men's Pants Base Cost", defaultValue: 1700 },
  { ruleKey: "men_pants_addition", label: "Men's Pants Addition", defaultValue: 4000 },
  { ruleKey: "men_top_addition", label: "Men's Top Addition", defaultValue: 4000 },
  { ruleKey: "girl_outfit_addition", label: "Girls' Outfit Addition", defaultValue: 6500 },
  { ruleKey: "boy_full_set_addition", label: "Boys' Full Set Addition", defaultValue: 6500 },
  { ruleKey: "boy_pants_base", label: "Boys' Pants Base Cost", defaultValue: 1000 },
  { ruleKey: "boy_pants_addition", label: "Boys' Pants Addition", defaultValue: 4000 },
  { ruleKey: "boy_top_addition", label: "Boys' Top Addition", defaultValue: 4000 },
] as const;

export type GlobalPricingRuleKey = typeof GLOBAL_PRICING_RULE_DEFINITIONS[number]["ruleKey"];
export type GlobalPricingRuleValues = Record<GlobalPricingRuleKey, number>;

export const GLOBAL_PRICING_RULE_KEYS = GLOBAL_PRICING_RULE_DEFINITIONS.map(
  (rule) => rule.ruleKey,
) as [GlobalPricingRuleKey, ...GlobalPricingRuleKey[]];

export function resolveGlobalPricingRuleValues(
  rows: Array<{ ruleKey: string; markupAmountEtb: string | number }>,
): GlobalPricingRuleValues {
  const values = Object.fromEntries(
    GLOBAL_PRICING_RULE_DEFINITIONS.map((rule) => [rule.ruleKey, rule.defaultValue]),
  ) as GlobalPricingRuleValues;
  for (const row of rows) {
    if (!(row.ruleKey in values)) continue;
    const amount = Number(row.markupAmountEtb);
    if (Number.isFinite(amount) && amount >= 0) {
      values[row.ruleKey as GlobalPricingRuleKey] = amount;
    }
  }
  return values;
}

type CustomerType = "woman" | "man" | "girl" | "boy";
type OutfitOption = "standard" | "full_set" | "top_only" | "pants_only";

export function calculateRolePricing(input: {
  customerType: CustomerType;
  outfitOption?: OutfitOption;
  telegramEstimateEtb: number;
  rules: GlobalPricingRuleValues;
}) {
  const { customerType, telegramEstimateEtb, rules } = input;
  const outfitOption = input.outfitOption ?? "standard";
  if (!Number.isFinite(telegramEstimateEtb) || telegramEstimateEtb <= 0) {
    throw new Error("Telegram estimate must be greater than zero.");
  }

  if (customerType === "woman") {
    const addition = rules.woman_outfit_addition;
    return { designerPriceEtb: telegramEstimateEtb, markupAmountEtb: addition, sellingPriceEtb: telegramEstimateEtb + addition, pricingRuleKey: "woman_outfit_addition" as const };
  }
  if (customerType === "girl") {
    const addition = rules.girl_outfit_addition;
    return { designerPriceEtb: telegramEstimateEtb, markupAmountEtb: addition, sellingPriceEtb: telegramEstimateEtb + addition, pricingRuleKey: "girl_outfit_addition" as const };
  }

  const isMan = customerType === "man";
  const pantsBase = isMan ? rules.men_pants_base : rules.boy_pants_base;
  if (telegramEstimateEtb < pantsBase) {
    throw new Error(`${isMan ? "Men" : "Boys"} Telegram estimate must be at least ${pantsBase.toLocaleString()} ETB.`);
  }

  if (outfitOption === "pants_only") {
    const addition = isMan ? rules.men_pants_addition : rules.boy_pants_addition;
    return {
      designerPriceEtb: pantsBase,
      markupAmountEtb: addition,
      sellingPriceEtb: pantsBase + addition,
      pricingRuleKey: (isMan ? "men_pants_addition" : "boy_pants_addition") as GlobalPricingRuleKey,
    };
  }
  if (outfitOption === "top_only") {
    const designerPriceEtb = telegramEstimateEtb - pantsBase;
    const addition = isMan ? rules.men_top_addition : rules.boy_top_addition;
    return {
      designerPriceEtb,
      markupAmountEtb: addition,
      sellingPriceEtb: designerPriceEtb + addition,
      pricingRuleKey: (isMan ? "men_top_addition" : "boy_top_addition") as GlobalPricingRuleKey,
    };
  }

  const addition = isMan ? rules.men_full_set_addition : rules.boy_full_set_addition;
  return {
    designerPriceEtb: telegramEstimateEtb,
    markupAmountEtb: addition,
    sellingPriceEtb: telegramEstimateEtb + addition,
    pricingRuleKey: (isMan ? "men_full_set_addition" : "boy_full_set_addition") as GlobalPricingRuleKey,
  };
}
