#!/usr/bin/env node
// Inline the built stylesheet into every HTML file in dist/public (the Vite
// index.html shell + all prerendered GEO snapshots, guides included).
//
// Why: PSI mobile (slow-4G lantern model, 150ms RTT) charges the render-
// blocking /assets/index-*.css request ~2 round trips + its download before
// anything can paint — v8 measured FCP/LCP 3.1s on live with the <link>.
// Moving the CSS bytes into the HTML stream costs ~+22KB gz per page but
// removes the blocking request entirely, so the page can paint as soon as
// the HTML arrives (fonts already swap invisibly via "Inter Fallback").
//
// Lazy route chunks still load their own per-chunk CSS files at runtime —
// only <link rel="stylesheet"> tags pointing at /assets/*.css are inlined.
// The .css files stay in assets/ untouched (chunk preloading references them).
//
// Runs after `vite build` + `prerender` (see scripts/src/build-for-hostinger.mjs).
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "dist", "public");
if (!existsSync(pub)) {
  console.error("dist/public not found — run `pnpm run build` (+ prerender) first");
  process.exit(1);
}

const htmlFiles = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith(".html")) htmlFiles.push(full);
  }
})(pub);

// Third-party HTML (e.g. Google site verification) has no stylesheet link
// and must be left byte-identical.
const isOurShell = (html) => html.includes('id="root"') || html.includes("data-prerendered");

const cssCache = new Map();
const loadCss = (href) => {
  const rel = href.replace(/^\//, "");
  if (!cssCache.has(rel)) {
    cssCache.set(rel, readFileSync(path.join(pub, rel), "utf8").trim());
  }
  return cssCache.get(rel);
};

const LINK_RE = /<link\b[^>]*\brel="stylesheet"[^>]*>/g;
const TOKEN_RE = /%%[A-Z0-9_]+%%/g;
let pagesChanged = 0;
let tagsReplaced = 0;
let skipped = 0;

for (const file of htmlFiles) {
  const original = readFileSync(file, "utf8");
  if (!isOurShell(original)) {
    skipped++;
    continue;
  }
  const tokensBefore = (original.match(TOKEN_RE) || []).length;
  let count = 0;
  const html = original.replace(LINK_RE, (tag) => {
    const m = tag.match(/href="(\/assets\/[^"]+\.css)"/);
    if (!m) return tag; // external or non-asset stylesheet — leave untouched
    count++;
    return `<style>${loadCss(m[1])}</style>`;
  });
  if (count === 0) {
    throw new Error(`inline-css: no /assets/*.css stylesheet link found in ${file}`);
  }
  if ((html.match(TOKEN_RE) || []).length !== tokensBefore) {
    throw new Error(`inline-css: %%TOKEN%% count changed in ${file}`);
  }
  writeFileSync(file, html);
  pagesChanged++;
  tagsReplaced += count;
}

console.log(
  `inline-css: inlined stylesheets in ${pagesChanged} HTML file(s) (${tagsReplaced} link tag(s); ${skipped} non-app file(s) skipped).`,
);
