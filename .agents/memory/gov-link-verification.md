---
name: Verifying WB government links before adding them
description: How to check wbpds.wb.gov.in / food.wb.gov.in URLs the user pastes before linking them from guide pages
---

**Rule:** Never add a user-pasted government URL to a guide without verifying it loads. Verify with the Screenshot tool (`externalUrl`); retry once on a blank or 500 result before concluding anything.

**Why:** The user copies URLs from their browser tab — sometimes that tab is the government's error page. Their generic 404 (`wbpds.wb.gov.in/404.aspx?aspxerrorpath=...`) renders "404 Not Found — Temporarily stopped" for ANY missing path, so the wording does not mean the service is coming back. One pasted link (family split) was exactly this; the button was pointed at the working Digital Portal instead.

**How to apply:**
- `curl` from this box gets `000` on wbpds (egress blocked) — useless signal.
- `webFetch` can return `500 Internal Server Error` even for pages that load fine — unreliable alone.
- Screenshot `externalUrl` is decisive, but slow ASP.NET pages can capture blank/white or error on the first try — always retry once before judging.
- If a direct service page is stopped: the government's own forms directory (food.wb.gov.in/food/PDS/application.html) sends online applicants to `https://wbpds.wb.gov.in/Digitalportal/index.aspx` — a safe official fallback target (verified loading, Aadhaar-OTP login).
- Never link session-tokenized URLs like `wbpds.wb.gov.in/(S(...))/Form14_by_Aadhaar.aspx` from search results — strip to the base path and verify that.
- UI-wise these buttons use the shared `heroAction` prop on GuideLayout (centered button + bilingual "official/free" caption); copy an existing implemented guide for the exact markup.
