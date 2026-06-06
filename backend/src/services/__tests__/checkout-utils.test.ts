import { describe, expect, it } from "vitest";
import {
  buildCheckoutLines,
  computeEmsShipping,
  computeEtbTotals,
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

  it("computes ETB totals from USD total and USD→ETB rate", () => {
    const out = computeEtbTotals(100, 150.25);
    expect(out.totalEtb).toBe("15025.00");
    expect(out.etbExchangeRate).toBe("150.2500");
  });

  it("preserves custom-design identity and quote metadata through checkout lines", () => {
    const [line] = buildCheckoutLines([
      {
        cartItemId: "custom-cart-item",
        productId: null,
        productName: "Custom Design - Habesha Kemis",
        quantity: 1,
        trustedUnitPriceUsd: "180.00",
        itemType: "custom_design",
        uploadedDesignId: "design-id",
        itemMetadata: {
          submission_number: "YBL-CD-1001",
          estimated_delivery_label: "30-40 days",
        },
      },
    ]);

    expect(line?.itemType).toBe("custom_design");
    expect(line?.uploadedDesignId).toBe("design-id");
    expect(line?.itemMetadata?.estimated_delivery_label).toBe("30-40 days");
    expect(line?.lineTotalUsd).toBe(180);
  });

  it("computes legacy EMS shipping by package size", () => {
    expect(computeEmsShipping(0)).toBe(0);
    expect(computeEmsShipping(1)).toBe(45);
    expect(computeEmsShipping(2)).toBe(100);
    expect(computeEmsShipping(5)).toBe(100);
    expect(computeEmsShipping(6)).toBe(145);
  });
});
