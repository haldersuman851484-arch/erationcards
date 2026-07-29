#!/usr/bin/env node
/**
 * prerender.mjs — build-time HTML snapshots for AI search visibility (GEO).
 *
 * AI crawlers (GPTBot, PerplexityBot, ClaudeBot …) do not execute JavaScript,
 * so the SPA would serve them a nearly empty shell. This script loads every
 * PUBLIC route of the BUILT portal (dist/public) in headless Chromium and
 * captures the fully rendered HTML into dist/public/prerendered/. The API
 * server serves those snapshots on the matching routes — crawlers get real
 * content, humans get the same HTML with React mounting on top.
 *
 * Prices: an init script sets window.__PRERENDER_TOKENS__, which makes
 * usePricing() return TOKEN_PRICING (%%PRICE_*%% strings) instead of numbers,
 * so the captured HTML contains tokens. The API server substitutes the LIVE
 * admin-edited prices into them on every request — snapshots never go stale.
 *
 * Run automatically by scripts/src/build-for-hostinger.mjs after vite build.
 * Escape hatch: PRERENDER_SKIP=1 (deploy then loses AI-crawler visibility).
 */
import { createServer } from "node:http";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portalDir = path.resolve(__dirname, "..");
const distDir = path.join(portalDir, "dist", "public");
const outDir = path.join(distDir, "prerendered");

if (process.env.PRERENDER_SKIP === "1") {
  console.warn("⚠️  PRERENDER_SKIP=1 — skipping prerender. AI crawlers will only see the empty SPA shell!");
  process.exit(0);
}

// ── Route list: static public pages + the 23 district pages ───────────────
// Private routes (admin, operator dashboard, processing, receipts, uploads)
// are deliberately NOT prerendered — they keep the plain SPA shell and are
// disallowed in robots.txt.
const STATIC_ROUTES = [
  "/",
  "/order",
  "/track",
  "/download",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/refund",
  "/shipping",
  "/guides/download-e-ration-card",
  "/guides/ration-card-types-west-bengal",
  "/guides/lost-ration-card-west-bengal",
];
const districtSrc = readFileSync(path.join(portalDir, "src", "pages", "DistrictPage.tsx"), "utf8");
const districtSlugs = [...districtSrc.matchAll(/^\s+slug: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);
if (districtSlugs.length < 20) {
  throw new Error(`district slug parser found only ${districtSlugs.length} slugs — DistrictPage.tsx format changed?`);
}
const cardTypeSrc = readFileSync(path.join(portalDir, "src", "pages", "CardTypePage.tsx"), "utf8");
const cardTypeSlugs = [...cardTypeSrc.matchAll(/^\s+slug: "([a-z0-9-]+)",$/gm)].map((m) => m[1]);
if (cardTypeSlugs.length < 8) {
  throw new Error(`card-type slug parser found only ${cardTypeSlugs.length} slugs — CardTypePage.tsx format changed?`);
}
const ROUTES = [
  ...STATIC_ROUTES,
  ...districtSlugs.map((s) => `/pvc-ration-card/${s}`),
  ...cardTypeSlugs.map((s) => `/pvc-card/${s}`),
];

// ── Route inventory guard: the sitemap is the public-page source of truth ──
// Every sitemap URL must have a snapshot (or be knowingly excluded), and every
// prerendered route must be in the sitemap. Catches "added a page but forgot
// the other half" mistakes at build time instead of silently losing coverage.
const SITE_ORIGIN = "https://erationcards.in";
const SITEMAP_ONLY = new Set([
  // Indexed for operator recruitment, but it is an interactive signup form and
  // shows operator pricing (plain numbers in TOKEN_PRICING, not tokens) — a
  // snapshot would bake stale prices. Googlebot renders it via JS anyway.
  "/operator/register",
]);
const sitemapXml = readFileSync(path.join(portalDir, "public", "sitemap.xml"), "utf8");
const sitemapPaths = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1].trim()).pathname);
const routeSet = new Set(ROUTES);
const missingSnapshots = sitemapPaths.filter((p) => !routeSet.has(p) && !SITEMAP_ONLY.has(p));
const missingSitemap = ROUTES.filter((r) => !sitemapPaths.includes(r));
if (missingSnapshots.length > 0 || missingSitemap.length > 0) {
  if (missingSnapshots.length > 0)
    console.error(`❌ In sitemap but not prerendered (add to STATIC_ROUTES or SITEMAP_ONLY): ${missingSnapshots.join(", ")}`);
  if (missingSitemap.length > 0)
    console.error(`❌ Prerendered but missing from public/sitemap.xml: ${missingSitemap.join(", ")}`);
  process.exit(1);
}

// Routes whose copy includes prices — their snapshots MUST contain %%PRICE_*%%
// tokens. A missing token means a refactor baked literal numbers in and the
// live-price substitution silently died, so we fail the build.
const MUST_HAVE_TOKENS = new Set([
  "/",
  "/faq",
  // Guides quote the print price in their intros/FAQs/CTAs.
  ...STATIC_ROUTES.filter((r) => r.startsWith("/guides/")),
  ...districtSlugs.map((s) => `/pvc-ration-card/${s}`),
  // Card-type landing pages quote type-specific prices throughout.
  ...cardTypeSlugs.map((s) => `/pvc-card/${s}`),
]);

// ── Tiny static server for the built SPA (no API — react-query falls back) ─
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".json": "application/json",
  ".webmanifest": "application/json",
};

