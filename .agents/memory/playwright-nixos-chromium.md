---
name: Playwright on NixOS needs system chromium
description: Playwright-bundled browsers fail with missing shared libs; use Nix chromium via launchOptions.executablePath
---

Playwright's downloaded chromium (`.cache/ms-playwright/...`) cannot run in this Nix environment: `error while loading shared libraries: libglib-2.0.so.0`.

**Why:** NixOS has no global shared libraries; prebuilt browser binaries can't find them.

**How to apply:** Install the `chromium` system dependency via Nix and point Playwright at it — the portal's `playwright.config.ts` resolves `which chromium` and passes it as `launchOptions.executablePath` (overridable via `PLAYWRIGHT_CHROMIUM_PATH`). Don't try `playwright install-deps` / apt.

Also note: several older portal e2e specs (order-form, family-card-validation, barcode-scanner) are stale/failing for unrelated reasons (e.g. tests predate the "confirm payment" checkbox; some hit the real API). They were previously unrunnable because the browser couldn't launch at all.

- The portal e2e suite targets baseURL http://localhost:80 (the proxy). If the `artifacts/ration-card-portal: web` workflow is down, every test fails with the same navigation errors — check `curl localhost:80/order` returns 200 before trusting failures.
- Global keydown-to-open-search inputs must `preventDefault()` on the opening keystroke, or the autofocused input receives the same char twice (ghost first character).
