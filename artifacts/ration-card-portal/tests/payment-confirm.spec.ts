import { test, expect } from "@playwright/test";

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
  {
    orders,
    onPaymentUpdate,
  }: {
    orders: OrderShape[];
    onPaymentUpdate?: (id: number, body: Record<string, unknown>) => void;
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
    } else if (/^\/api\/orders\/\d+\/payment-status$/.test(pathname) && method === "PATCH") {
      const id = parseInt(pathname.split("/")[3]);
      const body = JSON.parse(request.postData() ?? "{}");
      onPaymentUpdate?.(id, body);
      const original = orders.find((o) => o.id === id) ?? orders[0];
      const updated = { ...original, ...body };
      const idx = orders.findIndex((o) => o.id === id);
      if (idx !== -1) Object.assign(orders[idx], body);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(updated),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe("Payment confirmation", () => {
  test("Confirm button disappears after confirming payment and shows confirmed badge", async ({ page }) => {
    const orders = [makeOrder()];

    await setupMocks(page, {
      orders,
      onPaymentUpdate: (_id, body) => { Object.assign(orders[0], body); },
    });

    await page.goto("/processing");
    await expect(page.getByTestId("button-confirm-payment-42")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("button-reject-payment-42")).toBeVisible();

    await page.getByTestId("button-confirm-payment-42").click();

    await expect(page.getByTestId("button-confirm-payment-42")).not.toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("button-reject-payment-42")).not.toBeVisible();

    await expect(page.getByText("confirmed").first()).toBeVisible({ timeout: 5000 });
  });

  test("Reject button disappears after rejecting payment and shows rejected badge", async ({ page }) => {
    const orders = [makeOrder()];

    await setupMocks(page, {
      orders,
      onPaymentUpdate: (_id, body) => { Object.assign(orders[0], body); },
    });

    await page.goto("/processing");
    await expect(page.getByTestId("button-reject-payment-42")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("button-reject-payment-42").click();

    await expect(page.getByTestId("button-confirm-payment-42")).not.toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("button-reject-payment-42")).not.toBeVisible();

    await expect(page.getByText("rejected").first()).toBeVisible({ timeout: 5000 });
  });

  test("already-confirmed order shows no Confirm or Reject buttons", async ({ page }) => {
    const orders = [makeOrder({ paymentStatus: "confirmed" })];

    await setupMocks(page, { orders });

    await page.goto("/processing");
    await expect(page.locator("text=PVCPAY001")).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId("button-confirm-payment-42")).not.toBeVisible();
    await expect(page.getByTestId("button-reject-payment-42")).not.toBeVisible();

    await expect(page.getByText("confirmed").first()).toBeVisible();
  });
});
