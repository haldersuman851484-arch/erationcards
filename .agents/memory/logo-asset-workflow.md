---
name: Logo & brand asset workflow
description: How to produce/approve logos with this user and every place a brand-mark change must land in the portal
---

# Logo & brand assets

**Generation:** AI image/SVG generation (QuiverAI arrow models) is weak for lettermarks and premium gradient marks — outputs looked clip-arty; arrow-1.1-max 502'd, arrow-1.1 ran but still weak. Hand-crafting the SVG won decisively.
**Why:** shape-led "premium" marks need exact geometry (chip contacts, card stacking, controlled palette) that prompt-driven gen can't hold.

**Approval loop that works with this user:** write SVG options → node one-liner builds an HTML contact sheet → headless Nix chromium screenshot → read the PNG to self-inspect first → presentAsset → AskQuestion picker with a labelled image. Simple pickers tied to a picture get answered; open-ended forms get declined.

**Rasterizing icons from SVG:** chromium `--headless --screenshot --window-size=WxH` on a tiny HTML wrapper; `--default-background-color=00000000` + transparent body for transparent PNGs; solid background for apple-touch-icon (iOS composites badly with transparency).

**Master file:** `attached_assets/logo_options/premium_B_realistic.svg` (approved 2026-07-31). 

**Integration checklist (a brand-mark change must touch ALL of these):**
- `public/favicon.svg`, `public/favicon-192.png`, `public/apple-touch-icon.png` + the three `<link rel=…>` tags in `index.html`
- `index.html` boot-shell inline `<img>` (was a `.boot-mark` text square)
- `layout.tsx` Navbar AND Footer (near-identical blocks with DIFFERENT indentation — replace_all on one indentation misses the other; grep afterwards)
- admin `Login.tsx` header block
- LocalBusiness JSON-LD `logo`/`image` (absolute prod URLs)
- `public/opengraph.jpg` via the og-source recipe (see og-image-regeneration.md; never bake prices)
- Order emails have NO logo (candidate follow-up), so nothing to update there today.

**Raster icons shipped half-cropped once (found 2026-08-04):** favicon-192.png / email-logo.png / apple-touch-icon.png contained only the top strip of the mark (content bbox 160x70 of 192 — dots/PVC/holo missing); site looked fine because navbar/footer/boot use favicon.svg, but the admin campaign banner draws favicon-192 and exposed it ("logo showing half").
**Why:** the original raster step captured before/misaligned and nobody bbox-checked.
**How to apply:** after ANY icon rasterization run `magick file.png -alpha extract -threshold 5% -format "%@" info:` and confirm the bbox covers the full mark (~160x133+16+35 for 192px). Use the checked-in renderer `artifacts/ration-card-portal/scripts/render-logo-icons.mjs` (playwright + Nix chromium). Raw `chromium --headless --screenshot` renders BLANK pages on this box (both file:// img and inline SVG, with/without --virtual-time-budget) — don't retry that path.
