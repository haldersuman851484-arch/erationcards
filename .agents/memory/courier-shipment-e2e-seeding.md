---
name: Courier shipment e2e seeding
description: How to make the courier dashboard's shipment buttons appear for a test order before UI/e2e testing shipment flows
---

# Courier shipment e2e seeding

The courier Print Status view only shows the pinned bottom-right shipment button
("Create Shipment with Delhivery" / "Download Shipping Label" / "Cancel Shipment")
when **both** are true for the selected order:

1. `isPrinted` — order status is `printed`, `dispatched`, or `delivered`
2. `allCardsDownloaded` — every expected card has a `rationCardPdfs` entry with `downloaded: true`

**Why:** test orders dispatched directly via the API (`POST /api/orders/:id/dispatch`)
get a tracking number but have empty `rationCardPdfs`, so the button never renders
and a UI tester reports the flow "missing". This cost a failed e2e round on 2026-07-27.

**How to apply:** before e2e-testing any shipment UI (create/cancel/label), seed the
order state through the real endpoints — no SQL needed:

1. `POST /api/orders/:orderNumber/upload-card-pdf` (public, multipart: file field `pdf`,
   body field `cardIndex`, one per card — quantity N needs indexes 0..N-1)
2. `PATCH /api/orders/:id/pdfs/:cardIndex/downloaded` with an admin Bearer token
3. Ensure status is printed/dispatched (dispatch API or status PATCH)

Admin token for scripts: `POST /api/admin/login` with ADMIN_EMAIL/ADMIN_PASSWORD env,
or `createAdminToken()` from the api-server's auth lib (signs with SESSION_SECRET).
Note: order reads/writes are guarded (since 2026-07-27): list, detail, stats, recent,
status PATCH and assign all need an admin token (detail + status PATCH alternatively
accept the assigned operator's token). Public: create, track-by-number, :id/tracking,
card-PDF upload. Seeding scripts must send the admin token on every PATCH.
UI note: "mark printed" lives inside the courier mPanel scan workflow
(/admin/courier/public) — there is no /admin/print-status route.

Full realistic order seeding (proven end-to-end 2026-07-27, AWB issued):
`POST /api/payments/upload-screenshot` (multipart `screenshot`) → use returned url as
`paymentScreenshotUrl` in `POST /api/orders` (required, non-empty), then admin
`PATCH /orders/:id/payment-status` with `{"paymentStatus":"confirmed"}` (NOT "verified" —
only confirmed/rejected are logged as verifications), then `PATCH /orders/:id` status printed.

**Delhivery env:** `getDelhiveryBaseUrl()` switches on `DELHIVERY_ENV` (default **staging**).
The dev workspace has no DELHIVERY_ENV secret, so dispatch/cancel/track there hit
staging-express.delhivery.com — clicking "Create Shipment" in dev creates only a staging AWB
(no real courier). Real shipments require `DELHIVERY_ENV=production` (deployment must set it).
Still never dispatch arbitrary existing orders in tests — use a purpose-made test order.
