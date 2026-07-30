/**
 * File storage for uploaded payment screenshots and card PDFs.
 *
 * Two backends, chosen per call from the environment:
 *
 *  - Replit (PRIVATE_OBJECT_DIR set): Google Cloud Storage through Replit's
 *    credential sidecar. Used because Replit's local filesystem is ephemeral —
 *    files must survive restarts and redeploys.
 *
 *  - Self-hosted, e.g. Hostinger (PRIVATE_OBJECT_DIR not set): plain files on
 *    local disk under UPLOADS_DIR (default: <cwd>/uploads). The Replit
 *    credential sidecar does not exist off-Replit so GCS cannot work there,
 *    and a normal server's disk is persistent anyway.
 *
 * Storage keys are forward-slash relative paths like "screenshot-1.jpg" or
 * "card-pdfs/ORD1/0/card.pdf" and mean the same thing in both backends.
 */
import { Storage } from "@google-cloud/storage";
import type { Response } from "express";
import type { Readable } from "stream";
import { createReadStream, lstatSync } from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const SIDECAR = "http://127.0.0.1:1106";

/** Lazily constructed so disk-only hosts never touch GCS at all. */
let _gcs: Storage | null = null;
function gcsClient(): Storage {
  if (!_gcs) {
    _gcs = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${SIDECAR}/token`,
        type: "external_account",
        credential_source: {
          url: `${SIDECAR}/credential`,
          format: { type: "json", subject_token_field_name: "access_token" },
        },
        universe_domain: "googleapis.com",
      } as any,
      projectId: "",
    });
  }
  return _gcs;
}

/** Parse PRIVATE_OBJECT_DIR = "/<bucketId>" or "/<bucketId>/prefix" */
function parsePath(dir: string): { bucketName: string; prefix: string } {
  const clean = dir.replace(/^\//, "");
  const idx = clean.indexOf("/");
  if (idx === -1) return { bucketName: clean, prefix: "" };
  return { bucketName: clean.slice(0, idx), prefix: clean.slice(idx + 1) };
}

function gcsObjectName(prefix: string, filename: string): string {
  return prefix ? `${prefix}/uploads/${filename}` : `uploads/${filename}`;
}

// ── Local-disk backend (no PRIVATE_OBJECT_DIR → self-hosted) ──────────────

function usingDisk(): boolean {
  return !process.env.PRIVATE_OBJECT_DIR;
}

function uploadsRoot(): string {
  const configured = (process.env.UPLOADS_DIR ?? "").trim();
  return configured ? path.resolve(configured) : path.resolve(process.cwd(), "uploads");
}

/**
 * Map a storage key to an absolute path under the uploads root, or null when
 * the key is malformed or would escape the root (path traversal).
 */
function diskPathFor(key: string): string | null {
  if (!key || key.includes("\\") || key.includes("\0")) return null;
  const segments = key.split("/");
  if (segments.some((s) => !s || s === "." || s === "..")) return null;
  const root = uploadsRoot();
  const abs = path.resolve(root, ...segments);
  if (!abs.startsWith(root + path.sep)) return null;
  return abs;
}

/**
 * True when every existing path component of `abs` below the uploads root is
 * a real file/directory — not a symlink. A symlink planted inside the uploads
 * dir (e.g. via FTP/SSH or another compromised process) could otherwise
 * redirect reads, writes, or deletes outside the root. Components that do not
 * exist yet are fine (they are about to be created). The root itself MAY be a
 * symlink — that is the owner's own configuration choice.
 */
async function isSymlinkFree(abs: string): Promise<boolean> {
  const root = uploadsRoot();
  let cur = root;
  for (const seg of path.relative(root, abs).split(path.sep)) {
    cur = path.join(cur, seg);
    try {
      if ((await fsp.lstat(cur)).isSymbolicLink()) return false;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return true;
      throw err;
    }
  }
  return true;
}

/** Synchronous variant for the (sync) stream API. */
function isSymlinkFreeSync(abs: string): boolean {
  const root = uploadsRoot();
  let cur = root;
  for (const seg of path.relative(root, abs).split(path.sep)) {
    cur = path.join(cur, seg);
    try {
      if (lstatSync(cur).isSymbolicLink()) return false;
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return true;
      throw err;
    }
  }
  return true;
}

/**
 * GCS remembers the Content-Type given at upload; the disk backend infers it
 * from the file extension instead. Only types the app actually stores.
 */
const DISK_CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
};

async function walkDisk(dir: string, base: string, sizes: Map<string, number>): Promise<void> {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return;
    throw err;
  }
  // Note: Dirent reports symlinks as neither file nor directory, so
  // symlinked entries are skipped entirely — listing never leaves the root.
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDisk(full, base, sizes);
    } else if (entry.isFile()) {
      const st = await fsp.stat(full);
      sizes.set(path.relative(base, full).split(path.sep).join("/"), st.size);
    }
  }
}

// ── Public API (backend-agnostic) ─────────────────────────────────────────

/** Upload a buffer. Disk mode writes under UPLOADS_DIR; GCS mode needs PRIVATE_OBJECT_DIR. */
export async function uploadToStorage(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  if (usingDisk()) {
    const abs = diskPathFor(filename);
    if (!abs) throw new Error(`Invalid storage key: ${filename}`);
    if (!(await isSymlinkFree(abs))) throw new Error(`Invalid storage key (symlink): ${filename}`);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, buffer);
    return;
  }
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set — bucket not provisioned");
  const { bucketName, prefix } = parsePath(dir);
  const file = gcsClient().bucket(bucketName).file(gcsObjectName(prefix, filename));
  await file.save(buffer, { contentType, resumable: false });
}

/**
 * Delete an object. Returns "deleted" when removed, "missing" when it was
 * already gone (treated as success by callers freeing space). Any other
 * storage error is thrown so callers can decide what to do.
 */
export async function deleteFromStorage(filename: string): Promise<"deleted" | "missing"> {
  if (usingDisk()) {
    const abs = diskPathFor(filename);
    if (!abs) return "missing";
    if (!(await isSymlinkFree(abs))) return "missing";
    try {
      await fsp.unlink(abs);
      return "deleted";
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return "missing";
      throw err;
    }
  }
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set — bucket not provisioned");
  const { bucketName, prefix } = parsePath(dir);
  try {
    await gcsClient().bucket(bucketName).file(gcsObjectName(prefix, filename)).delete();
    return "deleted";
  } catch (err) {
    if ((err as { code?: number })?.code === 404) return "missing";
    throw err;
  }
}

/**
 * List every uploaded object once: storage key (the part after the uploads/
 * prefix, e.g. "screenshot-1.jpg" or "card-pdfs/ORD1/0/card.pdf") → size in
 * bytes. One listing call replaces thousands of per-file existence checks
 * when building an archive or estimating freed space.
 */
export async function listStorageFileSizes(): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();
  if (usingDisk()) {
    const root = uploadsRoot();
    await walkDisk(root, root, sizes);
    return sizes;
  }
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) return sizes;
  const { bucketName, prefix } = parsePath(dir);
  const listPrefix = prefix ? `${prefix}/uploads/` : "uploads/";
  const [files] = await gcsClient().bucket(bucketName).getFiles({ prefix: listPrefix });
  for (const f of files) {
    const key = f.name.slice(listPrefix.length);
    if (key) sizes.set(key, Number(f.metadata?.size ?? 0));
  }
  return sizes;
}

/**
 * Read stream for a stored object WITHOUT an existence pre-check — callers
 * must have confirmed the key exists (e.g. via listStorageFileSizes). Both
 * backends defer the actual open/request until the stream is first read, so
 * creating many of these up-front (for a ZIP queue) is cheap.
 */
export function storageReadStream(filename: string): Readable {
  if (usingDisk()) {
    const abs = diskPathFor(filename);
    if (!abs || !isSymlinkFreeSync(abs)) throw new Error(`Invalid storage key: ${filename}`);
    return createReadStream(abs);
  }
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set — bucket not provisioned");
  const { bucketName, prefix } = parsePath(dir);
  return gcsClient().bucket(bucketName).file(gcsObjectName(prefix, filename)).createReadStream();
}

/** RFC 5987 percent-encoding for Content-Disposition filename* values. */
function encodeRFC5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*!]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/**
 * ASCII fallback for old browsers + RFC 5987 field carrying the exact
 * (possibly non-ASCII, e.g. Bengali) original filename.
 */
function setDownloadHeader(res: Response, downloadName: string): void {
  const fallback = downloadName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${fallback}"; filename*=UTF-8''${encodeRFC5987(downloadName)}`
  );
}

