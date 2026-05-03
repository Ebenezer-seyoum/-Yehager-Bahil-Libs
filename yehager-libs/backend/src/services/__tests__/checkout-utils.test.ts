import { describe, expect, it } from "vitest";
import {
  buildCheckoutLines,
  computeTotals,
  generateOrderNumber,
  moneyToNumber,
  numberToMoney,
} from "../checkout-utils.js";

describe("checkout utils", () => {
  it("converts money values consistently", () => {
    expect(moneyToNumber("12.50")).toBe(12.5);
    expect(numberToMoney(12.5)).toBe("12.50");
  });

  it("builds trusted checkout lines and totals", () => {
    const lines = buildCheckoutLines([
      {
        cartItemId: "item-1",
        productId: "product-1",
        productName: "Dress",
        quantity: 2,
        trustedUnitPriceUsd: "100.00",
      },
      {
        cartItemId: "item-2",
        productId: "product-2",
        productName: "Shawl",
        quantity: 1,
        trustedUnitPriceUsd: "30.00",
      },
    ]);

    expect(lines).toHaveLength(2);
    expect(lines[0]?.lineTotalUsd).toBe(200);
    expect(lines[1]?.lineTotalUsd).toBe(30);

    const totals = computeTotals(lines, 5);
    expect(totals.subtotalUsd).toBe(230);
    expect(totals.totalUsd).toBe(235);
  });

  it("generates order numbers with expected prefix", () => {
    const value = generateOrderNumber(new Date("2026-05-01T00:00:00Z"), 1234);
    expect(value).toBe("YH-20260501-1234");
  });
});
