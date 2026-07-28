---
name: Courier dashboard modals
description: Rules for any dialog that edits an order on the courier print-status screen (CourierDashboard)
---

# Modals on the courier print-status screen

The courier print-status screen has two traits that make naive modals unsafe:

1. **Global scanner keydown listener** — any printable keypress (barcode scanner or keyboard) opens the print-search overlay and starts typing into it whenever the overlay is closed. Selection can therefore change at any moment; a modal built over "the currently displayed order" can drift to a different order underneath the form.
2. **Cached search results** — the displayed order comes from a react-query cache. Out-of-band changes (another admin dispatches/edits the order, a direct API call) are NOT reflected until an invalidation, so `order.status` and field values on screen can be stale.

**Rule:** any dialog that edits or depends on an order here must:
- Re-fetch the order (`GET /api/orders/:id`) when the dialog opens, and drive warnings/prefills from that fresh response, not the cached row.
- Freeze the target order id in state at open time and send mutations to that frozen id — never the live `order.id` from render state.
- Close the dialog via an effect if the displayed order id drifts away from the frozen id mid-edit.
- After a successful save, invalidate both `["courier-print-search"]` and `["phone-history"]`.

**Why:** During the customer-info edit feature, the e2e tester caught the dispatched-status warning not appearing because the search cache was stale, and the architect review flagged that a scan mid-edit could write order A's form data into order B. The three-part rule above fixed both.

**How to apply:** Follow the existing customer-info edit dialog in `CourierDashboard.tsx` as the reference implementation when adding new modals (e.g. courier selection, re-dispatch, notes).
