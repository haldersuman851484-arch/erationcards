#!/usr/bin/env node
/**
 * audit-live-seo.mjs — read-only indexing audit of the LIVE site.
 *
 * Fetches the live sitemap, then every URL in it (no JS execution — this is
 * exactly what a crawler's first fetch sees) and checks:
 *   • HTTP 200, no redirect
 *   • self-referencing <link rel="canonical"> and og:url
 *   • unique, present <title> and meta description
 *   • meta robots does not say noindex
 *   • real content without JavaScript (visible text length, h1 present)
 *   • no %%PRICE_*%% / %%CONTACT_*%% token leaks (server must substitute)
 *   • every <script type="application/ld+json"> parses; FAQPage/BreadcrumbList
 *     present per route class (mirrors prerender.mjs assertions)
 *   • internal-link BFS from home: every sitemap page reachable, and how deep
 *
 * Usage: node scripts/src/audit-live-seo.mjs [origin]   (default https://erationcards.in)
 * Read-only: makes GET requests only. Exit 1 on hard failures.
 *
 * Note: Hostinger's CDN sometimes bot-screens datacenter IPs with a 403
 * interstitial — the script retries with different user agents; a persistent
 * 403 on EVERY page is an environment artifact, not a site failure.
 */

const ORIGIN = (process.argv[2] || "https://erationcards.in").replace(/\/$/, "");

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const BOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function fetchOnce(url, ua) {
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": ua, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(20000),
    });
    const body = await res.text();
    return {
      status: res.status,
      body,
      location: res.headers.get("location"),
      xRobots: res.headers.get("x-robots-tag"),
    };
  } catch (err) {
    return { status: 0, note: String(err.message || err).slice(0, 80) };
  }
}

async function fetchPage(url, ua) {
  let last = { status: 0, note: "no attempt" };
  for (let attempt = 0; attempt < 3; attempt++) {
    last = await fetchOnce(url, ua);
    if (last.status === 200) return last;
    if (last.status >= 300 && last.status < 400) return last; // redirect: no point retrying
    if (last.status !== 0 && last.status !== 403 && last.status !== 429 && last.status < 500) return last;
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
  }
  return last;
}

