---
name: Playwright on NixOS needs system chromium
description: Playwright-bundled browsers fail with missing shared libs; use Nix chromium via launchOptions.executablePath
---

Playwright's downloaded chromium (`.cache/ms-playwright/...`) cannot run in this Nix environment: `error while loading shared libraries: libglib-2.0.so.0`.

**Why:** NixOS has no global shared libraries; prebuilt browser binaries can't find them.

**How to apply:** Install the `chromium` system dependency via Nix and point Playwright at it — the portal's `playwright.config.ts` resolves `which chromium` and passes it as `launchOptions.executablePath` (overridable via `PLAYWRIGHT_CHROMIUM_PATH`). Don't try `playwright install-deps` / apt.

Also note: several older portal e2e specs (order-form, family-card-validation, barcode-scanner) are stale/failing for unrelated reasons (e.g. tests predate the "confirm payment" checkbox; some hit the real API). They were previously unrunnable because the browser couldn't launch at all.
