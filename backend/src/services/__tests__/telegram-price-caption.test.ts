import { describe, expect, it } from "vitest";
import { designerEstimateCaption } from "../telegram-pricing-service.js";

const product = {
  uniqueId: "ORO-WLG-001",
  name: "Oromo & Wollega Traditional Outfit - ORO-WLG-001",
  estimatedPrices: {
    men: 5000.01,
    woman: 5580,
    boy: 6542,
    girl: 524,
  },
};

describe("Telegram designer estimate caption", () => {
  it("shows only the submitted designer estimates", () => {
    const caption = designerEstimateCaption(product, "submitted");
    expect(caption).toContain("PRICE SUBMITTED");
    expect(caption).toContain("5,000.01 ETB");
    expect(caption).toContain("5,580 ETB");
    expect(caption).toContain("6,542 ETB");
    expect(caption).toContain("524 ETB");
    expect(caption).toContain("Oromo &amp; Wollega Traditional Outfit");
    expect(caption).not.toContain("+ 6500");
    expect(caption).not.toContain("selling");
    expect(caption).not.toContain("markup");
  });

  it("uses professional approval and decline statuses", () => {
    expect(designerEstimateCaption(product, "approved")).toContain("Approved by admin");
    expect(designerEstimateCaption(product, "declined")).toContain("Please review and submit the four estimates again");
  });
});
