import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { buildPrerenderMap, normalizeRoutePath } from "./prerendered";

describe("normalizeRoutePath", () => {
  it("keeps simple routes and lowercases them", () => {
    expect(normalizeRoutePath("/")).toBe("/");
    expect(normalizeRoutePath("/faq")).toBe("/faq");
    expect(normalizeRoutePath("/FAQ")).toBe("/faq");
    expect(normalizeRoutePath("/pvc-ration-card/kolkata")).toBe("/pvc-ration-card/kolkata");
  });

  it("strips trailing slashes", () => {
    expect(normalizeRoutePath("/faq/")).toBe("/faq");
    expect(normalizeRoutePath("/faq///")).toBe("/faq");
    expect(normalizeRoutePath("//")).toBe("/");
  });

  it("rejects traversal and junk", () => {
    expect(normalizeRoutePath("/../etc/passwd")).toBeNull();
    expect(normalizeRoutePath("/faq/..")).toBeNull();
    expect(normalizeRoutePath("/%2e%2e/secret")).toBeNull();
    expect(normalizeRoutePath("/a b")).toBeNull();
    expect(normalizeRoutePath("/a//b")).toBeNull();
    expect(normalizeRoutePath("/index.html")).toBeNull();
    expect(normalizeRoutePath("")).toBeNull();
    expect(normalizeRoutePath("faq")).toBeNull();
  });
});

describe("buildPrerenderMap", () => {
  it("maps snapshot files to routes", async () => {
    const publicDir = await mkdtemp(path.join(tmpdir(), "prerender-test-"));
    const root = path.join(publicDir, "prerendered");
    await mkdir(path.join(root, "pvc-ration-card"), { recursive: true });
    await writeFile(path.join(root, "index.html"), "<html>home</html>");
    await writeFile(path.join(root, "faq.html"), "<html>faq</html>");
    await writeFile(path.join(root, "pvc-ration-card", "kolkata.html"), "<html>kolkata</html>");
    await writeFile(path.join(root, "notes.txt"), "not html — ignored");

    const map = await buildPrerenderMap(publicDir);
    expect(map.size).toBe(3);
    expect(map.get("/")).toBe(path.join(root, "index.html"));
    expect(map.get("/faq")).toBe(path.join(root, "faq.html"));
    expect(map.get("/pvc-ration-card/kolkata")).toBe(path.join(root, "pvc-ration-card", "kolkata.html"));
    expect(map.get("/notes")).toBeUndefined();
  });

  it("returns an empty map when the directory does not exist", async () => {
    const publicDir = await mkdtemp(path.join(tmpdir(), "prerender-none-"));
    const map = await buildPrerenderMap(publicDir);
    expect(map.size).toBe(0);
  });
});
