---
name: Radix Select lists that outgrow the viewport
description: Long SelectContent lists (16+ options) overflow small windows; cap with max-h + overflow-y-auto or Playwright loops forever
---

The rule: any Radix `SelectContent` whose option list can grow long (10+ items) needs a per-usage bounded height, e.g. `className="max-h-60 overflow-y-auto"`. The shared `ui/select.tsx` default (position="popper", max-h from available height) does NOT reliably prevent viewport overflow in practice — when the popup opens upward on a form low in the page, top options land off-screen and cannot be scrolled to.

**Why:** When the card-type list grew from 8 to 16 options, the operator form's dropdown opened taller than the window; Playwright clicks on top options (AAY/PHH) spun in an endless "element is outside of the viewport" retry loop until timeout. It is also a real small-screen UX bug, not just a test problem.

**How to apply:**
- Playwright smell: repeated "element is outside of the viewport" retries inside a select-picking helper → the list needs a height cap in the APP, not a workaround in the spec.
- Precedent in this repo: district dropdowns (public order form max-h-60, operator form max-h-52) and now all four card-type dropdowns (public step-1 + family dialog, operator main + family dialog) use this pattern.
- Options below the fold are fine: Playwright auto-scrolls inside the scrollable container, and `toBeVisible()` passes for clipped-but-scrollable items (district specs prove it).
- Fix per-usage with className; do not change the shared `ui/select.tsx` defaults (other short dropdowns don't need it and global changes risk subtle regressions).
