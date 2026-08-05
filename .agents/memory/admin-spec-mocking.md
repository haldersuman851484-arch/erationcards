---
name: Admin-page browser specs must mock every API route
description: Why Playwright specs for /admin or /processing pages break with route.continue(), and the safe mocking pattern.
---

Rule: in Playwright specs for staff pages (/admin/*, /processing), the `page.route("**/api/**", …)` handler must fulfill EVERY api call. The fallback branch should be `route.fulfill({ status: 200, body: "[]" })` — never `route.continue()`.

**Why:** the app wires a global session-expiry handler (staff session module) into the QueryClient: any 401 from any staff endpoint while an adminToken is stored clears the token and does a full `window.location.replace("/admin/login?expired=1")`. Unmocked calls that fall through to the real dev API carry the fake test token, get 401, and the redirect tears the page down mid-test with confusing "element was detached" errors.

**How to apply:** copy the setupMocks pattern from the admin dashboard/campaigns specs: `addInitScript` to set `adminToken`, explicitly mock the endpoints the test asserts on (e.g. `/api/admin/me`, `/api/pricing/config` → `{ pricing: … }`, `/api/contact/config` → `{ contact: … }`), and give everything else the benign `[]` fallback (works for both array consumers and optional-chained object access).

Related mobile-UI note: the dashboard TabsList needs `min-h-* h-auto` (not a fixed height) with `flex-wrap` — a fixed-height strip lets wrapped tab rows spill over the panel below, and pointer taps on them get intercepted (found via mobile e2e when the 6th tab was added).

Toast assertions: always `page.getByText("…").first()` when asserting toast text. The toaster renders the message twice (visible ToastTitle div + an `aria-live` status span), and whether Playwright strict mode sees one or both is timing-dependent — bare `getByText` passes some runs and fails others with a strict-mode violation. Cost two re-runs before the pattern was obvious; the flakiness moved between tests on consecutive runs.
