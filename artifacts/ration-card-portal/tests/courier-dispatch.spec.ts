import { test, expect } from "@playwright/test";

const MOCK_ADMIN = { id: 1, email: "admin@test.com", role: "admin" };

const MOCK_STATS = {
  totalOrders: 1,
  pendingOrders: 0,
  processingOrders: 0,
  printedOrders: 1,
  dispatchedOrders: 0,
  deliveredOrders: 0,
  cancelledOrders: 0,
  totalRevenue: 149,
  todayRevenue: 149,
  todayOrders: 1,
};

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    orderNumber: "PVCDSP001",
    customerName: "Mohan Das",
    customerPhone: "9000011111",
    customerEmail: null,
    rationCardNumber: "WB-02-888888888",
    deliveryName: "Mohan Das",
    address: "12 Lake Road",
    postOffice: "Ballygunge",
    state: "West Bengal",
    district: "Kolkata",
    pincode: "700019",
    cardType: "PHH",
    familyCards: [],
    rationCardPdfs: [],
    quantity: 1,
    amount: "149",
    status: "printed",
    paymentStatus: "confirmed",
    paymentMethod: "upi",
    paymentScreenshotUrl: null,
    operatorId: null,
    trackingNumber: null,
    courierName: null,
    notes: null,
    createdAt: "2024-07-15T09:00:00.000Z",
    updatedAt: "2024-07-15T09:00:00.000Z",
    ...overrides,
  };
}

type OrderShape = ReturnType<typeof makeOrder>;

async function setupMocks(
  page: import("@playwright/test").Page,
  {
    orders,
    onStatusUpdate,
  }: {
    orders: OrderShape[];
    onStatusUpdate?: (id: number, body: Record<string, unknown>) => void;
  }
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
    } else if (/^\/api\/orders\/\d+$/.test(pathname) && method === "PATCH") {
      const id = parseInt(pathname.split("/").pop()!);
      const body = JSON.parse(request.postData() ?? "{}");
      onStatusUpdate?.(id, body);
      const idx = orders.findIndex((o) => o.id === id);
      if (idx !== -1) Object.assign(orders[idx], body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...(orders[idx] ?? orders[0]), ...body }),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe("Courier dispatch form", () => {
  test("selecting 'Dispatched' shows the courier form instead of immediately updating status", async ({ page }) => {
    const orders = [makeOrder()];
    await setupMocks(page, { orders });

    await page.goto("/admin/dashboard");
    await expect(page.getByTestId("button-view-order-7")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-view-order-7").click();

    await expect(page.getByTestId("select-dialog-status")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("select-dialog-status").click();
    await page.getByRole("option", { name: "Dispatched" }).click();

    await expect(page.getByTestId("section-dispatch-form")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("select-dispatch-courier")).toBeVisible();
    await expect(page.getByTestId("input-dispatch-tracking")).toBeVisible();

    await expect(page.getByTestId("badge-order-status-7")).not.toContainText("dispatched");
  });

  test("Confirm Dispatch button is disabled until a courier is selected", async ({ page }) => {
    const orders = [makeOrder()];
    await setupMocks(page, { orders });

    await page.goto("/admin/dashboard");
    await expect(page.getByTestId("button-view-order-7")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-view-order-7").click();

    await expect(page.getByTestId("select-dialog-status")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("select-dialog-status").click();
    await page.getByRole("option", { name: "Dispatched" }).click();

    await expect(page.getByTestId("button-confirm-dispatch")).toBeDisabled({ timeout: 5000 });

    await page.getByTestId("select-dispatch-courier").click();
    await page.getByRole("option", { name: "India Post" }).click();

    await expect(page.getByTestId("button-confirm-dispatch")).toBeEnabled({ timeout: 3000 });
  });

  test("submitting dispatch form with courier + tracking sends both fields and updates order status", async ({ page }) => {
    const orders = [makeOrder()];
    let capturedBody: Record<string, unknown> = {};

    await setupMocks(page, {
      orders,
      onStatusUpdate: (_id, body) => {
        capturedBody = body;
        Object.assign(orders[0], body);
      },
    });

    await page.goto("/admin/dashboard");
    await expect(page.getByTestId("button-view-order-7")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-view-order-7").click();

    await expect(page.getByTestId("select-dialog-status")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("select-dialog-status").click();
    await page.getByRole("option", { name: "Dispatched" }).click();

    await expect(page.getByTestId("section-dispatch-form")).toBeVisible({ timeout: 5000 });

    await page.getByTestId("select-dispatch-courier").click();
    await page.getByRole("option", { name: "Delhivery" }).click();

    await page.getByTestId("input-dispatch-tracking").fill("DEL987654321");
    await page.getByTestId("button-confirm-dispatch").click();

    await expect(page.getByTestId("badge-order-status-7")).toContainText("dispatched", { timeout: 8000 });
    expect(capturedBody.status).toBe("dispatched");
    expect(capturedBody.courierName).toBe("Delhivery");
    expect(capturedBody.trackingNumber).toBe("DEL987654321");
    await expect(page.getByTestId("section-dispatch-form")).not.toBeVisible({ timeout: 3000 });
  });

  test("Cancel button hides the dispatch form without updating the order", async ({ page }) => {
    const orders = [makeOrder()];
    let patchCalled = false;

    await setupMocks(page, {
      orders,
      onStatusUpdate: () => { patchCalled = true; },
    });

    await page.goto("/admin/dashboard");
    await expect(page.getByTestId("button-view-order-7")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-view-order-7").click();

    await expect(page.getByTestId("select-dialog-status")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("select-dialog-status").click();
    await page.getByRole("option", { name: "Dispatched" }).click();

    await expect(page.getByTestId("section-dispatch-form")).toBeVisible({ timeout: 5000 });

    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByTestId("section-dispatch-form")).not.toBeVisible({ timeout: 3000 });
    expect(patchCalled).toBe(false);
    await expect(page.getByTestId("badge-order-status-7")).not.toContainText("dispatched");
  });
});
