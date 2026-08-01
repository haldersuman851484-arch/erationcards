/**
 * Pre-upload Google index readiness audit.
 * Offline: sitemap<->snapshot parity, canonicals, titles/descriptions (presence
 * + uniqueness), noindex, JSON-LD validity, GEO token sanity (every %%TOKEN%%
 * used must have a server-side substitution), robots.txt, internal links.
 * Live: sitemap size, sample pages via Googlebot UA, robots status,
 * and "nothing on the live sitemap is dropped by the new build".
 * Run: node scripts/audit-index-readiness.mjs   (after build + prerender)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "dist/public";
const SITE = "https://erationcards.in";
const TODAY = new Date().toISOString().slice(0, 10);
const failures = [];
const warnings = [];

// ---------- 1. sitemap ----------
const sm = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const lastmods = [...sm.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
console.log("Sitemap URLs:", locs.length);
lastmods.forEach((d) => { if (d > TODAY) failures.push("sitemap lastmod in the future: " + d); });
const dup = locs.filter((l, i) => locs.indexOf(l) !== i);
if (dup.length) failures.push("duplicate sitemap URLs: " + dup.join(", "));
locs.forEach((l) => { if (l !== SITE + "/" && !l.startsWith(SITE + "/")) failures.push("foreign URL in sitemap: " + l); });

// ---------- 2. snapshots on disk ----------
const snapDir = path.join(ROOT, "prerendered");
const snaps = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : p.endsWith(".html") && snaps.push(p);
  }
})(snapDir);
const urlToSnap = (u) => {
  let p = u.replace(SITE, "").replace(/^\//, "").replace(/\/$/, "");
  return path.join(snapDir, p === "" ? "index.html" : p + ".html");
};
const expected = new Set(locs.map(urlToSnap));
locs.forEach((u) => { if (!fs.existsSync(urlToSnap(u))) failures.push("MISSING snapshot for " + u); });
snaps.forEach((s) => { if (!expected.has(s)) warnings.push("orphan snapshot not in sitemap: " + path.relative(snapDir, s)); });

// ---------- 3. per-snapshot checks ----------
const titles = new Map();
const descs = new Map();
const tokensUsed = new Set();
const pages = [];
for (const u of locs) {
  const f = urlToSnap(u);
  if (!fs.existsSync(f)) continue;
  const h = fs.readFileSync(f, "utf8");
  pages.push({ u, h });
  const canon = [...h.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const norm = u.replace(/\/$/, "");
  if (canon.length !== 1) failures.push(u + ": has " + canon.length + " canonical tags");
  else if (canon[0].replace(/\/$/, "") !== norm) failures.push(u + ": canonical points to " + canon[0]);
  const t = (h.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1] || "";
  if (!t.trim()) failures.push(u + ": missing <title>");
  titles.set(t, (titles.get(t) || []).concat(u));
  const d = (h.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/) || [])[1] || "";
  if (!d.trim()) failures.push(u + ": missing meta description");
  else descs.set(d, (descs.get(d) || []).concat(u));
  if (/<meta[^>]*noindex/i.test(h)) failures.push(u + ": has noindex!");
  if (!/<h1[\s>]/.test(h)) warnings.push(u + ": no <h1>");
  for (const m of h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { failures.push(u + ": INVALID JSON-LD: " + e.message.slice(0, 60)); }
  }
  for (const m of h.matchAll(/%%([A-Z0-9_]+)%%/g)) tokensUsed.add(m[1]);
  if (((h.match(/%%/g) || []).length) % 2 !== 0) warnings.push(u + ": odd number of %% markers");
}
for (const [t, us] of titles) if (us.length > 1) failures.push('duplicate title "' + t.slice(0, 55) + '" on: ' + us.map((x) => x.replace(SITE, "")).join(", "));
for (const [d, us] of descs) if (us.length > 1) failures.push("duplicate description on: " + us.map((x) => x.replace(SITE, "")).join(", "));

// ---------- 4. every token must be substitutable by the server ----------
let serverBlob = "";
for (const dir of ["/home/runner/workspace/artifacts/api-server/src", "/home/runner/workspace/lib"]) {
  (function walk2(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === "dist") continue;
      const p = path.join(d, e.name);
      e.isDirectory() ? walk2(p) : /\.(ts|mts|js|mjs)$/.test(e.name) && (serverBlob += fs.readFileSync(p, "utf8"));
    }
  })(dir);
}
console.log("GEO tokens used in snapshots:", [...tokensUsed].sort().join(", ") || "(none)");
for (const tk of tokensUsed) if (!serverBlob.includes(tk)) failures.push("token %%" + tk + "%% is NOT substituted by the server -> would show raw to Google");

// ---------- 5. robots.txt ----------
const robots = fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8");
if (!/Sitemap:\s*https:\/\/erationcards\.in\/sitemap\.xml/i.test(robots)) failures.push("robots.txt: sitemap line missing");
if (/^Disallow:\s*\/\s*$/m.test(robots)) failures.push("robots.txt BLOCKS THE ENTIRE SITE");
console.log("robots.txt Disallow lines:", (robots.match(/^Disallow:.*$/gm) || []).join(" | "));

// ---------- 6. internal discoverability ----------
for (const u of locs) {
  const rel = u.replace(SITE, "") || "/";
  if (rel === "/") continue;
  let n = 0;
  for (const o of pages) { if (o.u === u) continue; if (o.h.includes('href="' + rel + '"')) { n++; break; } }
  if (n === 0) warnings.push("no internal link anywhere to " + rel + " (Google finds it via sitemap only)");
}

// ---------- 7. live site (Googlebot UA) ----------
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const get = (u) => fetch(u, { headers: { "user-agent": UA }, redirect: "manual", signal: AbortSignal.timeout(12000) });
try {
  const liveSm = await (await get(SITE + "/sitemap.xml")).text();
  const liveLocs = [...liveSm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  console.log("\nLIVE sitemap URLs:", liveLocs.length, "| new build:", locs.length);
  const localSet = new Set(locs);
  const dropped = liveLocs.filter((l) => !localSet.has(l));
  if (dropped.length) failures.push("live URLs MISSING from new build (would 404 after upload): " + dropped.join(", "));
  const samples = [SITE + "/", SITE + "/about", SITE + "/order", liveLocs.find((l) => l.includes("/guides/"))].filter(Boolean);
  for (const s of samples) {
    try {
      const r = await get(s);
      const b = await r.text();
      const c = (b.match(/rel="canonical"[^>]*href="([^"]+)"/) || [])[1] || "no-canonical";
      console.log("LIVE", r.status, s, "canonical:", c, c.replace(/\/$/, "") === s.replace(/\/$/, "") ? "OK" : "<-- CHECK");
    } catch (e) { console.log("LIVE ERR", s, e.message.slice(0, 50)); }
  }
  const lr = await get(SITE + "/robots.txt");
  console.log("LIVE robots.txt:", lr.status);
} catch (e) { console.log("live check skipped:", e.message.slice(0, 80)); }

// ---------- report ----------
console.log("\n================ RESULT ================");
console.log("FAILURES:", failures.length);
failures.forEach((f) => console.log("  ✗ " + f));
console.log("WARNINGS:", warnings.length);
warnings.forEach((w) => console.log("  ! " + w));
if (!failures.length) console.log("\n✅ Build is Google-index ready.");
process.exit(failures.length ? 1 : 0);
