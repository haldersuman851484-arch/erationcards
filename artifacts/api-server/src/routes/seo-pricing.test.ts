/**
 * Guards that the portal's index.html SEO price mentions (meta description,
 * Open Graph, JSON-LD FAQ/offers, priceRange) stay in sync with the live
 * pricing matrix: all price mentions must be %%PRICE_*%% tokens that
 * applySeoPriceTokens can substitute, with no literal prices left behind.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  applySeoPriceTokens,
  seoPriceValues,
  DEFAULT_PRICING,
  type PricingMatrix,
} from "@workspace/pricing";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_HTML_PATH = path.resolve(
  __dirname,
  "../../../ration-card-portal/index.html"
);
const indexHtml = readFileSync(INDEX_HTML_PATH, "utf8");

const CUSTOM: PricingMatrix = {
  ration: {
    single: { public: 91, operator: 81 },
    multi: { public: 61, operator: 51 },
  },
  special: {
    single: { public: 121, operator: 111 },
    multi: { public: 96, operator: 86 },
  },
};

describe("seoPriceValues", () => {
  it("derives public min/max and ration low/high from the matrix", () => {
    const v = seoPriceValues(CUSTOM);
    expect(v).toEqual({
      RATION_SINGLE: 91,
      RATION_MULTI: 61,
      SPECIAL_SINGLE: 121,
      SPECIAL_MULTI: 96,
      RATION_LOW: 61,
      RATION_HIGH: 91,
      PUBLIC_MIN: 61,
      PUBLIC_MAX: 121,
    });
  });
});

describe("index.html SEO price tokens", () => {
  it("contains price tokens (not literal prices) in the SEO surfaces", () => {
    expect(indexHtml).toContain("%%PRICE_PUBLIC_MIN%%");
    expect(indexHtml).toContain("%%PRICE_RATION_SINGLE%%");
    expect(indexHtml).toContain("%%PRICE_SPECIAL_MULTI%%");
    // priceRange must be tokenised
    expect(indexHtml).toContain('"priceRange": "₹%%PRICE_PUBLIC_MIN%%–₹%%PRICE_PUBLIC_MAX%%"');
  });

  it("substitutes every token — no %%PRICE_ leftovers with any valid matrix", () => {
    for (const matrix of [DEFAULT_PRICING, CUSTOM]) {
      const rendered = applySeoPriceTokens(indexHtml, matrix);
      expect(rendered).not.toContain("%%PRICE_");
    }
  });

  it("renders the live custom prices into meta tags and FAQ answers", () => {
    const rendered = applySeoPriceTokens(indexHtml, CUSTOM);
    expect(rendered).toContain("From ₹61 per card");
    expect(rendered).toContain("₹91 single / ₹61 each for 2+");
    expect(rendered).toContain("₹121 single / ₹96 each for 2+");
    expect(rendered).toContain('"priceRange": "₹61–₹121"');
    expect(rendered).toContain('"lowPrice": "61"');
    expect(rendered).toContain('"highPrice": "91"');
    expect(rendered).toContain("costs Rs 91 (inclusive of printing and delivery)");
    // every JSON-LD block must still be valid JSON after substitution
    const blocks = rendered.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
    expect(blocks.length).toBeGreaterThanOrEqual(4);
    for (const block of blocks) {
      const json = block.replace(/<\/?script[^>]*>/g, "");
      expect(() => JSON.parse(json)).not.toThrow();
    }
  });

  it("renders the default launch prices identically to the old static page", () => {
    const rendered = applySeoPriceTokens(indexHtml, DEFAULT_PRICING);
    expect(rendered).toContain("From ₹50 per card");
    expect(rendered).toContain('"priceRange": "₹50–₹100"');
    expect(rendered).toContain('"lowPrice": "50"');
    expect(rendered).toContain('"highPrice": "70"');
  });
});
