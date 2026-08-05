import { test, expect } from "@playwright/test";

/**
 * Courier dashboard — PDF re-download & family-card scanning (both views)
 *
 * Covers:
 *  1. Download view: per-PDF green badges are clickable and re-download the
 *     file with ZERO side effects (no status PATCH, no downloaded-flag PATCH).
 *  2. Badges read "Printed ✓" (instead of "Downloaded ✓") once the order is
 *     printed/dispatched/delivered — and stay clickable.
 *  3. Fresh first download on a pending order still PATCHes downloaded-flag
 *     AND status→processing (guard regression).
 *  4. Fresh download on an already-printed order must NOT knock the status
 *     back to processing (server-state guard).
 *  5. Download view: any printable keypress auto-opens the search box (like
 *     the print view), so barcode scanners work without tapping 🔍 — and the
 *     typed value goes out as rationCardSearch (family numbers ride the same
 *     param; the server now matches them).
 *  6. Print view: scanning a family member's card auto-marks the order as
 *     printed; a term that prefixes BOTH the order number and a family card
 *     counts as a card scan (heuristic fix).
 */

const MOCK_ADMIN = { id: 1, email: "admin@test.com", role: "admin" };

const MAIN_CARD = "WB0210001111";
const FAMILY_CARD = "WB0210002222";

function makeOrder(overrides: Record<string, any> = {}) {
  return {
    id: 7,
    orderNumber: "1052",
    customerName: "ANIMA BISWAS",
    customerPhone: "9830012345",
    rationCardNumber: MAIN_CARD,
    cardType: "PHH",
    quantity: 2,
    status: "processing",
    paymentStatus: "confirmed",
    source: "public",
    address: "12 Lake Road",
    postOffice: "",
    district: "Kolkata",
    pincode: "700029",
    state: "West Bengal",
    familyCards: [
      { customerName: "RATAN BISWAS", rationCardNumber: FAMILY_CARD, cardType: "PHH" },
    ],
    rationCardPdfs: [
      { cardIndex: 0, pdfUrl: `/api/uploads/card-pdfs/7/0/${MAIN_CARD}.pdf`, downloaded: true, downloadedAt: "2026-08-01T10:00:00Z" },
      { cardIndex: 1, pdfUrl: `/api/uploads/card-pdfs/7/1/${FAMILY_CARD}.pdf`, downloaded: true, downloadedAt: "2026-08-01T10:05:00Z" },
    ],
    trackingNumber: null,
    createdAt: "2026-08-01T09:00:00.000Z",
    ...overrides,
  };
}

type Recorded = { method: string; path: string; search: string; body: string | null };

/**
 * Mock EVERY /api/** route (a real 401 anywhere triggers the global
 * session-expired redirect) and record all requests for assertions.
 */
async function setupMocks(
  page: import("@playwright/test").Page,
  orders: any[],
): Promise<Recorded[]> {
  const recorded: Recorded[] = [];

  await page.addInitScript(() => {
    localStorage.setItem("adminToken", "test-admin-token");
  });

  await page.route("**/api/**", async (route, request) => {
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();
    recorded.push({ method, path: pathname, search: url.search, body: request.postData() });

    if (pathname === "/api/admin/me") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ADMIN) });
    } else if (pathname.startsWith("/api/uploads/")) {
      // The card PDF file itself
      await route.fulfill({ status: 200, contentType: "application/pdf", body: Buffer.from("%PDF-1.4\n%mock card pdf") });
    } else if (pathname === "/api/orders/stats") {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          totalOrders: 0, pendingOrders: 0, processingOrders: 0,
          printedOrders: 0, dispatchedOrders: 0, deliveredOrders: 0,
          cancelledOrders: 0, totalRevenue: 0, todayRevenue: 0, todayOrders: 0,
        }),
      });
    } else if (/^\/api\/orders\/\d+\/pdfs\/\d+\/downloaded$/.test(pathname) && method === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
    } else if (/^\/api\/orders\/\d+$/.test(pathname) && method === "PATCH") {
      const body = JSON.parse(request.postData() || "{}");
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ ...(orders[0] ?? makeOrder()), ...body }),
      });
    } else if (pathname === "/api/orders" && method === "GET") {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ orders, total: orders.length, page: 1, limit: 200 }),
      });
    } else {
      // Fallback: every other staff API gets an empty-but-valid response
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    }
  });

  return recorded;
}

function patchesOf(recorded: Recorded[]) {
  return recorded.filter((r) => r.method === "PATCH");
}

async function openDownloadView(page: import("@playwright/test").Page) {
  await page.goto("/admin/courier/public");
  await page.getByText("Download Ration Card", { exact: true }).click();
}

