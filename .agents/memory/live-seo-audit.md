---
name: Live SEO audit
description: Read-only live-site indexability audit script + the two classes of indexing bugs it exists to catch
---

# Live SEO audit — `scripts/src/audit-live-seo.mjs`

Read-only, zero-dep script; run anytime against the live domain (`node scripts/src/audit-live-seo.mjs`). Fetches the live sitemap, then every URL with BOTH a browser UA and a Googlebot UA. Checks: 200/no-redirect, self-canonical, og:url, unique title/desc, meta-robots + `X-Robots-Tag` noindex, `%%TOKEN%%` leaks, JSON-LD parse + required types per route class, no-JS text length, h1, bot/browser parity, and internal-link BFS orphan check from home. Exit 1 on hard failures; length warnings (long titles/descs on district pages) are cosmetic and deliberately accepted.

## Lesson 1: every indexable route must be prerendered with a self-canonical
**Rule:** No route in the sitemap may be served as the bare SPA shell. The shell carries the homepage canonical/og:url, so Google classifies the page as a duplicate of home and never indexes it.
**Why:** `/operator/register` sat in a SITEMAP_ONLY set (served shell) — live audit showed its canonical pointing at the homepage. The old reason for exclusion (price leakage) was stale; the page renders no prices.
**How to apply:** Keep prerender's SITEMAP_ONLY set empty. Any new public route goes into STATIC_ROUTES so it gets a snapshot with its own canonical (add tokens to MUST_HAVE_TOKENS only if it shows prices/contact).

## Lesson 2: title suffix appending must be idempotent
**Rule:** The SEO hook appends `| PVC Card Portal` only when the given title doesn't already end with it.
**Why:** Pages that passed a full title (already suffixed) got "… | PVC Card Portal | PVC Card Portal" live on six pages — messy truncated SERP titles.
**How to apply:** When adding titles via the SEO hook, either form is now safe; but if a new suffix/brand rename happens, keep the ends-with guard in `use-seo.ts` in sync.
