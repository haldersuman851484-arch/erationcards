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
const publicDir = path.resolve(__dirname, "../public");
app.use(express.static(publicDir, { index: false }));

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

// SPA fallback — send index.html (with live prices injected) for all non-API routes
app.get("/{*path}", async (_req, res) => {
  try {
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
    if (rawIndexHtml !== null) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(applySeoPriceTokens(rawIndexHtml));
      return;
    }
    res.sendFile(path.join(publicDir, "index.html"));
  }
});

export default app;
