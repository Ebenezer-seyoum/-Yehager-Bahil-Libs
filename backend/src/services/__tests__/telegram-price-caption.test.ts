import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { composeTelegramCollage, designerEstimateCaption } from "../telegram-pricing-service.js";

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

  it("combines four product images into one square collage", async () => {
    const colors = ["#8b4513", "#d4a574", "#243b53", "#f7f1e3"];
    const images = await Promise.all(colors.map((color) => sharp({
      create: { width: 300, height: 500, channels: 3, background: color },
    }).jpeg().toBuffer()));
    const collage = await composeTelegramCollage(images);
    const metadata = await sharp(collage).metadata();
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(1200);
    expect(metadata.format).toBe("jpeg");
  });
});
