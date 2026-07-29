import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import app from "../app";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

describe("canonical host redirect", () => {
  it("301-redirects www host to https://erationcards.in with same path (production)", async () => {
    process.env.NODE_ENV = "production";
    for (const path of ["/", "/faq", "/districts/kolkata"]) {
      const res = await request(app).get(path).set("Host", "www.erationcards.in");
      expect(res.status).toBe(301);
      expect(res.headers.location).toBe(`https://erationcards.in${path}`);
    }
  });

  it("preserves the query string on redirect", async () => {
    process.env.NODE_ENV = "production";
    const res = await request(app)
      .get("/faq?utm_source=x")
      .set("Host", "www.erationcards.in");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("https://erationcards.in/faq?utm_source=x");
  });

  it("301-redirects plain http on the canonical host (x-forwarded-proto)", async () => {
    process.env.NODE_ENV = "production";
    const res = await request(app)
      .get("/faq")
      .set("Host", "erationcards.in")
      .set("X-Forwarded-Proto", "http");
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("https://erationcards.in/faq");
  });

  it("does not redirect the canonical https host in production", async () => {
    process.env.NODE_ENV = "production";
    const res = await request(app)
      .get("/api/health")
      .set("Host", "erationcards.in")
      .set("X-Forwarded-Proto", "https");
    expect(res.status).not.toBe(301);
  });

  it("does not redirect in development", async () => {
    process.env.NODE_ENV = "test";
    const res = await request(app)
      .get("/api/health")
      .set("Host", "www.erationcards.in");
    expect(res.status).not.toBe(301);
  });
});
