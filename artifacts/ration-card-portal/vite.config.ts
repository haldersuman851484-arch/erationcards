import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { applySeoPriceTokens, DEFAULT_PRICING } from "@workspace/pricing";

const isBuild = process.argv.includes("build");

const rawPort = process.env.PORT;
if (!isBuild && !rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}
const port = Number(rawPort ?? "3000");
if (!isBuild && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;
if (!isBuild && !basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

// NOTE: fonts are intentionally NOT preloaded. A metric-matched "Inter
// Fallback" @font-face in src/index.css paints text instantly with identical
// layout, and preloading the woff2 files was competing with the stylesheet
// for first-paint bandwidth on slow mobile connections (PageSpeed mobile).

/**
 * index.html states prices in meta tags and JSON-LD via %%PRICE_*%% tokens
 * (see @workspace/pricing seoPriceValues). In dev the tokens are substituted
 * here with the launch defaults so the page is always valid HTML. In a
 * production build the tokens are left in place ON PURPOSE: the API server
 * substitutes the live admin-edited prices every time it serves index.html,
 * so Google search snippets always match the current prices.
 */
function seoPriceTokensPlugin(): Plugin {
  return {
    name: "seo-price-tokens",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        if (ctx.bundle) return html; // production build: keep tokens for the server
        return applySeoPriceTokens(html, DEFAULT_PRICING);
      },
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    seoPriceTokensPlugin(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    // In dev the Express API server runs separately; proxy API and upload
    // requests so relative /api/… and /uploads/… paths resolve correctly.
    proxy: process.env.API_SERVER_URL
      ? {
          "/api": { target: process.env.API_SERVER_URL, changeOrigin: true },
          "/uploads": {
            target: process.env.API_SERVER_URL,
            changeOrigin: true,
          },
        }
      : undefined,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
