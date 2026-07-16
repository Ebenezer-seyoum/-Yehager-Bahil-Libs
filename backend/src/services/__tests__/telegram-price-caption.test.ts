import { describe, expect, it } from "vitest";
import { buildTelegramMediaGroup, designerEstimateCaption } from "../telegram-pricing-service.js";

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
    expect(caption).toContain("OROMO &amp; WOLLEGA TRADITIONAL OUTFIT");
    expect(caption).toContain("#PriceSubmitted");
    expect(caption).not.toContain("+ 6500");
    expect(caption).not.toContain("selling");
    expect(caption).not.toContain("markup");
  });

  it("uses professional approval and decline statuses", () => {
    expect(designerEstimateCaption(product, "approved")).toContain("#PriceApproved");
    expect(designerEstimateCaption(product, "declined")).toContain("#PriceDeclined");
  });

  it("builds a native Telegram media group without a collage", () => {
    const media = buildTelegramMediaGroup(["first.jpg", "second.jpg", "third.jpg", "fourth.jpg", "extra.jpg"], "Product caption");
    expect(media).toHaveLength(4);
    expect(media.map((item) => item.media)).toEqual(["first.jpg", "second.jpg", "third.jpg", "fourth.jpg"]);
    expect(media[0]).toMatchObject({ type: "photo", caption: "Product caption", parse_mode: "HTML" });
    expect(media[1]).not.toHaveProperty("caption");
  });

  it("filters empty image URLs", () => {
    const media = buildTelegramMediaGroup(["first.jpg", "", "second.jpg"], "Caption");
    expect(media.map((item) => item.media)).toEqual(["first.jpg", "second.jpg"]);
  });
});