test.describe("Courier download view — re-download badges", () => {
  test("done badges are per-PDF, labelled by card number, and re-download with zero PATCHes", async ({ page }) => {
    const recorded = await setupMocks(page, [makeOrder()]); // status: processing, both PDFs downloaded
    await openDownloadView(page);

    // Both PDFs get their own clickable badge — the old collapsed single badge is gone
    const badge0 = page.getByTestId("button-redownload-7-0");
    const badge1 = page.getByTestId("button-redownload-7-1");
    await expect(badge0).toBeVisible({ timeout: 8000 });
    await expect(badge1).toBeVisible();

    // Labelled so the team can tell which card each PDF belongs to
    await expect(badge0).toContainText("Downloaded ✓");
    await expect(badge0).toContainText(MAIN_CARD.slice(-6));
    await expect(badge1).toContainText("Downloaded ✓");
    await expect(badge1).toContainText(FAMILY_CARD.slice(-6));

    const patchCountBefore = patchesOf(recorded).length;

    // Re-download the main card's PDF
    await badge0.click();
    await expect
      .poll(() => recorded.filter((r) => r.method === "GET" && r.path.includes(`/7/0/${MAIN_CARD}.pdf`)).length, { timeout: 8000 })
      .toBe(1);

    // Give any (wrong) side-effect PATCH a chance to fire, then assert none did
    await page.waitForTimeout(800);
    expect(patchesOf(recorded).length).toBe(patchCountBefore);

    // Badge unchanged and still clickable
    await expect(badge0).toBeVisible();
    await expect(badge0).toContainText("Downloaded ✓");
  });

  test("printed order shows 'Printed ✓' badges that still re-download without touching status", async ({ page }) => {
    const recorded = await setupMocks(page, [makeOrder({ status: "printed" })]);
    await openDownloadView(page);

    const badge1 = page.getByTestId("button-redownload-7-1");
    await expect(badge1).toBeVisible({ timeout: 8000 });
    await expect(badge1).toContainText("Printed ✓");
    await expect(badge1).not.toContainText("Downloaded ✓");

    await badge1.click();
    await expect
      .poll(() => recorded.filter((r) => r.method === "GET" && r.path.includes(`/7/1/${FAMILY_CARD}.pdf`)).length, { timeout: 8000 })
      .toBe(1);

    await page.waitForTimeout(800);
    expect(patchesOf(recorded).length).toBe(0);
  });

  test("first download on a pending order still records the download and moves it to processing", async ({ page }) => {
    const pdfs = [
      { cardIndex: 0, pdfUrl: `/api/uploads/card-pdfs/7/0/${MAIN_CARD}.pdf`, downloaded: false },
      { cardIndex: 1, pdfUrl: `/api/uploads/card-pdfs/7/1/${FAMILY_CARD}.pdf`, downloaded: false },
    ];
    const recorded = await setupMocks(page, [makeOrder({ status: "pending", rationCardPdfs: pdfs })]);
    await openDownloadView(page);

    const dlButton = page.getByTestId("button-download-7-0");
    await expect(dlButton).toBeVisible({ timeout: 8000 });
    await dlButton.click();

    // downloaded-flag PATCH for this exact PDF
    await expect
      .poll(() => recorded.filter((r) => r.method === "PATCH" && r.path === "/api/orders/7/pdfs/0/downloaded").length, { timeout: 8000 })
      .toBe(1);
    // status PATCH → processing (first download on a PENDING order)
    await expect
      .poll(
        () =>
          recorded.filter(
            (r) => r.method === "PATCH" && r.path === "/api/orders/7" && JSON.parse(r.body || "{}").status === "processing",
          ).length,
        { timeout: 8000 },
      )
      .toBe(1);
  });

  test("fresh download on an already-printed order never knocks it back to processing", async ({ page }) => {
    const pdfs = [
      { cardIndex: 0, pdfUrl: `/api/uploads/card-pdfs/7/0/${MAIN_CARD}.pdf`, downloaded: true },
      { cardIndex: 1, pdfUrl: `/api/uploads/card-pdfs/7/1/${FAMILY_CARD}.pdf`, downloaded: false },
    ];
    const recorded = await setupMocks(page, [makeOrder({ status: "printed", rationCardPdfs: pdfs })]);
    await openDownloadView(page);

    // PDF 1 was never downloaded → still a fresh Download button
    const dlButton = page.getByTestId("button-download-7-1");
    await expect(dlButton).toBeVisible({ timeout: 8000 });
    await dlButton.click();

    // The downloaded-flag PATCH is fine (it records reality)…
    await expect
      .poll(() => recorded.filter((r) => r.method === "PATCH" && r.path === "/api/orders/7/pdfs/1/downloaded").length, { timeout: 8000 })
      .toBe(1);

    // …but the status PATCH must NOT fire — printed stays printed
    await page.waitForTimeout(800);
    expect(recorded.filter((r) => r.method === "PATCH" && r.path === "/api/orders/7")).toHaveLength(0);
  });

  test("any printable keypress opens the download search (barcode scanner) and searches that card number", async ({ page }) => {
    const recorded = await setupMocks(page, []);
    await openDownloadView(page);
    await expect(page.getByText("No orders found for the selected filters.")).toBeVisible({ timeout: 8000 });

    // Scanner burst — no prior tap on the 🔍 icon
    await page.keyboard.type(FAMILY_CARD, { delay: 20 });

    const input = page.getByPlaceholder("Ration card no.");
    await expect(input).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(50);
    // Exact value — no ghost first character
    await expect(input).toHaveValue(FAMILY_CARD);

    // After the 400 ms debounce the family number goes out as rationCardSearch
    await expect
      .poll(
        () =>
          recorded.filter(
            (r) => r.method === "GET" && r.path === "/api/orders" && r.search.includes(`rationCardSearch=${FAMILY_CARD}`),
          ).length,
        { timeout: 8000 },
      )
      .toBeGreaterThanOrEqual(1);
  });

  test("a single-PDF order's badge is still labelled with its card number", async ({ page }) => {
    const order = makeOrder({
      quantity: 1,
      familyCards: [],
      rationCardPdfs: [{ cardIndex: 0, pdfUrl: `/api/uploads/card-pdfs/7/0/${MAIN_CARD}.pdf`, downloaded: true }],
    });
    await setupMocks(page, [order]);
    await openDownloadView(page);

    const badge = page.getByTestId("button-redownload-7-0");
    await expect(badge).toBeVisible({ timeout: 8000 });
    await expect(badge).toContainText("Downloaded ✓");
    await expect(badge).toContainText(MAIN_CARD.slice(-6));
  });

  test("rapid clicks on two fresh PDFs of one order fire exactly ONE status PATCH", async ({ page }) => {
    const pdfs = [
      { cardIndex: 0, pdfUrl: `/api/uploads/card-pdfs/7/0/${MAIN_CARD}.pdf`, downloaded: false },
      { cardIndex: 1, pdfUrl: `/api/uploads/card-pdfs/7/1/${FAMILY_CARD}.pdf`, downloaded: false },
    ];
    const recorded = await setupMocks(page, [makeOrder({ status: "pending", rationCardPdfs: pdfs })]);
    await openDownloadView(page);

    const b0 = page.getByTestId("button-download-7-0");
    const b1 = page.getByTestId("button-download-7-1");
    await expect(b0).toBeVisible({ timeout: 8000 });

    // Back-to-back clicks with no waiting in between — the race the ref guard closes
    await b0.click();
    await b1.click();

    // Both PDFs get their downloaded-flag PATCH…
    await expect
      .poll(() => recorded.filter((r) => r.method === "PATCH" && /\/pdfs\/\d+\/downloaded$/.test(r.path)).length, { timeout: 8000 })
      .toBe(2);

    // …but the status PATCH fires exactly once
    await page.waitForTimeout(800);
    expect(recorded.filter((r) => r.method === "PATCH" && r.path === "/api/orders/7").length).toBe(1);
  });

  test("sync-failed Retry does NOT knock an order back once it advanced to printed", async ({ page }) => {
    // Mutable mock state: the status PATCH always fails; the list flips to
    // printed after the first (failed) sync — as if a colleague printed it.
    let listOrder = makeOrder({
      status: "pending",
      rationCardPdfs: [{ cardIndex: 0, pdfUrl: `/api/uploads/card-pdfs/7/0/${MAIN_CARD}.pdf`, downloaded: false }],
    });
    let statusPatches = 0;

    await page.addInitScript(() => {
      localStorage.setItem("adminToken", "test-admin-token");
    });
    await page.route("**/api/**", async (route, request) => {
      const url = new URL(request.url());
      const { pathname } = url;
      const method = request.method();

      if (pathname === "/api/admin/me") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ADMIN) });
      } else if (pathname.startsWith("/api/uploads/")) {
        await route.fulfill({ status: 200, contentType: "application/pdf", body: Buffer.from("%PDF-1.4\n%mock") });
      } else if (/^\/api\/orders\/\d+\/pdfs\/\d+\/downloaded$/.test(pathname) && method === "PATCH") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true }) });
      } else if (pathname === "/api/orders/7" && method === "PATCH") {
        statusPatches++;
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) });
      } else if (pathname === "/api/orders" && method === "GET") {
        await route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({ orders: [listOrder], total: 1, page: 1, limit: 200 }),
        });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      }
    });

    await openDownloadView(page);
    const dlButton = page.getByTestId("button-download-7-0");
    await expect(dlButton).toBeVisible({ timeout: 8000 });
    await dlButton.click();

    // First sync fails → amber note + Retry appear. (exact: true — the toast
    // "PDF saved locally — status sync failed" would substring-match too.)
    await expect(page.getByText("Sync failed", { exact: true })).toBeVisible({ timeout: 8000 });
    expect(statusPatches).toBe(1);

    // Meanwhile the order advances to printed (e.g. print station scanned it)
    listOrder = {
      ...listOrder,
      status: "printed",
      rationCardPdfs: [{ cardIndex: 0, pdfUrl: `/api/uploads/card-pdfs/7/0/${MAIN_CARD}.pdf`, downloaded: true }],
    };
    // Changing a filter forces a fresh fetch with the new server state
    await page.locator('input[type="date"]').first().fill("2026-08-01");
    await expect(page.getByTestId("button-redownload-7-0")).toContainText("Printed ✓", { timeout: 8000 });

    // Retry now must NOT re-PATCH the status — it just clears the stale flag
    await page.getByText("Retry", { exact: true }).click();
    await expect(page.getByText("Sync failed", { exact: true })).toBeHidden({ timeout: 8000 });
    await page.waitForTimeout(600);
    expect(statusPatches).toBe(1);
  });

  test("typing into a focused date filter does not hijack the keypress into search", async ({ page }) => {
    await setupMocks(page, []);
    await openDownloadView(page);
    await expect(page.getByText("No orders found for the selected filters.")).toBeVisible({ timeout: 8000 });

    await page.locator('input[type="date"]').first().click();
    await page.keyboard.type("2026", { delay: 20 });
    await page.waitForTimeout(300);

    // Search box stays closed — the keystrokes belonged to the date input
    await expect(page.getByPlaceholder("Ration card no.")).toHaveCount(0);
  });
});

