/**
 * SPA fallback status codes: unknown URLs must answer HTTP 404 (with the SPA
 * shell + X-Robots-Tag: noindex) so non-JS crawlers don't index mistyped
 * links as duplicate homepages, while every REAL client route — including
 * private, non-prerendered sections like /admin and /processing — keeps
 * answering 200.
 *
 * The production server reads public/index.html; tests stage a minimal shell
 * there when no real build is present (and clean it up afterwards).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { existsSync } from "fs";
import { mkdir, writeFile, rm } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import app from "../app";
import { CLIENT_ROUTE_PATTERNS } from "../lib/clientRoutes";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../../public");
const indexHtmlPath = path.join(publicDir, "index.html");

let createdIndexHtml = false;

beforeAll(async () => {
  if (!existsSync(indexHtmlPath)) {
    await mkdir(publicDir, { recursive: true });
    await writeFile(
      indexHtmlPath,
      "<!DOCTYPE html><html><head><title>test shell</title></head><body><div id=\"root\"></div></body></html>",
      "utf8",
    );
    createdIndexHtml = true;
  }
});

afterAll(async () => {
  if (createdIndexHtml) await rm(indexHtmlPath, { force: true });
});

/** Substitute plausible values for :params so we hit the live matcher. */
function concrete(pattern: string): string {
  return pattern
    .replace(":orderNumber", "1234567890")
    .replace(":district", "kolkata")
    .replace(":type", "general");
}

describe("SPA fallback 404 for unknown URLs", () => {
  it("answers 404 + noindex + the SPA shell for an unknown path", async () => {
    const res = await request(app).get("/definitely-not-a-page");
    expect(res.status).toBe(404);
    expect(res.headers["x-robots-tag"]).toBe("noindex");
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("<!DOCTYPE html>");
  });

  it("answers 404 for deep unknown paths and near-misses", async () => {
    for (const p of ["/faq/nope", "/admin", "/receipt", "/guides/does-not-exist", "/wp-login.php"]) {
      const res = await request(app).get(p);
      expect(res.status, p).toBe(404);
    }
  });

  it("answers 200 for every real client route (public + private, param routes included)", async () => {
    for (const pattern of CLIENT_ROUTE_PATTERNS) {
      const res = await request(app).get(concrete(pattern));
      expect(res.status, pattern).toBe(200);
      expect(res.headers["x-robots-tag"], pattern).toBeUndefined();
      expect(res.headers["content-type"], pattern).toContain("text/html");
    }
  });
});
