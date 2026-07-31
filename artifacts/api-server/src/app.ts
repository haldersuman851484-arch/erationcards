import express, { type Express, type NextFunction, type Request, type Response } from "express";
import compression from "compression";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { describeFetchError } from "./lib/email";
import { serveFromStorage } from "./lib/storage";
import { readFile } from "fs/promises";
import { applySeoPriceTokens } from "@workspace/pricing";
import { applyContactTokens } from "@workspace/contact";
import { getPricingMatrix, getContactInfo } from "./lib/settings";
import { securityHeaders } from "./lib/securityHeaders";
import { analyticsEnabled, analyticsLoaderJs, injectAnalytics } from "./lib/analytics";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// Warn at startup if Delhivery secrets are missing (non-fatal)
const DELHIVERY_REQUIRED = [
  "DELHIVERY_API_TOKEN", "DELHIVERY_PICKUP_LOCATION",
  "DELHIVERY_RETURN_NAME", "DELHIVERY_RETURN_PHONE", "DELHIVERY_RETURN_ADD",
  "DELHIVERY_RETURN_PIN", "DELHIVERY_RETURN_CITY", "DELHIVERY_RETURN_STATE",
];
const missingDelhivery = DELHIVERY_REQUIRED.filter(k => !process.env[k]);
if (missingDelhivery.length > 0) {
  console.warn(`[Delhivery] Missing secrets: ${missingDelhivery.join(", ")}. Dispatch endpoint will return 503 until configured. See DELHIVERY_SETUP.md.`);
}

// ── Boot-time outbound reachability check (production only) ───────────────
// Emails and courier booking both require outbound HTTPS. On Hostinger only
// stderr is reliably visible in Runtime Logs (pino's stdout JSON never
// surfaces there), so print one warn/error line per dependency at boot:
// "[NetCheck] …: reachable" or "[NetCheck] …: FAILED — <reason>". A failure
// here names the exact network error without needing SSH access. Responses
// like HTTP 401 still count as reachable — the probes carry no credentials
// on purpose; only the network path is being tested.
if (process.env.NODE_ENV === "production") {
  const netCheck = async (label: string, url: string): Promise<void> => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      console.warn(`[NetCheck] ${label}: reachable (HTTP ${res.status})`);
    } catch (err) {
      console.error(`[NetCheck] ${label}: FAILED — ${describeFetchError(err)}`);
    }
  };
  void netCheck("Resend email API", "https://api.resend.com/domains");
  void netCheck("Delhivery courier API", "https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=700001");
}

// ── Security headers & compression (every response) ───────────────────────
// Headers first so even redirects carry them; gzip/brotli-negotiated
// compression skips already-compressed payloads (images, PDFs, zips) via the
// default content-type filter.
app.use(securityHeaders);
app.use(compression());

// ── Canonical host redirect (production only) ─────────────────────────────
// Every canonical tag and the sitemap use https://erationcards.in, so any
// request that reaches the app via www.erationcards.in (or plain http, if
// Hostinger's edge ever forwards it) gets a permanent redirect to the one
// canonical address. This keeps search engines from splitting ranking
// signals across host/scheme variants. NODE_ENV is read per-request so
// tests can exercise the guard.
const CANONICAL_ORIGIN = "https://erationcards.in";
app.use((req: Request, res: Response, next) => {
  if (process.env.NODE_ENV !== "production") return next();
  const host = (req.headers.host ?? "").toLowerCase();
  const proto = String(req.headers["x-forwarded-proto"] ?? "https")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (host === "www.erationcards.in" || (host === "erationcards.in" && proto === "http")) {
    res.redirect(301, `${CANONICAL_ORIGIN}${req.originalUrl}`);
    return;
  }
  next();
});

