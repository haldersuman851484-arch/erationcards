// Renders the raster brand icons (favicon-192.png, email-logo.png,
// apple-touch-icon.png) from the master vector public/favicon.svg.
// Run from the portal root: node scripts/render-logo-icons.mjs
// Verify afterwards: content bbox must cover the full mark, not a strip.
import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const svg = readFileSync("public/favicon.svg", "utf8");
const wrap = (bg, size) => `<!doctype html><html><head><style>
html,body{margin:0;padding:0;width:100%;height:100%;background:${bg};display:flex;align-items:center;justify-content:center}
svg{width:${size};height:${size};display:block}
</style></head><body>${svg}</body></html>`;

const executablePath = execSync("which chromium").toString().trim();
const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });

async function shot(html, w, h, omitBackground) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(html, { waitUntil: "networkidle" });
  const buf = await page.screenshot({ omitBackground });
  await page.close();
  return buf;
}

// Transparent, mark fills the canvas (same proportions as favicon.svg itself).
const icon192 = await shot(wrap("transparent", "100%"), 192, 192, true);
writeFileSync("public/favicon-192.png", icon192);
writeFileSync("public/email-logo.png", icon192);

// Solid white for iOS (composites transparency badly), slight inset.
const apple = await shot(wrap("#ffffff", "88%"), 180, 180, false);
writeFileSync("public/apple-touch-icon.png", apple);

await browser.close();
console.log("done");
