#!/usr/bin/env node
/**
 * submit-indexnow.mjs
 *
 * Submits every URL in the production sitemap to the IndexNow endpoint so
 * Bing (and every IndexNow-participating engine — which also feeds ChatGPT's
 * web search) re-crawls the site immediately after a deploy instead of on
 * its own schedule.
 *
 * The IndexNow key is a public, non-secret token. Ownership is proven by the
 * key file served at https://erationcards.in/<key>.txt — the file lives in
 * artifacts/ration-card-portal/public/ so both the Vite build and the
 * Hostinger deploy bundle serve it at the site root automatically.
 *
 * This script NEVER exits non-zero: a failed ping is only an optimization
 * loss, and must never break a deploy.
 *
 * Usage (from repo root):
 *   pnpm --filter @workspace/scripts run submit-indexnow
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const INDEXNOW_KEY = "752cb444e5d015f3e8ec9d4cf01e0dbb";
const HOST = "erationcards.in";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;
const SITEMAP_PATH = path.join(
  repoRoot,
  "artifacts",
  "ration-card-portal",
  "public",
  "sitemap.xml",
);

try {
  const sitemap = readFileSync(SITEMAP_PATH, "utf8");
  const urlList = [...sitemap.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(
    (m) => m[1],
  );

  if (urlList.length === 0) {
    console.warn("⚠ IndexNow: no <loc> entries found in sitemap.xml — nothing to submit.");
    process.exit(0);
  }

  console.log(`▶ IndexNow: submitting ${urlList.length} sitemap URL(s) for ${HOST}…`);

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });

  if (res.ok) {
    // 200 = OK, 202 = accepted (key validation pending) — both are success.
    console.log(`  ✅ IndexNow accepted the submission (HTTP ${res.status}).`);
  } else {
    const body = await res.text().catch(() => "");
    console.warn(
      `  ⚠ IndexNow submission rejected: HTTP ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 300)}` : ""}`,
    );
    console.warn("  Deploy is unaffected; search engines will still crawl on their own schedule.");
  }
} catch (err) {
  console.warn(`  ⚠ IndexNow submission failed: ${err?.message ?? err}`);
  console.warn("  Deploy is unaffected; search engines will still crawl on their own schedule.");
}

process.exit(0);
