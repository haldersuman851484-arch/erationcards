import { readdir } from "fs/promises";
import path from "path";

/**
 * Prerendered snapshot lookup for AI-search visibility (GEO).
 *
 * The portal build runs scripts/prerender.mjs, which captures the fully
 * rendered HTML of every public route into <publicDir>/prerendered/. AI
 * crawlers (GPTBot, PerplexityBot, ClaudeBot) do not execute JavaScript, so
 * the SPA shell is invisible to them — these snapshots are what they read.
 *
 * Prices inside the snapshots are %%PRICE_*%% tokens; app.ts substitutes the
 * live admin-edited matrix on every request, so snapshots are never stale.
 */

/**
 * Normalizes a request path for snapshot lookup: collapses trailing slashes
 * (except for "/") and rejects anything that is not a plain route made of
 * letters, digits, hyphens and slashes. Express does not decode req.path, so
 * traversal tricks like %2e%2e arrive percent-encoded and are rejected here.
 * Returns null when the path can never match a snapshot.
 */
export function normalizeRoutePath(reqPath: string): string | null {
  if (!reqPath.startsWith("/")) return null;
  let p = reqPath.replace(/\/+$/, "");
  if (p.length === 0) p = "/";
  if (!/^\/[a-zA-Z0-9\-/]*$/.test(p)) return null;
  if (p.includes("//")) return null;
  return p.toLowerCase();
}

async function collectHtmlFiles(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // directory absent (dev API server without a built portal)
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectHtmlFiles(abs, out);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(abs);
    }
  }
}

/**
 * Scans <publicDir>/prerendered and returns a route → absolute-file map:
 *   prerendered/index.html                   → "/"
 *   prerendered/faq.html                     → "/faq"
 *   prerendered/pvc-ration-card/kolkata.html → "/pvc-ration-card/kolkata"
 * Returns an empty map when the directory does not exist.
 */
export async function buildPrerenderMap(publicDir: string): Promise<Map<string, string>> {
  const root = path.join(publicDir, "prerendered");
  const files: string[] = [];
  await collectHtmlFiles(root, files);
  const map = new Map<string, string>();
  for (const abs of files) {
    const rel = path.relative(root, abs).split(path.sep).join("/");
    const route = rel === "index.html" ? "/" : `/${rel.replace(/\.html$/, "")}`;
    map.set(route.toLowerCase(), abs);
  }
  return map;
}
