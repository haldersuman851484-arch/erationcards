import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { serveFromStorage } from "./lib/storage";
import { readFile } from "fs/promises";
import { applySeoPriceTokens } from "@workspace/pricing";
import { getPricingMatrix } from "./lib/settings";

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
    const { pricing } = await getPricingMatrix();
    res.send(applySeoPriceTokens(rawLlmsTxt, pricing));
  } catch {
    res.send(applySeoPriceTokens(rawLlmsTxt)); // default prices beat a 500
  }
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
      // Root-level files (robots.txt, sitemap.xml, images) keep the default
      // ETag revalidation since their names never change.
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
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
  const { pricing } = await getPricingMatrix();
  const key = JSON.stringify(pricing);
  if (!renderedIndexHtml || renderedIndexHtml.key !== key) {
    renderedIndexHtml = { key, html: applySeoPriceTokens(rawIndexHtml, pricing) };
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
  try {
    ({ pricing } = await getPricingMatrix());
  } catch {
    pricing = undefined; // default prices beat a 500
  }
  const key = pricing ? JSON.stringify(pricing) : "__default__";
  const hit = renderedSnapshots.get(file);
  if (hit && hit.key === key) return hit.html;
  const raw = await readFile(file, "utf8");
  const html = applySeoPriceTokens(raw, pricing);
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
      res.send(await renderSnapshot(snapshotFile));
      return;
    }
    const html = await renderIndexHtml();
    if (html === null) {
      res.status(404).json({ error: "Frontend build not found" });
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.send(html);
  } catch {
    // Never let a pricing/database hiccup take down the homepage: fall back
    // to the default launch prices if we have the file, else the raw file.
    res.setHeader("Cache-Control", "no-cache");
    if (rawIndexHtml !== null) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(applySeoPriceTokens(rawIndexHtml));
      return;
    }
    res.sendFile(path.join(publicDir, "index.html"));
  }
});

export default app;
