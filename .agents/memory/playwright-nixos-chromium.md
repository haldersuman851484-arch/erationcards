---
name: Playwright on NixOS needs system chromium
description: Playwright-bundled browsers fail with missing shared libs; use Nix chromium via launchOptions.executablePath
---

Playwright's downloaded chromium (`.cache/ms-playwright/...`) cannot run in this Nix environment: `error while loading shared libraries: libglib-2.0.so.0`.

**Why:** NixOS has no global shared libraries; prebuilt browser binaries can't find them.

**How to apply:** Install the `chromium` system dependency via Nix and point Playwright at it — the portal's `playwright.config.ts` resolves `which chromium` and passes it as `launchOptions.executablePath` (overridable via `PLAYWRIGHT_CHROMIUM_PATH`). Don't try `playwright install-deps` / apt.

Portal e2e suite is green as of July 2026 (all specs updated for current UI: required email on step 2, in-page step 4 "card-step4-upload" success instead of /order-upload navigation, admin order list moved from /admin/dashboard to /processing). Note: a full cold run can mass-fail from dev-server warm-up; re-run suspicious specs before treating them as stale.

- The portal e2e suite targets baseURL http://localhost:80 (the proxy). If the `artifacts/ration-card-portal: web` workflow is down, every test fails with the same navigation errors — check `curl localhost:80/order` returns 200 before trusting failures.
- Global keydown-to-open-search inputs must `preventDefault()` on the opening keystroke, or the autofocused input receives the same char twice (ghost first character).
