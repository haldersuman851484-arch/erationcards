/**
 * Guards the SPA-fallback 404 allow-list.
 *
 * 1. CLIENT_ROUTE_PATTERNS must exactly mirror the <Route path="..."> patterns
 *    in the portal's App.tsx — so a newly added client route can never
 *    silently start returning 404 (this test fails until the list is updated).
 * 2. isClientRoute() matching semantics for static + param routes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CLIENT_ROUTE_PATTERNS, isClientRoute } from "./clientRoutes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_TSX = path.resolve(__dirname, "../../../ration-card-portal/src/App.tsx");

describe("CLIENT_ROUTE_PATTERNS ↔ App.tsx guard", () => {
  it("matches the <Route path> patterns in the portal router exactly", () => {
    const src = readFileSync(APP_TSX, "utf8");
    const routerPaths = [...src.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
    expect(routerPaths.length).toBeGreaterThan(10); // parser sanity — App.tsx format changed?
    expect(new Set(routerPaths).size).toBe(routerPaths.length);
    expect([...routerPaths].sort()).toEqual([...CLIENT_ROUTE_PATTERNS].sort());
  });
});

describe("isClientRoute", () => {
  it("accepts every static route pattern", () => {
    for (const p of CLIENT_ROUTE_PATTERNS.filter((r) => !r.includes(":"))) {
      expect(isClientRoute(p), p).toBe(true);
    }
  });

  it("accepts param routes with real-looking values", () => {
    for (const p of [
      "/receipt/1234567890",
      "/order-upload/1234567890",
      "/pvc-ration-card/kolkata",
      "/pvc-card/general",
      "/processing/shipping-label/1234567890",
      "/admin/shipping-label/1234567890",
    ]) {
      expect(isClientRoute(p), p).toBe(true);
    }
  });

  it("collapses trailing slashes and ignores case", () => {
    expect(isClientRoute("/faq/")).toBe(true);
    expect(isClientRoute("/FAQ")).toBe(true);
    expect(isClientRoute("/Pvc-Card/general/")).toBe(true);
  });

  it("rejects unknown paths", () => {
    for (const p of [
      "/no-such-page",
      "/faq/extra",
      "/receipt", // param route without its param
      "/receipt/123/extra",
      "/pvc-ration-card", // list page does not exist
      "/admin", // only /admin/login and /admin/dashboard exist
      "/operator",
      "/guides", // only the three specific guides exist
      "/guides/unknown-guide",
      "/index.php",
      "//faq",
      "faq",
    ]) {
      expect(isClientRoute(p), p).toBe(false);
    }
  });
});