test.describe("Courier print view — family card scanning", () => {
  test("scanning a family member's card auto-marks the order as printed", async ({ page }) => {
    const recorded = await setupMocks(page, [makeOrder()]); // status: processing
    await page.goto("/admin/courier/public");
    await page.getByText("Print Status Update").click();
    await expect(page.getByText("Scan Order Number or Ration Card Number")).toBeVisible({ timeout: 8000 });

    // Scan the FAMILY member's card number (not the main card)
    await page.keyboard.type(FAMILY_CARD, { delay: 20 });

    // Auto-mark must fire: PATCH status → printed
    await expect
      .poll(
        () =>
          recorded.filter(
            (r) => r.method === "PATCH" && r.path === "/api/orders/7" && JSON.parse(r.body || "{}").status === "printed",
          ).length,
        { timeout: 8000 },
      )
      .toBe(1);
  });

  test("a term matching BOTH the order number and a family card counts as a card scan (auto-marks)", async ({ page }) => {
    // Order number "105211" is a prefix of family card "1052111122" — under the
    // old heuristic this looked like a manual order lookup and never auto-marked.
    const order = makeOrder({
      orderNumber: "105211",
      familyCards: [{ customerName: "RATAN BISWAS", rationCardNumber: "1052111122", cardType: "PHH" }],
    });
    const recorded = await setupMocks(page, [order]);
    await page.goto("/admin/courier/public");
    await page.getByText("Print Status Update").click();
    await expect(page.getByText("Scan Order Number or Ration Card Number")).toBeVisible({ timeout: 8000 });

    await page.keyboard.type("105211", { delay: 20 });

    await expect
      .poll(
        () =>
          recorded.filter(
            (r) => r.method === "PATCH" && r.path === "/api/orders/7" && JSON.parse(r.body || "{}").status === "printed",
          ).length,
        { timeout: 8000 },
      )
      .toBe(1);
  });

  test("an order-number lookup (no card match) still does NOT auto-mark", async ({ page }) => {
    const recorded = await setupMocks(page, [makeOrder()]); // orderNumber "1052", cards start with WB…
    await page.goto("/admin/courier/public");
    await page.getByText("Print Status Update").click();
    await expect(page.getByText("Scan Order Number or Ration Card Number")).toBeVisible({ timeout: 8000 });

    await page.keyboard.type("1052", { delay: 20 });

    // Result panel appears…
    await expect(page.getByText("Order #1052")).toBeVisible({ timeout: 8000 });
    // …but no auto-mark PATCH ever fires
    await page.waitForTimeout(1200);
    expect(recorded.filter((r) => r.method === "PATCH" && r.path === "/api/orders/7")).toHaveLength(0);
  });
});
