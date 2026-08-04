---
name: OG share image regeneration
description: How to regenerate the portal's social-share image deterministically, and why it must never contain prices
---

# OG share image (portal `public/opengraph.jpg`)

**Rule:** the social-share image must never contain a price (or any admin-editable value). Images can't carry `%%PRICE%%` tokens, so a baked-in price goes stale the moment the admin edits pricing (the old image showed "₹70" while live pricing was ₹75/₹50).

**Why:** WhatsApp/Facebook link previews are a primary shape of word-of-mouth for this customer base; a wrong price in the preview is actively misleading.

**How to regenerate deterministically (no AI image gen needed):**
1. Write a self-contained `public/og-source.html` (inline CSS, system fonts, body sized exactly to target px).
2. Screenshot it through the app preview at the exact viewport (e.g. 1200×630) with `saveTo` — vite serves `public/` at root instantly, no restart.
3. `mv` the capture over `public/opengraph.jpg`, delete `og-source.html`.
4. Keep `og:image:width/height` in `index.html` in lockstep with the file's real dimensions (guard exists for prices, not for this).

- 2026-08 addendum: the same "never bake prices into images" rule got a reusable solution — the admin campaign banner is drawn client-side on an offscreen canvas from live pricing/contact hooks (brand color read from the CSS --primary var, logo from the served favicon-192.png so logo changes propagate automatically). Reuse that pattern for any future image that must show prices or contact info.