// ── crude-but-honest HTML extraction (no deps) ────────────────────────────
const get = (re, html) => (html.match(re) || [])[1]?.trim();
function extract(html) {
  const title = get(/<title[^>]*>([\s\S]*?)<\/title>/i, html);
  const desc = get(/<meta\s+name="description"\s+content="([^"]*)"/i, html) ??
    get(/<meta\s+content="([^"]*)"\s+name="description"/i, html);
  const canonical = get(/<link\s+rel="canonical"\s+href="([^"]*)"/i, html) ??
    get(/<link\s+href="([^"]*)"\s+rel="canonical"/i, html);
  const ogUrl = get(/<meta\s+property="og:url"\s+content="([^"]*)"/i, html) ??
    get(/<meta\s+content="([^"]*)"\s+property="og:url"/i, html);
  const robots = get(/<meta\s+name="robots"\s+content="([^"]*)"/i, html) ??
    get(/<meta\s+content="([^"]*)"\s+name="robots"/i, html);
  const h1Count = (html.match(/<h1[\s>]/gi) || []).length;

  const ldBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const ldTypes = [];
  const ldErrors = [];
  for (const block of ldBlocks) {
    try {
      const parsed = JSON.parse(block);
      const nodes = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
      for (const n of nodes) if (n && n["@type"]) ldTypes.push(...[].concat(n["@type"]));
    } catch (e) {
      ldErrors.push(String(e.message).slice(0, 60));
    }
  }

  // visible text: drop head/script/style/noscript, strip tags
  const bodyHtml = (html.split(/<body[^>]*>/i)[1] || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const text = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  const links = [...html.matchAll(/<a\s[^>]*href="([^"#]*)"/gi)]
    .map((m) => m[1])
    .filter((h) => h && !h.startsWith("mailto:") && !h.startsWith("tel:") && !h.startsWith("javascript:"));

  const tokenLeaks = [...new Set([...html.matchAll(/%%[A-Z0-9_]+%%/g)].map((m) => m[0]))];

  return { title, desc, canonical, ogUrl, robots, h1Count, ldTypes, ldErrors, textLen: text.length, links, tokenLeaks };
}

function normPath(href) {
  try {
    const u = new URL(href, ORIGIN);
    if (u.origin !== ORIGIN) return null;
    let p = u.pathname.replace(/\/+$/, "");
    return p === "" ? "/" : p;
  } catch {
    return null;
  }
}

// ── main ──────────────────────────────────────────────────────────────────
const smRes = await fetchPage(`${ORIGIN}/sitemap.xml`, BROWSER_UA);
if (smRes.status !== 200) {
  console.error(`FATAL: sitemap.xml → ${smRes.status} ${smRes.note ?? ""}`);
  process.exit(1);
}
const urls = [...smRes.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
console.log(`Auditing ${urls.length} sitemap URLs on ${ORIGIN}\n`);

const results = new Map(); // path -> {url, status, ex, issues, warns}
const CLASS = (p) =>
  p.startsWith("/pvc-ration-card/") ? "district" :
  p.startsWith("/pvc-card/") ? "cardtype" :
  p.startsWith("/guides/") ? "guide" :
  p === "/faq" ? "faq" : "static";

let i = 0;
const queue = [...urls];
async function worker() {
  while (queue.length) {
    const url = queue.shift();
    const p = normPath(url) ?? url;
    const r = await fetchPage(url, BROWSER_UA);
    const bot = await fetchPage(url, BOT_UA);
    const out = { url, status: r.status, issues: [], warns: [], ex: null };
    for (const [who, resp] of [["browser", r], ["Googlebot-UA", bot]]) {
      if (resp.xRobots && /noindex|none/i.test(resp.xRobots)) {
        out.issues.push(`X-Robots-Tag (${who}): ${resp.xRobots}`);
      }
    }
    if (r.status !== 200) {
      out.issues.push(`HTTP ${r.status}${r.location ? " → " + r.location : ""} (${r.note ?? ""})`);
    } else {
      const ex = extract(r.body);
      out.ex = ex;
      // ── bot/browser parity: a CDN could serve crawlers something else ──
      if (bot.status !== 200) {
        // Hostinger's CDN bot-screens some datacenter IPs — from this network
        // that is an env artifact; real verification is GSC URL Inspection.
        out.warns.push(`Googlebot-UA got HTTP ${bot.status} from this network (CDN bot screen likely — confirm via GSC URL Inspection)`);
      } else {
        const exBot = extract(bot.body);
        if (exBot.canonical !== ex.canonical) out.issues.push(`bot/browser canonical divergence: bot=${exBot.canonical}`);
        if (exBot.title !== ex.title) out.issues.push(`bot/browser title divergence: bot="${exBot.title?.slice(0, 60)}"`);
        if (exBot.desc !== ex.desc) out.issues.push("bot/browser description divergence");
        if ((exBot.robots ?? "") !== (ex.robots ?? "")) out.issues.push(`bot/browser robots divergence: bot=${exBot.robots}`);
        if (exBot.textLen < ex.textLen * 0.8) out.issues.push(`bot gets thinner content (${exBot.textLen} vs ${ex.textLen} chars)`);
      }
      if (ex.canonical !== url) out.issues.push(`canonical=${ex.canonical ?? "MISSING"}`);
      if (ex.ogUrl !== url) out.issues.push(`og:url=${ex.ogUrl ?? "MISSING"}`);
      if (!ex.title) out.issues.push("no <title>");
      if (!ex.desc) out.issues.push("no meta description");
      if (ex.robots && /noindex/i.test(ex.robots)) out.issues.push(`robots=${ex.robots}`);
      if (ex.tokenLeaks.length) out.issues.push(`TOKEN LEAK: ${ex.tokenLeaks.join(",")}`);
      if (ex.ldErrors.length) out.issues.push(`JSON-LD parse errors: ${ex.ldErrors.join("; ")}`);
      if (ex.textLen < 400) out.issues.push(`thin no-JS content (${ex.textLen} chars)`);
      if (ex.h1Count === 0) out.warns.push("no <h1>");
      if (ex.h1Count > 1) out.warns.push(`${ex.h1Count}×<h1>`);
      const cls = CLASS(p);
      const needFaq = ["district", "cardtype", "guide", "faq"].includes(cls);
      const needCrumbs = ["district", "cardtype", "guide"].includes(cls);
      if (needFaq && !ex.ldTypes.includes("FAQPage")) out.issues.push("FAQPage JSON-LD missing");
      if (needCrumbs && !ex.ldTypes.includes("BreadcrumbList")) out.issues.push("BreadcrumbList JSON-LD missing");
      if (ex.title && ex.title.length > 70) out.warns.push(`title ${ex.title.length} chars`);
      if (ex.desc && (ex.desc.length < 70 || ex.desc.length > 165)) out.warns.push(`desc ${ex.desc.length} chars`);
    }
    results.set(p, out);
    i++;
    process.stdout.write(`\r  fetched ${i}/${urls.length} `);
    await new Promise((r2) => setTimeout(r2, 150));
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log("\n");

// ── uniqueness ────────────────────────────────────────────────────────────
const byTitle = new Map();
const byDesc = new Map();
for (const [p, r] of results) {
  if (!r.ex) continue;
  if (r.ex.title) (byTitle.get(r.ex.title) ?? byTitle.set(r.ex.title, []).get(r.ex.title)).push(p);
  if (r.ex.desc) (byDesc.get(r.ex.desc) ?? byDesc.set(r.ex.desc, []).get(r.ex.desc)).push(p);
}
for (const [t, ps] of byTitle) if (ps.length > 1) for (const p of ps) results.get(p).issues.push(`duplicate title (×${ps.length}): "${t.slice(0, 60)}"`);
for (const [d, ps] of byDesc) if (ps.length > 1) for (const p of ps) results.get(p).issues.push(`duplicate description (×${ps.length}): "${d.slice(0, 50)}…"`);

// ── orphan BFS from home over crawler-visible links ───────────────────────
const depth = new Map([["/", 0]]);
let frontier = ["/"];
while (frontier.length) {
  const next = [];
  for (const p of frontier) {
    const r = results.get(p);
    if (!r?.ex) continue;
    for (const href of r.ex.links) {
      const np = normPath(href);
      if (np && !depth.has(np)) {
        depth.set(np, depth.get(p) + 1);
        if (results.has(np)) next.push(np);
      }
    }
  }
  frontier = next;
}
for (const [p, r] of results) {
  const d = depth.get(p);
  if (d === undefined) r.issues.push("ORPHAN: not reachable from home via <a> links");
  else if (d > 2) r.warns.push(`link depth ${d} (>2 clicks from home)`);
}

// ── report ────────────────────────────────────────────────────────────────
let hardFails = 0;
for (const [p, r] of results) {
  const flag = r.issues.length ? "✗" : r.warns.length ? "△" : "✓";
  if (r.issues.length) hardFails++;
  const parts = [...r.issues.map((x) => `ISSUE: ${x}`), ...r.warns.map((x) => `warn: ${x}`)];
  const d = depth.get(p);
  console.log(`${flag} ${p}  [d${d ?? "∞"}]${parts.length ? "\n    " + parts.join("\n    ") : ""}`);
}

console.log(`\n${results.size} pages | ${hardFails} with hard issues`);
const shellTitles = [...byTitle.entries()].filter(([, ps]) => ps.length > 1);
console.log(`unique titles: ${byTitle.size}, duplicate title groups: ${shellTitles.length}`);
console.log(`unique descriptions: ${byDesc.size}`);
const allTypes = new Set();
for (const [, r] of results) r.ex?.ldTypes.forEach((t) => allTypes.add(t));
console.log(`JSON-LD types seen: ${[...allTypes].join(", ")}`);
process.exit(hardFails ? 1 : 0);
