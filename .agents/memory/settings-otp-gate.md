---
name: Settings two-partner OTP gate
description: Admin Settings (UPI + pricing) endpoints require an x-settings-unlock JWT; what tests, e2e runs, and future settings endpoints must do about it
---

- All `/api/admin/settings/*` GET/PUT return 403 `SETTINGS_LOCKED` unless the request also carries `x-settings-unlock: <JWT with scope settings_unlock>` (signed with SESSION_SECRET, 15 min). Token comes from `POST /api/admin/settings/otp/verify` after both partners' emailed codes are entered.
- **How to apply:** any NEW admin settings endpoint must add the same unlock guard, and its tests must send the header (see `makeUnlockToken` in the settings tests). The header is passed via request config, not the OpenAPI spec.
- E2E: in dev the server logs the plaintext codes (`DEV ONLY` line) after `otp/send` — but every send emails the REAL partner Gmail addresses (`SETTINGS_PARTNER_EMAILS` env not set in dev). Keep live sends to a minimum or set that env var to test addresses first.
- Attempt lockout is atomic because verifies are serialized through an in-process queue. **Why:** code review flagged a read-modify-write race on the attempts counter; safe only because the server is a single Node process (dev and Hostinger prod alike). A multi-process deployment would need DB-level atomicity instead.
- Public `/api/payments/upi-config` and `/api/pricing/config` must stay public — customer payment pages read them without auth.

- Employee (processing) password: admin-saved sha256 hash in settings table (key processing_password_hash) beats PROCESSING_PASSWORD env at login; env is fallback only.
