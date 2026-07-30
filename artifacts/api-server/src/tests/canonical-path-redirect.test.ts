import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";
import { canonicalClientPath } from "../lib/clientRoutes";

// Case/trailing-slash variants of real client routes must 301 to the
// lowercase, no-trailing-slash canonical form so search engines never see
// /FAQ, /faq/ and /faq as three different pages.
describe("canonical path redirect", () => {
  it("301-redirects uppercase and trailing-slash variants to the canonical path", async () => {
    for (const [variant, canonical] of [
      ["/FAQ", "/faq"],
      ["/faq/", "/faq"],
      ["/FAQ/", "/faq"],
      ["/About", "/about"],
      ["/track///", "/track"],
      ["/Guides/download-e-ration-card", "/guides/download-e-ration-card"],
    ] as const) {
      const res = await request(app).get(variant);
      expect(res.status, variant).toBe(301);
      expect(res.headers.location, variant).toBe(canonical);
    }
  });

  it("preserves the query string on redirect", async () => {
    const res = await request(app).get("/FAQ/?utm_source=x&b=1");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/faq?utm_source=x&b=1");
  });

  it("keeps param-segment casing while canonicalizing static segments", async () => {
    const res = await request(app).get("/Receipt/ORD-123/");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("/receipt/ORD-123");
  });

  it("does not redirect the canonical form itself", async () => {
    for (const path of ["/faq", "/", "/track", "/receipt/ORD-123"]) {
      const res = await request(app).get(path);
      expect(res.status, path).not.toBe(301);
    }
  });

  it("does not redirect API routes or static-asset-like paths", async () => {
    for (const path of ["/api/health", "/API/health", "/assets/app.JS", "/robots.txt", "/FAQ.html"]) {
      const res = await request(app).get(path);
      expect(res.status, path).not.toBe(301);
    }
  });

  it("does not redirect unknown (non-client-route) paths", async () => {
    const res = await request(app).get("/No-Such-Page/");
    expect(res.status).not.toBe(301);
  });

  it("does not redirect non-GET methods", async () => {
    const res = await request(app).post("/FAQ");
    expect(res.status).not.toBe(301);
  });
});

describe("canonicalClientPath", () => {
  it("returns canonical form for variants and null for non-routes", () => {
    expect(canonicalClientPath("/FAQ")).toBe("/faq");
    expect(canonicalClientPath("/faq/")).toBe("/faq");
    expect(canonicalClientPath("/faq")).toBe("/faq");
    expect(canonicalClientPath("/")).toBe("/");
    expect(canonicalClientPath("/Receipt/ORD-9/")).toBe("/receipt/ORD-9");
    expect(canonicalClientPath("/api/orders")).toBeNull();
    expect(canonicalClientPath("//faq")).toBeNull();
    expect(canonicalClientPath("faq")).toBeNull();
  });
});
