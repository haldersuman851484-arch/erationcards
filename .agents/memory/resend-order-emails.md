---
name: Resend order emails
description: Email transport, domain verification state, and connector key limits for order-confirmation emails
---

## Current state (since 2026-07-29)
- `erationcards.in` is **verified** in the user's Resend account (region ap-northeast-1). Order emails deliver to any recipient — the old "sandbox only delivers to account owner" restriction is gone.
- `RESEND_API_KEY` (full-access) is a Replit secret and `EMAIL_FROM` = `PVC Card Portal <orders@erationcards.in>` is a shared env var, so **dev and Hostinger both use the direct Resend API transport** (production parity). The Replit connector path in `email.ts` is only a fallback when the key is absent.
- **All four sending DNS records are live** (DKIM `resend._domainkey`, SPF TXT + MX on `send` subdomain, DMARC `_dmarc` = `v=DMARC1; p=none`) — user set them up before we checked; verify with live DNS lookups before asking for DNS work. Gmail **inbox** placement confirmed by user 2026-07-29. Full record values documented in `replit.md` (root SPF belongs to Hostinger webmail — leave it).

## Durable lessons
- **The Replit Resend connector's key is send-only.** Any call to `/domains` or other management endpoints returns `401 restricted_api_key`. Domain registration/verification/status checks need a user-created **Full access** API key.
- **The sandbox withholds this connector's credentials**: `listConnections("resend")` returns `[]` even though the connection is `added` (slug confirmed correct). Use the server-side `@replit/connectors-sdk` proxy via a node script, or the user's full-access key from env.
- **Why:** hit both walls when automating domain verification; the user's own full-access key solved it and doubles as the Hostinger production key.
- **How to apply:** for any Resend management work (domains, api-keys, audiences), use `$RESEND_API_KEY` directly against `api.resend.com`; don't retry the connector.
- Resend's safe test recipient `delivered@resend.dev` proves non-owner delivery is accepted without emailing a real stranger.
- `FROM_ADDRESS` is read at module load in `email.ts` — restart the API server workflow after changing `EMAIL_FROM`.
