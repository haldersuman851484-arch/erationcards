import { test, expect } from "@playwright/test";

/**
 * Manual payment verification was removed: staff can no longer confirm or
 * reject payments, and payment screenshots are no longer shown anywhere.
 * These tests pin down the new read-only behavior for both legacy
 * (screenshot-era) orders and Cashfree gateway orders.
 */

const MOCK_ADMIN = { id: 1, email: "admin@test.com", role: "admin" };

const MOCK_STATS = {
  totalOrders: 1,
  pendingOrders: 1,
  processingOrders: 0,
  printedOrders: 0,
  dispatchedOrders: 0,
  deliveredOrders: 0,
  cancelledOrders: 0,
  totalRevenue: 149,
  todayRevenue: 149,
  todayOrders: 1,
};

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    orderNumber: "PVCPAY001",
    customerName: "Anita Bose",
    customerPhone: "9988776655",
    customerEmail: null,
    rationCardNumber: "WB-01-999999999",
    deliveryName: null,
    address: "5 Park Street",
    postOffice: null,
    state: "West Bengal",
    district: "Kolkata",
    pincode: "700016",
    cardType: "PHH",
    familyCards: [],
    rationCardPdfs: [],
    quantity: 1,
    amount: "149",
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "upi",
    paymentScreenshotUrl: "https://example.com/screenshot.jpg",
    operatorId: null,
    trackingNumber: null,
    courierName: null,
    notes: null,
    createdAt: "2024-07-10T08:00:00.000Z",
    updatedAt: "2024-07-10T08:00:00.000Z",
    ...overrides,
  };
}

type OrderShape = ReturnType<typeof makeOrder>;

async function setupMocks(
  page: import("@playwright/test").Page,
  { orders }: { orders: OrderShape[] }
) {
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
        body: JSON.stringify(MOCK_STATS),
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
        body: JSON.stringify({ orders, total: orders.length, page: 1, limit: 20 }),
      });
    } else if (/^\/api\/orders\/\d+$/.test(pathname) && method === "GET") {
      const id = parseInt(pathname.split("/").pop()!);
      const order = orders.find((o) => o.id === id) ?? orders[0];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(order),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe("Payment status display — manual verification removed", () => {
  test("legacy screenshot order shows its status read-only: no confirm/reject buttons, no screenshot link", async ({ page }) => {
    const orders = [makeOrder()];
    await setupMocks(page, { orders });

    await page.goto("/processing");
    await expect(page.locator("text=PVCPAY001")).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId("button-confirm-payment-42")).not.toBeVisible();
    await expect(page.getByTestId("button-reject-payment-42")).not.toBeVisible();
    await expect(page.getByTestId("button-view-screenshot-42")).not.toBeVisible();
    // A legacy order never shows the Cashfree awaiting badge — just its plain status.
    await expect(page.getByTestId("badge-awaiting-payment-42")).not.toBeVisible();
  });

  test("legacy order detail dialog has no screenshot viewer and no confirm/reject actions", async ({ page }) => {
    const orders = [makeOrder()];
    await setupMocks(page, { orders });

    await page.goto("/processing");
    await expect(page.locator("text=PVCPAY001")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("button-view-order-42").click();
    await expect(page.getByText("Order Details")).toBeVisible({ timeout: 5000 });

    await expect(page.getByTestId("button-dialog-screenshot")).not.toBeVisible();
    await expect(page.getByTestId("button-dialog-confirm-payment")).not.toBeVisible();
    await expect(page.getByTestId("button-dialog-reject-payment")).not.toBeVisible();
    // The awaiting-payment note is Cashfree-only — a legacy order must not show it.
    await expect(page.getByTestId("dialog-awaiting-payment-note")).not.toBeVisible();
  });

  test("already-confirmed legacy order shows confirmed status with no controls", async ({ page }) => {
    const orders = [makeOrder({ paymentStatus: "confirmed" })];
    await setupMocks(page, { orders });

    await page.goto("/processing");
    await expect(page.locator("text=PVCPAY001")).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("confirmed").first()).toBeVisible();
    await expect(page.getByTestId("button-confirm-payment-42")).not.toBeVisible();
    await expect(page.getByTestId("button-reject-payment-42")).not.toBeVisible();
  });

  test("cashfree order awaiting payment shows amber badge and no Confirm/Reject buttons", async ({ page }) => {
    const orders = [
      makeOrder({ paymentMethod: "cashfree", paymentStatus: "pending", paymentScreenshotUrl: null }),
    ];
    await setupMocks(page, { orders });

    await page.goto("/processing");
    await expect(page.locator("text=PVCPAY001")).toBeVisible({ timeout: 10000 });

    // Online payments are confirmed by the gateway, not by staff.
    await expect(page.getByTestId("badge-awaiting-payment-42")).toBeVisible();
    await expect(page.getByTestId("button-confirm-payment-42")).not.toBeVisible();
    await expect(page.getByTestId("button-reject-payment-42")).not.toBeVisible();

    // The detail dialog explains the automatic status instead of offering buttons.
    await page.getByTestId("button-view-order-42").click();
    await expect(page.getByTestId("dialog-awaiting-payment-note")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("button-dialog-confirm-payment")).not.toBeVisible();
  });
});
