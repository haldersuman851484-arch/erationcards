// Renders every raster brand icon from the master vector public/favicon.svg:
//   favicon-192.png, email-logo.png   192×192 transparent (Google: 48px multiple)
//   favicon-96.png, favicon-48.png    smaller 48px multiples per Google guideline
//   favicon.ico                       classic 16/32/48 multi-size fallback — some
//                                     crawlers/browsers request /favicon.ico blindly
//   apple-touch-icon.png              180×180, white bg, 88% inset (iOS composites
//                                     transparency badly)
// Run from the portal root: node scripts/render-logo-icons.mjs
// Every output is bbox-verified in-script so a cropped render can never ship
// again (2026-08-04 incident: icons contained only the top strip of the mark).
// NOTE: raw `chromium --headless --screenshot` renders BLANK pages on this box —
// keep using Playwright with the Nix chromium.
import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

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

// The mark must fill most of the canvas. Reference bbox for a good 192px
// render is ~160x133+16+35; the cropped incident produced 160x70 (h = 36%).
function verifyBbox(file, canvas, { whiteBg = false } = {}) {
  const cmd = whiteBg
    ? `magick ${file} -fuzz 8% -trim -format "%@" info:`
    : `magick ${file} -alpha extract -threshold 5% -format "%@" info:`;
  const bbox = execSync(cmd).toString().trim(); // e.g. "160x133+16+35"
  const m = bbox.match(/^(\d+)x(\d+)\+(\d+)\+(\d+)$/);
  if (!m) throw new Error(`${file}: unparseable content bbox "${bbox}"`);
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (w < canvas * 0.6 || h < canvas * 0.5) {
    throw new Error(`${file}: content bbox ${bbox} covers too little of the ${canvas}px canvas — icon is cropped`);
  }
  console.log(`  ✓ ${file}  bbox ${bbox} of ${canvas}px`);
}

// Transparent squares, mark fills the canvas (same proportions as the SVG).
for (const size of [192, 96, 48]) {
  const buf = await shot(wrap("transparent", "100%"), size, size, true);
  writeFileSync(`public/favicon-${size}.png`, buf);
  verifyBbox(`public/favicon-${size}.png`, size);
}
// email-logo.png is the same art as favicon-192.png (order emails reference it).
writeFileSync("public/email-logo.png", readFileSync("public/favicon-192.png"));

// Solid white for iOS, slight inset.
const apple = await shot(wrap("#ffffff", "88%"), 180, 180, false);
writeFileSync("public/apple-touch-icon.png", apple);
verifyBbox("public/apple-touch-icon.png", 180, { whiteBg: true });

await browser.close();

// Classic multi-size favicon.ico, downscaled from the 48px render.
const tmp = mkdtempSync(path.join(tmpdir(), "ico-"));
execSync(`magick public/favicon-48.png -resize 32x32 ${tmp}/32.png`);
execSync(`magick public/favicon-48.png -resize 16x16 ${tmp}/16.png`);
execSync(`magick ${tmp}/16.png ${tmp}/32.png public/favicon-48.png public/favicon.ico`);
rmSync(tmp, { recursive: true, force: true });
const frames = execSync("identify public/favicon.ico").toString().trim();
if (!/16x16/.test(frames) || !/32x32/.test(frames) || !/48x48/.test(frames)) {
  throw new Error(`favicon.ico is missing expected frames:\n${frames}`);
}
console.log(`  ✓ public/favicon.ico (16+32+48 frames)`);
console.log("done");
