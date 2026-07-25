import { test, expect } from "@playwright/test";

/**
 * Barcode-scanner keydown flow — Print Status Update
 *
 * A barcode scanner fires characters in rapid succession (< 50 ms apart).
 * The global keydown listener opens the header input and pre-fills the first
 * character when any printable key is pressed. Subsequent chars arrive while
 * the input is already open and focused, so they flow through onChange.
 *
 * This test verifies:
 *  1. The search input shows the exact scanned value with NO duplicated first
 *     character (ghost-char bug).
 *  2. Exactly one GET /api/orders?quickSearch=… request fires after the
 *     300 ms debounce — not more, not less.
 */

const MOCK_ADMIN = { id: 1, email: "admin@test.com", role: "admin" };

const SCANNED_VALUE = "WB02123456789"; // ration card number a scanner would type

async function setupMocks(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("adminToken", "test-admin-token");
  });

  await page.route("**/api/**", async (route, request) => {
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname === "/api/admin/me") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ADMIN),
      });
    } else if (pathname === "/api/orders/stats") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalOrders: 0, pendingOrders: 0, processingOrders: 0,
          printedOrders: 0, dispatchedOrders: 0, deliveredOrders: 0,
          cancelledOrders: 0, totalRevenue: 0, todayRevenue: 0, todayOrders: 0,
        }),
      });
    } else if (pathname.startsWith("/api/operators")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    } else if (pathname === "/api/orders" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orders: [], total: 0, page: 1, limit: 5 }),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe("Barcode scanner — Print Status Update", () => {
  test("scanner input shows exact scanned value with no duplicated first character", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/admin/courier/public");

    // Select Print Status Update service card
    await page.getByText("Print Status Update").click();

    // Verify we are on the scan view
    await expect(page.getByText("Scan Ration Card or PRN Number")).toBeVisible({ timeout: 8000 });

    // Simulate a barcode scanner: type characters very fast (20 ms apart).
    // The first character is caught by the global keydown listener which opens
    // the input and pre-fills it with that character. Subsequent characters
    // arrive via normal onChange into the now-focused input.
    await page.keyboard.type(SCANNED_VALUE, { delay: 20 });

    // The header input should be visible now
    const input = page.getByPlaceholder("Scan or type ration card no. / order ID…");
    await expect(input).toBeVisible({ timeout: 5000 });

    // Wait a beat for React state to settle before reading value
    await page.waitForTimeout(50);

    // ── assertion 1: no ghost character ──────────────────────────────────────
    // Value must be exactly the scanned string — first char must NOT be doubled.
    await expect(input).toHaveValue(SCANNED_VALUE);
  });

  test("debounce fires exactly one quickSearch request after scanner input", async ({ page }) => {
    // Count GET /api/orders?quickSearch=… requests
    const quickSearchRequests: string[] = [];

    await page.addInitScript(() => {
      localStorage.setItem("adminToken", "test-admin-token");
    });

    await page.route("**/api/**", async (route, request) => {
      const url = new URL(request.url());
      const { pathname } = url;
      const method = request.method();

      if (pathname === "/api/orders" && method === "GET" && url.searchParams.has("quickSearch")) {
        quickSearchRequests.push(url.searchParams.get("quickSearch")!);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ orders: [], total: 0, page: 1, limit: 5 }),
        });
        return;
      }

      // Default stubs
      if (pathname === "/api/admin/me") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ADMIN) });
      } else if (pathname === "/api/orders/stats") {
        await route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({
            totalOrders: 0, pendingOrders: 0, processingOrders: 0,
            printedOrders: 0, dispatchedOrders: 0, deliveredOrders: 0,
            cancelledOrders: 0, totalRevenue: 0, todayRevenue: 0, todayOrders: 0,
          }),
        });
      } else if (pathname.startsWith("/api/operators")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      } else if (pathname === "/api/orders" && method === "GET") {
        await route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({ orders: [], total: 0, page: 1, limit: 5 }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/admin/courier/public");
    await page.getByText("Print Status Update").click();
    await expect(page.getByText("Scan Ration Card or PRN Number")).toBeVisible({ timeout: 8000 });

    // Simulate scanner burst (all chars within ~260 ms total for a 13-char string at 20 ms/char)
    await page.keyboard.type(SCANNED_VALUE, { delay: 20 });

    // Confirm the input is open with the right value before waiting for debounce
    const input = page.getByPlaceholder("Scan or type ration card no. / order ID…");
    await expect(input).toBeVisible({ timeout: 5000 });
    await expect(input).toHaveValue(SCANNED_VALUE);

    // ── wait for debounce (300 ms) + generous buffer ───────────────────────
    await page.waitForTimeout(500);

    // ── assertion 2: exactly one request, carrying the full scanned value ──
    expect(quickSearchRequests).toHaveLength(1);
    expect(quickSearchRequests[0]).toBe(SCANNED_VALUE);
  });
});
