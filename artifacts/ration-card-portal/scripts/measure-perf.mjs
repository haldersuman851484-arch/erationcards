// Throttled mobile paint-metrics probe (Lighthouse "slow 4G" conditions).
// Lighthouse itself cannot paint on this machine's NixOS chromium (NO_FCP —
// paint/LCP trace events are emitted unreliably in headless), so this uses
// Playwright + CDP with the same throttling model and a rAF probe that
// watches the hero <h1>'s effective opacity:
//   textVisibleAt — first moment hero text is >50% visible (fade-aware FCP)
//   refadeAt      — a later drop below 30% (the React-mount re-fade that was
//                   resetting Speed Index; must be 0 after the fix)
//
// Usage: CHROME_BIN=<chromium> [SKIP_NAV=1] node scripts/measure-perf.mjs <url> [runs]
import { chromium } from "@playwright/test";

const url = process.argv[2];
const runs = Number(process.argv[3] ?? 3);
if (!url) {
  console.error("usage: measure-perf.mjs <url> [runs]");
  process.exit(1);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROME_BIN || undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

async function throttle(ctx, page) {
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  // Lighthouse mobile "slow 4G": 1.6 Mbps down / 0.75 Mbps up / 150 ms RTT, 4x CPU
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 209715,
    uploadThroughput: 98304,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

const PROBE = `
  window.__probe = { textVisibleAt: 0, refadeAt: 0 };
  (function loop() {
    try {
      var h1 = document.querySelector("h1");
      if (h1) {
        var op = 1, n = h1;
        while (n && n !== document.documentElement) {
          op *= parseFloat(getComputedStyle(n).opacity || "1");
          n = n.parentElement;
        }
        if (!window.__probe.textVisibleAt) {
          if (op > 0.5) window.__probe.textVisibleAt = Math.round(performance.now());
        } else if (op < 0.3 && !window.__probe.refadeAt) {
          window.__probe.refadeAt = Math.round(performance.now());
        }
      }
    } catch (e) {}
    requestAnimationFrame(loop);
  })();
`;

const mobileCtx = () =>
  browser.newContext({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
  });

const samples = [];
for (let i = 0; i < runs; i++) {
  const ctx = await mobileCtx();
  const page = await ctx.newPage();
  await page.addInitScript(PROBE);
  await throttle(ctx, page);
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(6000); // let React mount, fonts land, CLS settle
  const m = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const res = { ...window.__probe };
        for (const e of performance.getEntriesByType("paint")) {
          res[e.name === "first-contentful-paint" ? "fcp" : "fp"] = Math.round(e.startTime);
        }
        let cls = 0;
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value;
          }).observe({ type: "layout-shift", buffered: true });
        } catch (e) {}
        setTimeout(() => {
          res.cls = Math.round(cls * 1000) / 1000;
          res.pageEnterInDom = !!document.querySelector(".page-enter");
          const rs = performance.getEntriesByType("resource");
          res.totalKB = Math.round(rs.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024);
          res.waterfall = rs
            .slice()
            .sort((a, b) => a.startTime - b.startTime)
            .slice(0, 12)
            .map(
              (r) =>
                Math.round(r.startTime) +
                "-" +
                Math.round(r.responseEnd) +
                " " +
                Math.round((r.transferSize || 0) / 1024) +
                "k " +
                r.name.split("/").pop().split("?")[0].slice(0, 34),
            );
          resolve(res);
        }, 600);
      }),
  );
  samples.push(m);
  await ctx.close();
}

// Navigation behavior check (desktop viewport so header links are visible):
// the page-enter animation must still run for in-app navigations.
let navCheck = "skipped";
if (!process.env.SKIP_NAV) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(2500); // React mount (unthrottled)
  await page.evaluate(() => {
    window.__spaMarker = 1;
  });
  try {
    await page.click('header a[href*="/track"]', { timeout: 5000 });
    await page.waitForTimeout(800);
    const r = await page.evaluate(() => ({
      spa: window.__spaMarker === 1,
      pageEnter: !!document.querySelector(".page-enter"),
    }));
    // Browser Back to the INITIAL location must also animate (hasNavigated
    // latch in PageTransition is sticky — verify, don't assume).
    await page.goBack();
    await page.waitForTimeout(800);
    const b = await page.evaluate(() => ({
      spa: window.__spaMarker === 1,
      pageEnter: !!document.querySelector(".page-enter"),
    }));
    navCheck = !r.spa
      ? "inconclusive (full reload)"
      : r.pageEnter && b.spa && b.pageEnter
        ? "PASS (spa nav + back-to-initial both animated)"
        : `FAIL (nav animated=${r.pageEnter}, back spa=${b.spa} animated=${b.pageEnter})`;
  } catch (e) {
    navCheck = "error: " + String(e).slice(0, 140);
  }
  await ctx.close();
}

await browser.close();

const med = (k) => {
  const v = samples.map((s) => s[k] ?? 0).sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
};
console.log(
  JSON.stringify(
    {
      samples,
      median: {
        textVisibleAt: med("textVisibleAt"),
        refadeAt: med("refadeAt"),
        cls: med("cls"),
        totalKB: med("totalKB"),
      },
      navCheck,
    },
    null,
    1,
  ),
);
