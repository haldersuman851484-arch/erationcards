// Post-deploy visual font check: loads a URL on an emulated Android phone
// under Lighthouse slow-4G throttling, samples the hero <h1> bounding rect
// every animation frame (to prove the fallback→Inter swap causes no visible
// jump/resize), captures early-load screenshot frames, and screenshots the
// Bengali testimonial region.
//
// NOTE (this box): local("Arial")/local("Liberation Sans") faces are NOT
// installed (DejaVu only), so the metric-matched "Inter Fallback" cannot
// apply here — any rect drift measured locally is a WORST CASE bound, and
// real Android/PSI devices will do better. See .agents/memory/perf-measurement-nixos.md
//
// Usage: CHROME_BIN=<chromium> node scripts/live-font-check.mjs <url> <outDir>
import { chromium } from "@playwright/test";
import fs from "node:fs";

const url = process.argv[2];
const outDir = process.argv[3];
if (!url || !outDir) {
  console.error("usage: live-font-check.mjs <url> <outDir>");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const ctx = await browser.newContext({
  viewport: { width: 412, height: 823 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  latency: 150,
  downloadThroughput: 209715,
  uploadThroughput: 98304,
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

await page.addInitScript(() => {
  window.__s = [];
  const loop = () => {
    try {
      const h1 = document.querySelector("h1");
      if (h1) {
        const r = h1.getBoundingClientRect();
        window.__s.push({
          t: Math.round(performance.now()),
          y: Math.round(r.y * 10) / 10,
          w: Math.round(r.width * 10) / 10,
          h: Math.round(r.height * 10) / 10,
          interLoaded: document.fonts ? document.fonts.check("700 16px Inter") : null,
        });
      }
    } catch (e) {}
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

const t0 = Date.now();
const nav = page.goto(url, { waitUntil: "load", timeout: 120000 }).catch((e) => {
  console.log("nav err:", String(e).slice(0, 120));
});
for (const t of [700, 1400, 2500, 7000]) {
  const d = t - (Date.now() - t0);
  if (d > 0) await page.waitForTimeout(d);
  await page
    .screenshot({ path: `${outDir}/t${t}.png` })
    .catch((e) => console.log("shot fail", t, String(e).slice(0, 80)));
}
await nav;
await page.waitForTimeout(1000);

const s = await page.evaluate(() => window.__s || []);
const changes = [];
for (let i = 1; i < s.length; i++) {
  const a = s[i - 1];
  const b = s[i];
  if (Math.abs(a.y - b.y) > 0.5 || Math.abs(a.h - b.h) > 0.5 || Math.abs(a.w - b.w) > 0.5)
    changes.push({ from: a, to: b });
}
const swapAt = s.find((x) => x.interLoaded)?.t ?? null;
console.log(
  JSON.stringify(
    {
      h1Samples: s.length,
      first: s[0],
      last: s[s.length - 1],
      interLoadedAt: swapAt,
      rectChanges: changes.slice(0, 8),
      rectChangeCount: changes.length,
    },
    null,
    1,
  ),
);

// Bengali text present + screenshot of that region
const bn = await page.evaluate(() => {
  const leaf = [...document.querySelectorAll("body *")].filter(
    (e) => e.children.length === 0 && /[\u0980-\u09FF]/.test(e.textContent || ""),
  );
  return leaf.slice(0, 3).map((e) => {
    const r = e.getBoundingClientRect();
    return { text: (e.textContent || "").trim().slice(0, 70), w: Math.round(r.width), h: Math.round(r.height) };
  });
});
console.log("bengaliEls:", JSON.stringify(bn));
await page.evaluate(() => {
  const el = [...document.querySelectorAll("body *")].find(
    (e) => e.children.length === 0 && /[\u0980-\u09FF]/.test(e.textContent || ""),
  );
  if (el) el.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${outDir}/bengali.png` }).catch((e) => console.log("bn shot fail", String(e).slice(0, 80)));

await browser.close();
