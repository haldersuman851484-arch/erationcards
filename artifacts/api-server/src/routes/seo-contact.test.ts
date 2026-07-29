/**
 * Guards that the portal's contact mentions in index.html (LocalBusiness
 * JSON-LD telephone/email/streetAddress) and public/llms.txt stay live:
 * they must be %%CONTACT_*%% tokens that applyContactTokens can substitute,
 * with no literal default contact details left behind (those would go stale
 * the moment the admin edits the support details in Settings).
 *
 * Also unit-guards applyContactTokens itself: PHONE_E164 contains digits, so
 * the replacement regex must accept [A-Z0-9_] — a letters-only pattern once
 * left %%CONTACT_PHONE_E164%% raw in production HTML while every other token
 * substituted fine.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  applyContactTokens,
  contactTokenValues,
  DEFAULT_CONTACT,
  type ContactInfo,
} from "@workspace/contact";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORTAL_DIR = path.resolve(__dirname, "../../../ration-card-portal");
const indexHtml = readFileSync(path.join(PORTAL_DIR, "index.html"), "utf8");
const llmsTxt = readFileSync(path.join(PORTAL_DIR, "public/llms.txt"), "utf8");

const CUSTOM: ContactInfo = {
  phone: "+91 90000 11111",
  email: "care@example.in",
  address: "5 Test Lane, Kolkata 700002",
  city: "Howrah",
  hours: "Daily, 9 AM to 8 PM",
};

describe("contactTokenValues", () => {
  it("derives wa.me digits and E.164 phone from the display phone", () => {
    expect(contactTokenValues(CUSTOM)).toEqual({
      PHONE: "+91 90000 11111",
      PHONE_DIGITS: "919000011111",
      PHONE_E164: "+919000011111",
      EMAIL: "care@example.in",
      ADDRESS: "5 Test Lane, Kolkata 700002",
      CITY: "Howrah",
      HOURS: "Daily, 9 AM to 8 PM",
    });
  });
});

describe("applyContactTokens", () => {
  it("substitutes every token key, including digit-bearing PHONE_E164", () => {
    const allTokens = Object.keys(contactTokenValues(DEFAULT_CONTACT))
      .map((k) => `%%CONTACT_${k}%%`)
      .join(" | ");
    for (const contact of [DEFAULT_CONTACT, CUSTOM]) {
      const rendered = applyContactTokens(allTokens, contact);
      expect(rendered).not.toContain("%%CONTACT_");
      const v = contactTokenValues(contact);
      expect(rendered).toBe(
        [v.PHONE, v.PHONE_DIGITS, v.PHONE_E164, v.EMAIL, v.ADDRESS, v.CITY, v.HOURS].join(" | ")
      );
    }
  });

  it("leaves unknown placeholders untouched for test assertions", () => {
    expect(applyContactTokens("%%CONTACT_NOPE%% x", CUSTOM)).toBe("%%CONTACT_NOPE%% x");
  });
});

describe("index.html contact tokens", () => {
  it("uses tokens (not literal defaults) in the LocalBusiness JSON-LD", () => {
    expect(indexHtml).toContain('"telephone": "%%CONTACT_PHONE_E164%%"');
    expect(indexHtml).toContain('"email": "%%CONTACT_EMAIL%%"');
    expect(indexHtml).toContain('"streetAddress": "%%CONTACT_ADDRESS%%"');
    // literal defaults would go stale when the admin edits the details
    expect(indexHtml).not.toContain(DEFAULT_CONTACT.phone);
    expect(indexHtml).not.toContain(DEFAULT_CONTACT.email);
    expect(indexHtml).not.toContain(DEFAULT_CONTACT.address);
  });

  it("substitutes every contact token — no %%CONTACT_ leftovers", () => {
    for (const contact of [DEFAULT_CONTACT, CUSTOM]) {
      const rendered = applyContactTokens(indexHtml, contact);
      expect(rendered).not.toContain("%%CONTACT_");
    }
  });

  it("renders custom contact into valid JSON-LD", () => {
    const rendered = applyContactTokens(indexHtml, CUSTOM);
    expect(rendered).toContain('"telephone": "+919000011111"');
    expect(rendered).toContain('"email": "care@example.in"');
    expect(rendered).toContain('"streetAddress": "5 Test Lane, Kolkata 700002"');
    const blocks =
      rendered.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
    expect(blocks.length).toBeGreaterThanOrEqual(1);
    for (const block of blocks) {
      const json = block.replace(/<\/?script[^>]*>/g, "");
      expect(() => JSON.parse(json)).not.toThrow();
    }
  });
});

describe("llms.txt contact tokens", () => {
  it("uses tokens and substitutes them cleanly", () => {
    expect(llmsTxt).toContain("%%CONTACT_EMAIL%%");
    expect(llmsTxt).toContain("%%CONTACT_PHONE%%");
    expect(llmsTxt).not.toContain(DEFAULT_CONTACT.email);
    const rendered = applyContactTokens(llmsTxt, CUSTOM);
    expect(rendered).not.toContain("%%CONTACT_");
    expect(rendered).toContain("care@example.in, +91 90000 11111");
  });
});
