---
name: Search-engine submissions
description: Google Search Console verification-file rule and IndexNow submission quirk
---

# Search-engine submissions

**GSC verification file is permanent.** The site is verified in Google Search Console (URL-prefix property `https://erationcards.in/`, user's own Google account) via the HTML-file method. The `google*.html` file lives in the portal's `public/` dir so every build and Hostinger bundle ships it automatically. Deleting it un-verifies the property.
**Why:** Google drops verification if the file disappears; keeping it in `public/` makes it survive redeploys with zero user action.
**How to apply:** never "clean up" unfamiliar `google*.html` files in public/. The standard content is `google-site-verification: <filename>`, so the file can be recreated from the name alone — the user never needs to download/upload Google's copy.

**IndexNow first submission 403s, then succeeds.** A first-ever submit can return HTTP 403 `SiteVerificationNotCompleted` even when the key file already serves 200; a retry moments later succeeds.
**How to apply:** treat a 403 from api.indexnow.org as transient — confirm the key file serves 200, wait a few seconds, retry once before investigating. Subsequent submits return 200 first try (confirmed 2026-08-02).

**Post-deploy ritual:** after every Hostinger deploy that adds/changes pages, POST the full live-sitemap URL list to api.indexnow.org (key file = the hex-named .txt in portal `public/`, shipped in every bundle; key = file content). Feeds Bing/Yandex — the engines AI search tools use. Google ignores IndexNow; its GSC sitemap re-read is automatic, no action needed.

**A freshly submitted sitemap shows red "Couldn't fetch" at first.** GSC lists it with Type "Unknown" and status "Couldn't fetch" until Google's first actual read (minutes to a day). If the file curls 200 with XML content-type under a Googlebot UA, do nothing — it flips to "Success" on its own; resubmitting or debugging wastes the night.

**GSC has two different input boxes — spell out which one.** Sitemaps page accepts only sitemap files (page URLs submitted there sit at "Couldn't fetch" forever and must be removed via the row's ⋮ menu); Request-indexing lives in the top "Inspect any URL" bar. When guiding a non-technical user, name the exact box and say what the screen should show afterwards, and verify their result from a screenshot before recording success anywhere.
