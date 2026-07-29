import { defineConfig, type HtmlTagDescriptor, type Plugin, type ResolvedConfig } from "vite";
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

// Above-the-fold fonts to preload on every page. In dev these are served from
// /node_modules; in a production build the hashed asset URLs are looked up in
// the output bundle so the preload links never 404 on the published site.
const PRELOAD_FONTS = [
  "@fontsource/inter/files/inter-latin-400-normal.woff2",
  "@fontsource/inter/files/inter-latin-700-normal.woff2",
];

function fontPreloadPlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "font-preload",
    configResolved(resolved) {
      config = resolved;
    },
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const hrefs = PRELOAD_FONTS.map((file) => {
          if (ctx.bundle) {
            // Production build: find the hashed emitted asset for this font.
            const stem = path.basename(file, ".woff2");
            const asset = Object.keys(ctx.bundle).find(
              (key) => key.includes(stem) && key.endsWith(".woff2"),
            );
            if (!asset) {
              throw new Error(
                `font-preload: "${file}" was not emitted in the build output. ` +
                  "Is it still imported via src/index.css?",
              );
            }
            return config.base + asset;
          }
          // Dev server: node_modules files are served directly.
          return `${config.base}node_modules/${file}`;
        });
        const tags: HtmlTagDescriptor[] = hrefs.map((href) => ({
          tag: "link",
          attrs: {
            rel: "preload",
            as: "font",
            type: "font/woff2",
            crossorigin: true,
            href,
          },
          injectTo: "head",
        }));
        return tags;
      },
    },
  };
}

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
    fontPreloadPlugin(),
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
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