// ── Canonical path redirect ───────────────────────────────────────────────
// The SPA fallback serves real client routes case-insensitively and with
// trailing slashes (/FAQ, /faq/ both render the FAQ page). To keep crawlers
// from indexing those as duplicates, any non-canonical casing/trailing-slash
// variant of a known client route 301-redirects to the lowercase,
// no-trailing-slash form (query string preserved). API routes and static
// assets never match a client route, so they pass through untouched.
app.use((req: Request, res: Response, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  const canonical = canonicalClientPath(req.path);
  if (canonical !== null && canonical !== req.path) {
    const qIndex = req.originalUrl.indexOf("?");
    const search = qIndex === -1 ? "" : req.originalUrl.slice(qIndex);
    res.redirect(301, `${canonical}${search}`);
    return;
  }
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (screenshots & PDFs) from cloud object storage
// Card PDFs live under per-order/per-card keys whose last segment is the
// customer's original filename; it is echoed back via Content-Disposition
// so viewing/saving the file keeps that exact name.
app.get(
  "/api/uploads/card-pdfs/:orderNumber/:cardIndex/:filename",
  async (req: Request, res: Response) => {
    const parts = [req.params.orderNumber, req.params.cardIndex, req.params.filename].map(
      (p) => (Array.isArray(p) ? p[0] : p)
    );
    if (
      parts.some(
        (p) => !p || p.includes("/") || p.includes("\\") || p.includes("..")
      )
    ) {
      res.status(400).end();
      return;
    }
    const [orderNumber, cardIndex, filename] = parts;
    res.setHeader("X-Content-Type-Options", "nosniff");
    const served = await serveFromStorage(
      `card-pdfs/${orderNumber}/${cardIndex}/${filename}`,
      res,
      filename
    );
    if (!served) {
      res.status(404).json({ error: "File not found" });
    }
  }
);

app.get("/api/uploads/:filename", async (req: Request, res: Response) => {
  const rawFilename = req.params.filename;
  const filename = Array.isArray(rawFilename) ? rawFilename[0] : rawFilename;
  // Basic safety check — no path traversal
  if (!filename || filename.includes("/") || filename.includes("..")) {
    res.status(400).end();
    return;
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  const served = await serveFromStorage(filename, res);
  if (!served) {
    res.status(404).json({ error: "File not found" });
  }
});

app.use("/api", router);

// Serve React frontend static files in production.
// index:false so "/" falls through to the SPA handler below, which injects
// the LIVE prices into index.html's %%PRICE_*%% SEO tokens (meta description,
// Open Graph, JSON-LD). This keeps Google search snippet prices in sync with
// the admin-edited pricing without a rebuild.
import { buildPrerenderMap, normalizeRoutePath } from "./lib/prerendered";
import { isClientRoute, canonicalClientPath } from "./lib/clientRoutes";

const publicDir = path.resolve(__dirname, "../public");

// ── /llms.txt — plain-text service summary for AI assistants ──────────────
// Served BEFORE express.static (with live price-token substitution) so the
// raw tokened file in public/ never reaches a crawler.
let rawLlmsTxt: string | null | undefined;
app.get("/llms.txt", async (_req, res) => {
  if (rawLlmsTxt === undefined) {
    try {
      rawLlmsTxt = await readFile(path.join(publicDir, "llms.txt"), "utf8");
    } catch {
      rawLlmsTxt = null;
    }
  }
  if (rawLlmsTxt === null) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  try {
    const [{ pricing }, { contact }] = await Promise.all([getPricingMatrix(), getContactInfo()]);
    res.send(applyContactTokens(applySeoPriceTokens(rawLlmsTxt, pricing), contact));
  } catch {
    res.send(applyContactTokens(applySeoPriceTokens(rawLlmsTxt))); // defaults beat a 500
  }
});
// ── First-party analytics loader (optional) ───────────────────────────────
// Exists only when GA4_MEASUREMENT_ID / CLARITY_PROJECT_ID are set on the
// host (see lib/analytics.ts) — external script tags only, so the CSP never
// needs 'unsafe-inline' for scripts.
app.get("/__analytics.js", (_req, res) => {
  if (!analyticsEnabled()) {
    res.status(404).type("text/plain").send("analytics not configured");
    return;
  }
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  // no-cache (revalidate) rather than TTL: the loader is ~300 bytes and this
  // keeps the documented promise that changing the IDs + restarting the app
  // takes effect immediately for returning browsers too.
  res.setHeader("Cache-Control", "no-cache");
  res.send(analyticsLoaderJs());
});

// Raw snapshots contain unsubstituted %%PRICE_*%% tokens — they are only
// ever served through the SPA fallback below (which injects live prices),
// never directly as static files.
app.use("/prerendered", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(
  express.static(publicDir, {
    index: false,
    setHeaders: (res, filePath) => {
      // Vite fingerprints everything under /assets (JS, CSS, fonts), so those
      // files can be cached forever — a page refresh reuses them instantly.
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        // Root-level files (favicons, robots.txt, sitemap.xml, opengraph.jpg)
        // keep their names across deploys, so cache them for an hour: repeat
        // visits skip the download, same-day changes still surface quickly.
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    },
  }),
);

let rawIndexHtml: string | null = null;
let renderedIndexHtml: { key: string; html: string } | null = null;

async function renderIndexHtml(): Promise<string | null> {
  if (rawIndexHtml === null) {
    try {
      rawIndexHtml = await readFile(path.join(publicDir, "index.html"), "utf8");
    } catch {
      return null; // no built frontend (dev API server) — behave like before (404)
    }
  }
  const [{ pricing }, { contact }] = await Promise.all([getPricingMatrix(), getContactInfo()]);
  const key = JSON.stringify([pricing, contact]);
  if (!renderedIndexHtml || renderedIndexHtml.key !== key) {
    renderedIndexHtml = { key, html: applyContactTokens(applySeoPriceTokens(rawIndexHtml, pricing), contact) };
  }
  return renderedIndexHtml.html;
}

// ── Prerendered snapshots (GEO) ────────────────────────────────────────────
// scripts/prerender.mjs captures the fully rendered HTML of every public
// route into public/prerendered/ at build time. AI crawlers (GPTBot,
// PerplexityBot, ClaudeBot) do not execute JavaScript, so these snapshots are
// what they read instead of the empty SPA shell; humans get the same HTML and
// React mounts on top of it. Prices inside are %%PRICE_*%% tokens substituted
// with the live matrix per request — snapshots never go stale.
let prerenderMapPromise: Promise<Map<string, string>> | null = null;
const renderedSnapshots = new Map<string, { key: string; html: string }>();

async function renderSnapshot(file: string): Promise<string> {
  let pricing: Awaited<ReturnType<typeof getPricingMatrix>>["pricing"] | undefined;
  let contact: Awaited<ReturnType<typeof getContactInfo>>["contact"] | undefined;
  try {
    [{ pricing }, { contact }] = await Promise.all([getPricingMatrix(), getContactInfo()]);
  } catch {
    pricing = undefined; // default prices/contact beat a 500
    contact = undefined;
  }
  const key = JSON.stringify([pricing ?? "__default__", contact ?? "__default__"]);
  const hit = renderedSnapshots.get(file);
  if (hit && hit.key === key) return hit.html;
  const raw = await readFile(file, "utf8");
  const html = applyContactTokens(applySeoPriceTokens(raw, pricing), contact);
  renderedSnapshots.set(file, { key, html });
  return html;
}

// SPA fallback — prerendered snapshot when one exists for the route,
// otherwise index.html (both with live prices injected).
app.get("/{*path}", async (req, res) => {
  try {
    if (!prerenderMapPromise) prerenderMapPromise = buildPrerenderMap(publicDir);
    const route = normalizeRoutePath(req.path);
    const snapshotFile = route === null ? undefined : (await prerenderMapPromise).get(route);
    if (snapshotFile !== undefined) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.send(injectAnalytics(await renderSnapshot(snapshotFile), req.path));
      return;
    }
    const html = await renderIndexHtml();
    if (html === null) {
      res.status(404).json({ error: "Frontend build not found" });
      return;
    }
    // Unknown path (no snapshot, not a real client route): answer HTTP 404 so
    // non-JS crawlers know the page does not exist, but still send the SPA
    // shell so humans get the friendly not-found page. X-Robots-Tag is belt
    // and braces for anything that treats soft errors leniently.
    if (!isClientRoute(req.path)) {
      res.status(404);
      res.setHeader("X-Robots-Tag", "noindex");
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.send(injectAnalytics(html, req.path));
  } catch {
    // Never let a pricing/database hiccup take down the homepage: fall back
    // to the default launch prices if we have the file, else the raw file.
    // Unknown paths still answer 404 here — isClientRoute() needs no
    // database, so an outage must not turn every mistyped URL into a
    // soft-200 homepage copy in the index.
    if (!isClientRoute(req.path)) {
      res.status(404);
      res.setHeader("X-Robots-Tag", "noindex");
    }
    res.setHeader("Cache-Control", "no-cache");
    if (rawIndexHtml !== null) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(injectAnalytics(applyContactTokens(applySeoPriceTokens(rawIndexHtml)), req.path));
      return;
    }
    res.sendFile(path.join(publicDir, "index.html"));
  }
});

// ── Last-resort error handler ──────────────────────────────────────────────
// Express 5 routes rejected promises here automatically. API paths answer
// JSON; everything else gets a small self-contained branded page — no
// database reads, no contact details (the broken dependency may be exactly
// those) and no external assets, so it renders under any failure mode.
const ERROR_PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Something went wrong · PVC Card Portal</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;background:#f8fafc;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
  .card{max-width:28rem;text-align:center}
  .badge{width:56px;height:56px;border-radius:16px;background:#0d9488;color:#fff;font-weight:700;font-size:26px;line-height:56px;margin:0 auto 20px}
  h1{font-size:1.35rem;margin:0 0 8px}
  p{color:#475569;line-height:1.6;margin:0 0 12px;font-size:.95rem}
  a.btn{display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:10px 24px;border-radius:10px;font-weight:600;margin-top:8px}
  .muted{font-size:.8rem;color:#94a3b8}
</style>
</head>
<body>
<div class="card">
  <div class="badge">P</div>
  <h1>Something went wrong on our side</h1>
  <p>The page could not be loaded right now. Please try again in a few minutes — any order you already placed, and its payment details, are safe.</p>
  <a class="btn" href="/">Back to home</a>
  <p class="muted" style="margin-top:16px">If this keeps happening, reach us via the Contact page from the home screen.</p>
</div>
</body>
</html>`;

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err, url: req.originalUrl }, "unhandled request error");
  if (res.headersSent) {
    next(err);
    return;
  }
  // Respect statuses attached by middleware (body-parser malformed-JSON →
  // 400, payload-too-large → 413, …) instead of flattening them to 500.
  const raw =
    (err as { status?: unknown })?.status ?? (err as { statusCode?: unknown })?.statusCode;
  const status = typeof raw === "number" && raw >= 400 && raw < 600 ? raw : 500;
  res.status(status);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.path === "/api" || req.path.startsWith("/api/")) {
    res.json({
      error:
        status < 500 && err instanceof Error && err.message ? err.message : "Internal server error",
    });
    return;
  }
  if (status < 500) {
    res.type("text/plain").send("The request could not be processed. Please go back and try again.");
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(ERROR_PAGE_HTML);
});

export default app;
