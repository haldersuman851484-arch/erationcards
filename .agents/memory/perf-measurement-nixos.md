---
name: Lab perf measurement on this box
description: Lighthouse cannot run here (NO_FCP always); use the Playwright+CDP probe in portal scripts/measure-perf.mjs; box quirks that skew font/CLS readings
---

# Measuring page performance locally (NixOS box)

**Lighthouse is unusable here — do not retry it.** Nix chromium 138 returns
`NO_FCP` in every mode tried: `--headless=new` with/without `--disable-gpu`,
swiftshader variants, `--disable-features=PaintHolding`, AND attached mode
(`--port` against a self-launched chromium with remote debugging). No
`xvfb-run` on the box. PSI API is also quota-blocked (anonymous quota 0).
Rendering itself works fine (Playwright screenshots/tests pass) — it's the
paint/LCP trace-event emission that is broken in this headless build:
`first-contentful-paint` paint entries appear only sometimes and buffered LCP
PerformanceObserver entries are always empty.

**Working substitute:** `artifacts/ration-card-portal/scripts/measure-perf.mjs`
— Playwright + CDP with Lighthouse's slow-4G model (1.6 Mbps down / 150 ms RTT /
4x CPU, Pixel-5-ish mobile context). Because paint entries are unreliable, it
injects a rAF probe that walks the hero `<h1>` ancestor chain multiplying
computed opacity:
- `textVisibleAt` — first moment text is >50% visible (fade-aware FCP proxy)
- `refadeAt` — later drop below 30% (detects full-page re-fade at React mount)
plus CLS observer, resource waterfall w/ transferSize, and a desktop-viewport
nav check that SPA navigations still animate. Run server + probe in ONE
ShellExec (background procs die between calls).

**Box quirks that skew readings:**
- Only DejaVu fonts installed; `local("Arial")` / `local("Liberation Sans")`
  in @font-face FAIL here (`document.fonts.check` false) → metric-matched
  fallback faces don't apply → font-swap CLS measured here is a WORST CASE,
  not what production/PSI sees. Verify mechanism with fc-list before trusting
  font-related CLS numbers.
- Local TTFB ~3ms vs live ~300-600ms: absolute numbers read better than live;
  use before/after deltas, and let the user re-run PSI/Hostinger's test on the
  live site as ground truth.

**Why:** burned many attempts trying to get Lighthouse scores locally; the
probe gives trustworthy relative deltas for optimization work.
**How to apply:** any "make the site faster" task — baseline with the probe
BEFORE changing code, re-measure after, deploy, then have the user re-run the
real-world test.
