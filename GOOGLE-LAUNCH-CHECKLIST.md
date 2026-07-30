# Google Launch Checklist — erationcards.in

Simple steps to get your website listed on Google after it goes live.
Do them in order. Steps 1–4 take about 15 minutes total.

---

## Step 1 — Make sure the website is live

Open https://erationcards.in in your phone's browser (mobile data, not Wi-Fi if
possible). The homepage should load. If it doesn't, the site is not live yet —
finish the Hostinger launch first. Nothing below works until the site is live.

## Step 2 — Add your website to Google Search Console (free)

Google Search Console is Google's free tool that tells Google your site exists
and shows you how it performs in search.

1. Go to https://search.google.com/search-console
2. Sign in with your Google account (any Gmail works — use one you won't lose)
3. Click **Add property**
4. Choose the **Domain** option (left box) and type: `erationcards.in`
5. Google shows you a **TXT record** — a line of text like
   `google-site-verification=abc123...`. Copy it.
6. Open a new tab, log in to **Hostinger** → open your domain
   **erationcards.in** → find **DNS / Name Servers** (sometimes called
   "DNS Zone Editor")
7. Add a new record:
   - **Type:** TXT
   - **Name/Host:** @ (or leave blank if @ is not accepted)
   - **Value:** paste the line you copied from Google
   - **TTL:** leave as is
8. Save, go back to the Google tab, and click **Verify**.
   If it says "not verified", wait 30–60 minutes and press Verify again —
   DNS changes take a little time.

> Stuck? Send me a screenshot of the Hostinger DNS page and I'll tell you
> exactly what to type where.

## Step 3 — Submit your sitemap

The sitemap is a ready-made list of all your pages. It's already built into
the website.

1. In Search Console, open **Sitemaps** (left menu)
2. In the "Add a new sitemap" box type: `sitemap.xml`
3. Click **Submit**
4. Status should say **Success** within a day

## Step 4 — Ask Google to index your homepage

1. In Search Console, click the search bar at the very top
   ("Inspect any URL")
2. Type `https://erationcards.in/` and press Enter
3. Click **Request indexing**
4. Repeat once each for these important pages:
   - `https://erationcards.in/order`
   - `https://erationcards.in/faq`
   - `https://erationcards.in/pvc-ration-card/kolkata`

That's it — Google now knows about your site and will crawl the rest by
itself using the sitemap.

## Step 5 (optional, 5 minutes) — Bing / other search engines

Go to https://www.bing.com/webmasters → sign in → choose
**Import from Google Search Console**. One click covers Bing, DuckDuckGo and
Yahoo search.

---

## What to expect (be patient — this is normal)

| When | What happens |
|---|---|
| First few days | Google visits the site. Nothing visible yet. |
| Week 1–2 | Searching `site:erationcards.in` on Google starts showing your pages. Searching your name "erationcards" finds you. |
| Week 2–6 | Specific searches start working — e.g. "pvc ration card order online west bengal", district searches like "pvc ration card murshidabad". |
| Month 2–6 | Rankings slowly climb as people visit. Broad words like "pvc card" are the hardest and take the longest — first place is never guaranteed for anyone. |

## Check once a week (2 minutes)

In Search Console, open **Performance**:
- **Impressions** = how many times you appeared in search results
- **Clicks** = how many people clicked
Both should grow week by week. Also glance at **Pages → Why pages aren't
indexed** — a few "Excluded" pages (admin/staff pages) is correct and
intentional; they are private.

## Things that help ranking after launch

- **Real customer reviews** on the site (already supported) — fresh content
  Google likes
- **WhatsApp your website link** to customers — visits from real people help
- **Google Business Profile** (free, https://business.google.com) if you want
  to appear on Google Maps for "pvc card print near me" type searches
- Mention your website on any Facebook page / local groups you already use

## Things NOT to do

- Don't pay anyone who "guarantees #1 on Google" — nobody can promise that
- Don't buy cheap backlink packages — Google punishes this
- Don't copy text from other websites
- Don't stuff the same keyword into pages again and again — the site is
  already written the way Google likes

## If you want to be on top from day one

Google Ads (https://ads.google.com) puts you above the normal results
immediately — you pay per click, you set a daily budget, and you can stop
anytime. Good for the launch period while free ranking grows. Ask me if you
want help planning this.
