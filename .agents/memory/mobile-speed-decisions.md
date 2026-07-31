---
name: Mobile speed decisions (portal)
description: Why the portal has no enter-animation on first mount, no font preloads, and a metric-matched Inter Fallback — do not reintroduce any of these
---

# Mobile-speed design decisions (PVC portal) — keep these intact

Made July 2026 to lift PageSpeed mobile 83 → 90+ (FCP/LCP 2.9s, SI 6.7s before).
Measured locally: hero text visible 1342ms → 654ms, React-mount re-fade gone.

## 1. No enter animation on the very first render
`PageTransition` (portal `src/App.tsx`) skips the `.page-enter` class until the
first client-side navigation (refs track the initial wouter location).
**Why:** pages are served as prerendered snapshots. The fade had a double cost:
CSS `animation-fill-mode: both` put the *snapshot itself* at opacity 0 until
CSS loaded (~250ms of blank), and when React mounted 4-6s later on throttled
mobiles the fresh `.page-enter` div re-ran the fade over the already-painted
page — resetting Speed Index visual completeness (the 6.7s SI). Snapshots are
captured post-fix, so they contain no `page-enter` markup either.
**How to apply:** never add mount-time animations/transitions to anything
visible on a snapshot-served first paint; navigation-only animation is fine
(covered by a nav check in scripts/measure-perf.mjs).

## 2. Fonts: no preloads, metric-matched fallback, only used weights
- Inter weights 400/500/600/700 only (300 dropped — zero usages; re-check
  usage before adding weights).
- NO `<link rel="preload" as="font">` anywhere: 2×24KB preloads competed with
  the render-blocking stylesheet on slow 4G and pushed text LCP later. The
  vite font-preload plugin was deleted deliberately.
- Instead, `"Inter Fallback"` @font-face in `src/index.css`:
  `src: local("Liberation Sans"), local("Arial")` + next/font's Inter metric
  overrides (size-adjust 107.4%, ascent 90.2%, descent 22.48%, line-gap 0) —
  text paints instantly in adjusted fallback, swap to Inter is layout-stable.
  Liberation Sans listed first for Linux test machines (metric-identical to
  Arial); Android aliases Arial→Roboto; the stack is
  `'Inter', 'Inter Fallback', sans-serif` via `--app-font-sans`.
**Why:** font preloads are usually "best practice" but on a text-LCP site over
slow 4G they *delay* LCP; the metric-matched fallback is what makes dropping
them safe (CLS stays ~0 where local() resolves — see perf-measurement-nixos.md
for why this box misreads that).
