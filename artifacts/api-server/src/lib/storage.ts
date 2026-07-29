/**
 * Simple GCS wrapper for server-side file uploads and serving.
 * Files are stored in PRIVATE_OBJECT_DIR and served via /api/uploads/:filename.
 */
import { Storage } from "@google-cloud/storage";
import type { Response } from "express";
import type { Readable } from "stream";

const SIDECAR = "http://127.0.0.1:1106";

const gcs = new Storage({
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

/** Upload a buffer to GCS. Throws if PRIVATE_OBJECT_DIR is not set. */
export async function uploadToStorage(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set — bucket not provisioned");
  const { bucketName, prefix } = parsePath(dir);
  const file = gcs.bucket(bucketName).file(gcsObjectName(prefix, filename));
  await file.save(buffer, { contentType, resumable: false });
}

/**
 * Delete an object. Returns "deleted" when removed, "missing" when it was
 * already gone (treated as success by callers freeing space). Any other
 * storage error is thrown so callers can decide what to do.
 */
export async function deleteFromStorage(filename: string): Promise<"deleted" | "missing"> {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set — bucket not provisioned");
  const { bucketName, prefix } = parsePath(dir);
  try {
    await gcs.bucket(bucketName).file(gcsObjectName(prefix, filename)).delete();
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
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) return sizes;
  const { bucketName, prefix } = parsePath(dir);
  const listPrefix = prefix ? `${prefix}/uploads/` : "uploads/";
  const [files] = await gcs.bucket(bucketName).getFiles({ prefix: listPrefix });
  for (const f of files) {
    const key = f.name.slice(listPrefix.length);
    if (key) sizes.set(key, Number(f.metadata?.size ?? 0));
  }
  return sizes;
}

/**
 * Read stream for a stored object WITHOUT an existence pre-check — callers
 * must have confirmed the key exists (e.g. via listStorageFileSizes). GCS
 * defers the actual request until the stream is first read, so creating many
 * of these up-front (for a ZIP queue) does not open many connections.
 */
export function storageReadStream(filename: string): Readable {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set — bucket not provisioned");
  const { bucketName, prefix } = parsePath(dir);
  return gcs.bucket(bucketName).file(gcsObjectName(prefix, filename)).createReadStream();
}

/** RFC 5987 percent-encoding for Content-Disposition filename* values. */
function encodeRFC5987(value: string): string {
  return encodeURIComponent(value).replace(
    /['()*!]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

/**
 * Stream a GCS object to an Express response.
 * Returns true if the file was found and streamed, false if not found.
 * When `downloadName` is given, a Content-Disposition header is sent so the
 * browser opens/saves the file under exactly that name.
 */
export async function serveFromStorage(
  filename: string,
  res: Response,
  downloadName?: string
): Promise<boolean> {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) return false;
  try {
    const { bucketName, prefix } = parsePath(dir);
    const file = gcs.bucket(bucketName).file(gcsObjectName(prefix, filename));
    const [exists] = await file.exists();
    if (!exists) return false;
    const [meta] = await file.getMetadata();
    res.setHeader(
      "Content-Type",
      (meta.contentType as string) || "application/octet-stream"
    );
    res.setHeader("Cache-Control", "private, max-age=86400");
    if (meta.size) res.setHeader("Content-Length", String(meta.size));
    if (downloadName) {
      // ASCII fallback for old browsers + RFC 5987 field carrying the exact
      // (possibly non-ASCII) original filename.
      const fallback = downloadName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${fallback}"; filename*=UTF-8''${encodeRFC5987(downloadName)}`
      );
    }
    file.createReadStream().pipe(res);
    return true;
  } catch {
    return false;
  }
}