// Served index.html keeps its %%PRICE_*%% head tokens intact — they are
// harmless in the headless browser and must survive into the snapshots.
const indexHtml = await readFile(path.join(distDir, "index.html"), "utf8");

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url ?? "/", "http://prerender.local").pathname);
  if (urlPath.startsWith("/api/")) {
    // No backend during prerender: fail fast so react-query uses fallbacks.
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end("{}");
    return;
  }
  const filePath = path.join(distDir, urlPath);
  if (filePath === distDir || filePath.startsWith(distDir + path.sep)) {
    try {
      const st = await stat(filePath);
      if (st.isFile()) {
        res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] ?? "application/octet-stream" });
        createReadStream(filePath).pipe(res);
        return;
      }
    } catch {
      /* fall through to SPA fallback */
    }
  }
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(indexHtml);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;

// ── Headless Chromium (NixOS: use the system chromium, not the bundled one) ─
const executablePath =
  process.env.PRERENDER_CHROMIUM_PATH || execSync("which chromium").toString().trim();
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
const context = await browser.newContext({
  userAgent: "erationcards-prerender",
  viewport: { width: 1280, height: 900 },
});
await context.addInitScript(() => {
  window.__PRERENDER_TOKENS__ = true;
});

await rm(outDir, { recursive: true, force: true });

console.log(`Prerendering ${ROUTES.length} routes from http://127.0.0.1:${port} …`);
let failed = false;
for (const route of ROUTES) {
  const page = await context.newPage();
  try {
    await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    // App mounted (boot shell replaced) and real content rendered.
    await page.waitForFunction(
      () => {
        const root = document.getElementById("root");
        return !!root && !document.getElementById("boot-shell") && (root.innerText || "").trim().length > 200;
      },
      { timeout: 20000 },
    );
    await page.waitForTimeout(300); // let useEffect-injected JSON-LD settle

    const html = "<!DOCTYPE html>\n" + (await page.evaluate(() => document.documentElement.outerHTML));

    // ── Sanity checks: a broken snapshot is worse than no snapshot ──
    const problems = [];
    if (html.includes('id="boot-shell"')) problems.push("boot shell still present");
    if (MUST_HAVE_TOKENS.has(route) && !html.includes("%%PRICE_")) {
      problems.push("no %%PRICE_*%% tokens — prices got baked in as literals");
    }
    if (/NaN/.test(html)) problems.push("literal NaN in output");
    if (/\d%%PRICE_/.test(html)) problems.push("number concatenated with a price token");
    // Contact details: the head JSON-LD (every page) and the footer must carry
    // %%CONTACT_*%% tokens, and no snapshot may bake in the launch literals —
    // otherwise admin-edited contact details would go stale inside snapshots.
    if (!html.includes("%%CONTACT_PHONE") || !html.includes("%%CONTACT_EMAIL%%")) {
      problems.push("no %%CONTACT_*%% tokens — contact details got baked in as literals");
    }
    if (/96359\s?60507|help@erationcards\.in|26 Krishna Nibas/i.test(html)) {
      problems.push("literal default contact details in output — useContact() bypassed somewhere");
    }
    if (route === "/faq" && !html.includes('"FAQPage"')) problems.push("FAQPage JSON-LD missing");
    if (route.startsWith("/pvc-ration-card/")) {
      if (!html.includes('"FAQPage"')) problems.push("district FAQPage JSON-LD missing");
      if (!html.includes('"BreadcrumbList"')) problems.push("district BreadcrumbList JSON-LD missing");
    }
    if (route.startsWith("/guides/")) {
      if (!html.includes('"FAQPage"')) problems.push("guide FAQPage JSON-LD missing");
      if (!html.includes('"BreadcrumbList"')) problems.push("guide BreadcrumbList JSON-LD missing");
    }
    if (route.startsWith("/pvc-card/")) {
      if (!html.includes('"FAQPage"')) problems.push("card-type FAQPage JSON-LD missing");
      if (!html.includes('"BreadcrumbList"')) problems.push("card-type BreadcrumbList JSON-LD missing");
    }
    if (route === "/pvc-card/general") {
      // GENERAL prints have no government-issued source — the customer uploads
      // their own file, so the page must never claim a free official card exists.
      if (/issued free by the government|official card is free|card services are free/i.test(html)) {
        problems.push("GENERAL page contains free-government-card phrasing — keep copy conditional on officialUrl");
      }
    }
    // Canonical + og:url must point at the route itself — a page that kept
    // index.html's default "/" canonical would tell crawlers it is a duplicate
    // of the homepage and drop out of the index.
    const expectedCanonical = `${SITE_ORIGIN}${route}`;
    if (!html.includes(`rel="canonical" href="${expectedCanonical}"`)) problems.push(`canonical is not ${expectedCanonical}`);
    if (!html.includes(`property="og:url" content="${expectedCanonical}"`)) problems.push(`og:url is not ${expectedCanonical}`);
    if (problems.length > 0) throw new Error(problems.join("; "));

    const outFile = route === "/" ? path.join(outDir, "index.html") : path.join(outDir, `${route.slice(1)}.html`);
    await mkdir(path.dirname(outFile), { recursive: true });
    await writeFile(outFile, html, "utf8");
    console.log(`  ✓ ${route}  (${(html.length / 1024).toFixed(0)} KB)`);
  } catch (err) {
    failed = true;
    console.error(`  ✗ ${route}: ${err.message.split("\n")[0]}`);
  } finally {
    await page.close();
  }
}

await browser.close();
server.close();

if (failed) {
  console.error("\n❌ Prerender failed — fix the routes above (or PRERENDER_SKIP=1 to deploy without snapshots).");
  process.exit(1);
}
console.log(`\n✅ ${ROUTES.length} routes prerendered into ${path.relative(portalDir, outDir)}/`);
