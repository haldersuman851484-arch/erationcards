---
name: GEO prerender pipeline
description: Constraints of the build-time prerender + live-price-token system that makes public pages readable by non-JS AI crawlers
---

The portal serves build-time HTML snapshots of public routes to crawlers (AI bots don't run JS). The pipeline has invariants that are easy to break silently:

- **Never-stale price seam**: snapshots must contain `%%PRICE_*%%` tokens, never literal prices. `usePricing()` returns `TOKEN_PRICING` when `window.__PRERENDER_TOKENS__` is set (prerender script sets it); the API server substitutes live admin prices per request. Any new price mention on a prerendered page must flow through `usePricing()` — a hardcoded ₹ number goes stale the moment the admin edits pricing. The prerender build fails if tokens are missing on price-bearing routes.
  **Why:** admin edits prices at runtime; rebuilds don't happen then.
- **Page-level JSON-LD must use the serialized-data-dep hook** (`useJsonLd`), never a `useEffect` keyed on route/info only. A `[info]`-dep effect runs once with default pricing and overwrites the server-substituted snapshot JSON-LD — Googlebot (which runs JS) then sees stale prices forever.
  **How to apply:** any new page schema → `useJsonLd(id, data)`; the hook re-injects when the serialized data (incl. live prices) changes.
- **index.html must stay free of page-specific JSON-LD** (FAQPage/BreadcrumbList) — it's the shell for *every* route, so a global block duplicates onto all pages. Page schemas live in the page components; api-server tests guard this.
- **Raw `/prerendered/*` must 404** — those files carry unsubstituted tokens. Express blocks the path before static; robots.txt disallows it.
- **sitemap.xml is the route source of truth**: the prerender script fails the build when sitemap paths and prerendered routes drift (`SITEMAP_ONLY` holds knowing exclusions — `/operator/register` shows operator prices, which are plain numbers in `TOKEN_PRICING`, so a snapshot would bake stale values). Adding a public page = add to sitemap AND the route list, or the build says so.
- **Every prerendered page must set its own canonical** via `useSeo` — otherwise it inherits index.html's `/` canonical and crawlers treat it as a homepage duplicate. The prerender script asserts canonical + og:url per route.
- Serving side: prod-sim test procedure is in `prod-static-serving-test.md`; the API server memory-caches the prerender map + rendered snapshots per pricing state, so restart it after (re)staging snapshots.
