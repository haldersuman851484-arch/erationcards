---
name: Resend order emails
description: How order-confirmation email sending behaves across environments (Replit dev vs Hostinger prod) and the sandbox delivery restriction.
---

# Resend order emails

**Rule:** Email sending must work in two transports and always fail soft.
- On Replit (dev/deploy): Replit-managed Resend connector via `@replit/connectors-sdk` (`connectors.proxy("resend", "/emails", ...)`; SDK JSON-stringifies object bodies; create a new client per call — tokens expire).
- Outside Replit (Hostinger prod): the connector proxy is unreachable; a direct `https://api.resend.com/emails` call with `RESEND_API_KEY` is required. The transport switch lives in the api-server email lib and keys off `RESEND_API_KEY`.

**Sandbox restriction:** until the user's domain (erationcards.in, DNS on Hostinger) is verified at resend.com/domains, Resend returns 403 for any recipient other than the Resend account owner's own inbox, and `from` must be `onboarding@resend.dev`. After verification, set `EMAIL_FROM` to a domain address.

**Why:** Discovered while building the order-confirmation email: 403 "You can only send testing emails to your own email address" for all other recipients. Email failure is deliberately non-blocking (order completes, `emailSent:false`).

**How to apply:** Any new outbound email feature in this project must reuse the same transport switch and fail-soft pattern, and will not deliver to real customers until the domain is verified + `EMAIL_FROM`/`RESEND_API_KEY` are set in the target environment.
