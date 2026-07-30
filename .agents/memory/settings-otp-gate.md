---
name: Settings two-partner OTP gate
description: Admin Settings (UPI + pricing) endpoints require an x-settings-unlock JWT; what tests, e2e runs, and future settings endpoints must do about it
---

- All `/api/admin/settings/*` GET/PUT return 403 `SETTINGS_LOCKED` unless the request also carries `x-settings-unlock: <JWT with scope settings_unlock>` (signed with SESSION_SECRET, 15 min). Token comes from `POST /api/admin/settings/otp/verify` after both partners' emailed codes are entered.
- **How to apply:** any NEW admin settings endpoint must add the same unlock guard, and its tests must send the header (see `makeUnlockToken` in the settings tests). The header is passed via request config, not the OpenAPI spec.
- E2E: under `NODE_ENV=development` the server logs the plaintext codes (`DEV ONLY` line) after `otp/send` and SUPPRESSES all partner emails — both the OTP codes and the settings-changed notifications (incl. order clean-up). `SETTINGS_OTP_SEND_EMAILS=true` opts back in to real sends.
- Reading the codes out of the workflow log via log-refresh drains is FLAKY — drain boundaries can slice off the `DEV ONLY` block. Deterministic method for API-only rounds: start a second api-server instance (`PORT=8090 NODE_ENV=development node dist/index.mjs > own.log`) inside ONE foreground shell command and do send→parse own.log→verify→export→delete against it; OTP state is per-process in-memory but MySQL/GCS are shared, so the cleanup is real. Browser rounds can keep using the log because the runner needs a codes file anyway — write it right after a fresh send. **Why the gate is `=== "development"` and not `!== "production"`:** the Hostinger bundle starts with plain `node dist/index.mjs` (hPanel may bypass npm start), so NODE_ENV can be unset in real production — suppression must fail toward sending. Tests that exercise the real send path set the flag; a manual delete-flow browser runner lives at portal `scripts/e2e-delete-flow-run.mjs`.
- Attempt lockout is atomic because verifies are serialized through an in-process queue. **Why:** code review flagged a read-modify-write race on the attempts counter; safe only because the server is a single Node process (dev and Hostinger prod alike). A multi-process deployment would need DB-level atomicity instead.
- Public `/api/payments/upi-config` and `/api/pricing/config` must stay public — customer payment pages read them without auth.

- Employee (processing) password: admin-saved sha256 hash in settings table (key processing_password_hash) beats PROCESSING_PASSWORD env at login; env is fallback only.
