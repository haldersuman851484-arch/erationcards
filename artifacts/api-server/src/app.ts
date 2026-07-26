import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { serveFromStorage } from "./lib/storage";

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

// Serve React frontend static files in production
const publicDir = path.resolve(__dirname, "../public");
app.use(express.static(publicDir));
// SPA fallback — send index.html for all non-API routes
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
