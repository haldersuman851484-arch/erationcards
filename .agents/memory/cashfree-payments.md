---
name: Cashfree online payments
description: How the Cashfree integration is tested, configured, and taken live; test-factory seam; config refusal rules
---

# Cashfree payments (replaced UPI-screenshot flow, Aug 2026)

## Config inference (lib/cashfree.ts `getCashfreeConfig`)
- No keys → unconfigured (routes 503, UI shows "order saved, pay later" — never blocks order creation).
- `CASHFREE_ENV` unset: App ID starting `TEST` → sandbox; production-looking keys → **REFUSED** (unconfigured).
- **Why:** the owner is non-technical; accidentally charging real customers from a dev box must be impossible. Going live requires the explicit `CASHFREE_ENV=production` handshake.
- **How to apply:** never "fix" a prod-keys-refused state by defaulting to production; unknown `CASHFREE_ENV` values also refuse.

## Test seam — browser specs never load the SDK
- `window.__cashfreeTestFactory` (checked first by `openCashfreeCheckout`) returns a fake `{ checkout: async () => ({}) }` via `page.addInitScript`; also `route.abort()` on `**://sdk.cashfree.com/**` as belt-and-braces.
- Simulates "customer closed the modal"; the server outcome is driven entirely by mocked `/api/payments/cashfree/status` sequences (last value repeats). Poll timing: ~3×1.5s post-modal — give expects 15s.
- Gateway is source of truth: staff cannot confirm/reject cashfree orders (amber awaiting-payment badge instead); legacy screenshot orders keep the old verification surfaces.

## Key validation without a working DB
- Dev-box DB is unreachable (Hostinger allowlist), so smoke-test keys by importing the api-server lib directly with tsx: create a ₹1 sandbox order; success = `orderStatus ACTIVE` + `payment_session_id` (~148 chars). Script pattern in `.local/tmp/cashfree-smoke.mts`.

## Go-live checklist (Hostinger)
1. Live keys + `CASHFREE_ENV=production` in Hostinger .env (TEST keys live in Replit secrets since Aug 8 2026).
2. Webhook URL in Cashfree dashboard: `https://erationcards.in/api/payments/cashfree/webhook`.
3. `cf_order_id` column self-heals on first boot — no manual SQL.
