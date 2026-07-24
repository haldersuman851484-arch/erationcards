/**
 * Simple GCS wrapper for server-side file uploads and serving.
 * Files are stored in PRIVATE_OBJECT_DIR and served via /api/uploads/:filename.
 */
import { Storage } from "@google-cloud/storage";
import type { Response } from "express";

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
 * Stream a GCS object to an Express response.
 * Returns true if the file was found and streamed, false if not found.
 */
export async function serveFromStorage(
  filename: string,
  res: Response
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
    file.createReadStream().pipe(res);
    return true;
  } catch {
    return false;
  }
}
