/**
 * Disk-backend tests for lib/storage — the mode used on self-hosted servers
 * (e.g. Hostinger) where PRIVATE_OBJECT_DIR is not set and files live under
 * UPLOADS_DIR. The GCS branch is covered indirectly by route tests that mock
 * @google-cloud/storage.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PassThrough } from "node:stream";
import type { Readable } from "node:stream";
import type { Response } from "express";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  deleteFromStorage,
  listStorageFileSizes,
  serveFromStorage,
  storageReadStream,
  uploadToStorage,
} from "./storage";

class FakeRes extends PassThrough {
  headers: Record<string, string> = {};
  setHeader(name: string, value: unknown): this {
    this.headers[name.toLowerCase()] = String(value);
    return this;
  }
}

function collect(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

describe("storage disk backend (no PRIVATE_OBJECT_DIR)", () => {
  let tmpDir: string;
  let savedPrivateDir: string | undefined;
  let savedUploadsDir: string | undefined;

  beforeEach(async () => {
    savedPrivateDir = process.env.PRIVATE_OBJECT_DIR;
    savedUploadsDir = process.env.UPLOADS_DIR;
    delete process.env.PRIVATE_OBJECT_DIR;
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "storage-disk-"));
    process.env.UPLOADS_DIR = tmpDir;
  });

  afterEach(async () => {
    if (savedPrivateDir === undefined) delete process.env.PRIVATE_OBJECT_DIR;
    else process.env.PRIVATE_OBJECT_DIR = savedPrivateDir;
    if (savedUploadsDir === undefined) delete process.env.UPLOADS_DIR;
    else process.env.UPLOADS_DIR = savedUploadsDir;
    await fsp.rm(tmpDir, { recursive: true, force: true });
  });

  it("uploads a nested key and serves it back with the right headers", async () => {
    const pdf = Buffer.from("%PDF-1.4 fake");
    await uploadToStorage("card-pdfs/ORD1/0/card.pdf", pdf, "application/pdf");

    const onDisk = await fsp.readFile(path.join(tmpDir, "card-pdfs", "ORD1", "0", "card.pdf"));
    expect(onDisk.equals(pdf)).toBe(true);

    const res = new FakeRes();
    const served = await serveFromStorage(
      "card-pdfs/ORD1/0/card.pdf",
      res as unknown as Response,
      "রেশন কার্ড.pdf" // Bengali download name must survive
    );
    expect(served).toBe(true);
    expect((await collect(res)).equals(pdf)).toBe(true);
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-length"]).toBe(String(pdf.length));
    expect(res.headers["content-disposition"]).toContain("filename*=UTF-8''");
    expect(res.headers["content-disposition"]).toContain(
      encodeURIComponent("রেশন কার্ড.pdf").replace(/['()*!]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    );
  });

  it("serves image screenshots with an inferred content type", async () => {
    await uploadToStorage("screenshot-1.jpg", Buffer.from("jpegbytes"), "image/jpeg");
    const res = new FakeRes();
    expect(await serveFromStorage("screenshot-1.jpg", res as unknown as Response)).toBe(true);
    await collect(res);
    expect(res.headers["content-type"]).toBe("image/jpeg");
    expect(res.headers["content-disposition"]).toBeUndefined();
  });

  it("returns false for a missing file", async () => {
    const res = new FakeRes();
    expect(await serveFromStorage("nope.jpg", res as unknown as Response)).toBe(false);
  });

  it("delete returns deleted then missing", async () => {
    await uploadToStorage("gone.pdf", Buffer.from("x"), "application/pdf");
    expect(await deleteFromStorage("gone.pdf")).toBe("deleted");
    expect(await deleteFromStorage("gone.pdf")).toBe("missing");
  });

  it("lists all files recursively with sizes, using forward-slash keys", async () => {
    await uploadToStorage("a.jpg", Buffer.from("12"), "image/jpeg");
    await uploadToStorage("card-pdfs/ORD9/1/x.pdf", Buffer.from("1234"), "application/pdf");
    const sizes = await listStorageFileSizes();
    expect(sizes.get("a.jpg")).toBe(2);
    expect(sizes.get("card-pdfs/ORD9/1/x.pdf")).toBe(4);
    expect(sizes.size).toBe(2);
  });

  it("returns an empty listing when the uploads dir does not exist yet", async () => {
    process.env.UPLOADS_DIR = path.join(tmpDir, "never-created");
    expect((await listStorageFileSizes()).size).toBe(0);
  });

  it("storageReadStream streams file contents", async () => {
    await uploadToStorage("stream-me.pdf", Buffer.from("streamed"), "application/pdf");
    const body = await collect(storageReadStream("stream-me.pdf"));
    expect(body.toString()).toBe("streamed");
  });

  it("rejects path-traversal and malformed keys on every operation", async () => {
    for (const bad of ["../evil.txt", "a/../../evil", "/etc/passwd", "a//b.pdf", "a\\b.pdf", "."]) {
      await expect(uploadToStorage(bad, Buffer.from("x"), "text/plain")).rejects.toThrow(
        /Invalid storage key/
      );
      const res = new FakeRes();
      expect(await serveFromStorage(bad, res as unknown as Response)).toBe(false);
      expect(await deleteFromStorage(bad)).toBe("missing");
      expect(() => storageReadStream(bad)).toThrow(/Invalid storage key/);
    }
    // Nothing escaped the uploads root
    expect(await fsp.readdir(tmpDir)).toEqual([]);
  });

  it("refuses to follow symlinks planted inside the uploads dir", async () => {
    const outside = await fsp.mkdtemp(path.join(os.tmpdir(), "storage-outside-"));
    try {
      const secret = path.join(outside, "secret.pdf");
      await fsp.writeFile(secret, "secret-bytes");
      // Leaf symlink → file outside the root
      await fsp.symlink(secret, path.join(tmpDir, "leaf.pdf"));
      // Intermediate directory symlink → directory outside the root
      await fsp.symlink(outside, path.join(tmpDir, "linkdir"), "dir");

      expect(await serveFromStorage("leaf.pdf", new FakeRes() as unknown as Response)).toBe(false);
      expect(
        await serveFromStorage("linkdir/secret.pdf", new FakeRes() as unknown as Response)
      ).toBe(false);
      expect(() => storageReadStream("leaf.pdf")).toThrow(/Invalid storage key/);
      expect(() => storageReadStream("linkdir/secret.pdf")).toThrow(/Invalid storage key/);
      await expect(
        uploadToStorage("leaf.pdf", Buffer.from("x"), "application/pdf")
      ).rejects.toThrow(/Invalid storage key/);
      await expect(
        uploadToStorage("linkdir/new.pdf", Buffer.from("x"), "application/pdf")
      ).rejects.toThrow(/Invalid storage key/);
      expect(await deleteFromStorage("leaf.pdf")).toBe("missing");
      expect(await deleteFromStorage("linkdir/secret.pdf")).toBe("missing");

      // Nothing outside was read, written, or deleted
      expect((await fsp.readFile(secret)).toString()).toBe("secret-bytes");
      expect(await fsp.readdir(outside)).toEqual(["secret.pdf"]);

      // Listing skips symlinked entries entirely
      await uploadToStorage("real.jpg", Buffer.from("ok"), "image/jpeg");
      const sizes = await listStorageFileSizes();
      expect([...sizes.keys()]).toEqual(["real.jpg"]);
    } finally {
      await fsp.rm(outside, { recursive: true, force: true });
    }
  });
});
