---
name: GEO prerender pipeline
description: Constraints of the build-time prerender + live-price-token system that makes public pages readable by non-JS AI crawlers
---

The portal serves build-time HTML snapshots of public routes to crawlers (AI bots don't run JS). The pipeline has invariants that are easy to break silently:

- **Never-stale price seam**: snapshots must contain `%%PRICE_*%%` tokens, never literal prices. `usePricing()` returns `TOKEN_PRICING` when `window.__PRERENDER_TOKENS__` is set (prerender script sets it); the API server substitutes live admin prices per request. Any new price mention on a prerendered page must flow through `usePricing()` — a hardcoded ₹ number goes stale the moment the admin edits pricing. The prerender build fails if tokens are missing on price-bearing routes.
  **Why:** admin edits prices at runtime; rebuilds don't happen then.
- **Contact details use the same seam**: `useContact()` returns `TOKEN_CONTACT` in prerender mode; server substitutes `%%CONTACT_*%%` (incl. derived `PHONE_DIGITS` for wa.me and `PHONE_E164` for JSON-LD `telephone`) in snapshots, index.html head and llms.txt. Contact fields ban HTML-unsafe chars (`< > " & \ %`) at save time, so raw insertion into HTML/JSON-LD is safe. Prerender fails on literal defaults (old phone/email/address) or missing contact tokens. Substitution caches (index.html + snapshots) key on the JSON of [pricing, contact] — extend the key when adding a new substitution source.
- **Token keys with digits need `[A-Z0-9_]` in the replacement regex** — `%%CONTACT_PHONE_E164%%` silently stayed raw because the matcher used `[A-Z_]+`. Symptom: one token unsubstituted while siblings work.
- **Page-level JSON-LD must use the serialized-data-dep hook** (`useJsonLd`), never a `useEffect` keyed on route/info only. A `[info]`-dep effect runs once with default pricing and overwrites the server-substituted snapshot JSON-LD — Googlebot (which runs JS) then sees stale prices forever.
  **How to apply:** any new page schema → `useJsonLd(id, data)`; the hook re-injects when the serialized data (incl. live prices) changes.
- **index.html must stay free of page-specific JSON-LD** (FAQPage/BreadcrumbList) — it's the shell for *every* route, so a global block duplicates onto all pages. Page schemas live in the page components; api-server tests guard this.
- **Raw `/prerendered/*` must 404** — those files carry unsubstituted tokens. Express blocks the path before static; robots.txt disallows it.
- **sitemap.xml is the route source of truth**: the prerender script fails the build when sitemap paths and prerendered routes drift (`SITEMAP_ONLY` holds knowing exclusions — `/operator/register` shows operator prices, which are plain numbers in `TOKEN_PRICING`, so a snapshot would bake stale values). Adding a public page = add to sitemap AND the route list, or the build says so.
- **Every prerendered page must set its own canonical** via `useSeo` — otherwise it inherits index.html's `/` canonical and crawlers treat it as a homepage duplicate. The prerender script asserts canonical + og:url per route.
- Serving side: prod-sim test procedure is in `prod-static-serving-test.md`; the API server memory-caches the prerender map + rendered snapshots per pricing state, so restart it after (re)staging snapshots.

## Adding a guide page (checklist, 2026-08-01)
A new guide touches SIX registries: App.tsx lazy route, api-server clientRoutes.ts, prerender STATIC_ROUTES, sitemap.xml, llms.txt, and the /services hub TILES in Services.tsx. The build guards catch the first five; the hub tile is NOT guarded — easy to forget. Use the shared `useGuideSchema` hook (guides/useGuideSchema.ts) for HowTo+FAQPage+BreadcrumbList JSON-LD (breadcrumb is 3-level via /services); don't hand-roll per page.

- **Guides are bilingual EN+BN by design (Aug 2026)**: `GuideStep.bn`, `GuideFaq.bnQ/bnA` and GuideLayout `bnIntro` are REQUIRED fields — typecheck is the completeness guard, so a new guide won't compile until fully translated. **Why:** owner wants every customer-facing block readable in Bengali; required fields made a 5-parallel-subagent translation of 18 guides verifiably complete. JSON-LD deliberately stays English-only (visible page carries `lang="bn"`; FAQPage `inLanguage` is `["en-IN","bn"]`) — don't add Bengali entities to schema. Bengali strings with prices reuse the same PRICING template placeholders (never literal ₹; prerender rejects). Quick-answer box is the one guide block still English-only.