/**
 * Stream a stored object to an Express response.
 * Returns true if the file was found and streamed, false if not found.
 * When `downloadName` is given, a Content-Disposition header is sent so the
 * browser opens/saves the file under exactly that name.
 */
export async function serveFromStorage(
  filename: string,
  res: Response,
  downloadName?: string
): Promise<boolean> {
  if (usingDisk()) {
    const abs = diskPathFor(filename);
    if (!abs) return false;
    if (!(await isSymlinkFree(abs))) return false;
    let st;
    try {
      st = await fsp.stat(abs);
    } catch {
      return false;
    }
    if (!st.isFile()) return false;
    res.setHeader(
      "Content-Type",
      DISK_CONTENT_TYPES[path.extname(abs).toLowerCase()] ?? "application/octet-stream"
    );
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.setHeader("Content-Length", String(st.size));
    if (downloadName) setDownloadHeader(res, downloadName);
    createReadStream(abs).pipe(res);
    return true;
  }

  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) return false;
  try {
    const { bucketName, prefix } = parsePath(dir);
    const file = gcsClient().bucket(bucketName).file(gcsObjectName(prefix, filename));
    const [exists] = await file.exists();
    if (!exists) return false;
    const [meta] = await file.getMetadata();
    res.setHeader(
      "Content-Type",
      (meta.contentType as string) || "application/octet-stream"
    );
    res.setHeader("Cache-Control", "private, max-age=86400");
    if (meta.size) res.setHeader("Content-Length", String(meta.size));
    if (downloadName) setDownloadHeader(res, downloadName);
    file.createReadStream().pipe(res);
    return true;
  } catch {
    return false;
  }
}
