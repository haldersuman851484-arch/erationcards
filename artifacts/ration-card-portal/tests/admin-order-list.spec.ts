import { test, expect } from "@playwright/test";

const MOCK_ADMIN = { id: 1, email: "admin@test.com", role: "admin" };

const MOCK_STATS = {
  totalOrders: 3,
  pendingOrders: 1,
  processingOrders: 0,
  printedOrders: 0,
  dispatchedOrders: 1,
  deliveredOrders: 1,
  cancelledOrders: 0,
  totalRevenue: 447,
  todayRevenue: 447,
  todayOrders: 3,
};

function makeOrder(overrides: Record<string, unknown>) {
  return {
    id: 1,
    orderNumber: "PVC001",
    customerName: "Test User",
    customerPhone: "9876543210",
    customerEmail: null,
    rationCardNumber: "WB-01-111111111",
    deliveryName: null,
    address: "1 Test Road",
    postOffice: null,
    state: "West Bengal",
    district: "Kolkata",
    pincode: "700001",
    cardType: "BPL",
    familyCards: [],
    quantity: 1,
    amount: "149",
    status: "pending",
    paymentStatus: "confirmed",
    paymentMethod: "upi",
    paymentScreenshotUrl: null,
    operatorId: null,
    trackingNumber: null,
    notes: null,
    createdAt: "2024-07-01T10:00:00.000Z",
    updatedAt: "2024-07-01T10:00:00.000Z",
    ...overrides,
  };
}

const SEED_ORDERS = [
  makeOrder({ id: 1, orderNumber: "PVC001", customerName: "Rajesh Kumar", status: "pending" }),
  makeOrder({ id: 2, orderNumber: "PVC002", customerName: "Priya Sharma", status: "dispatched" }),
  makeOrder({ id: 3, orderNumber: "PVC003", customerName: "Suresh Patel", status: "delivered" }),
];

type OrderShape = ReturnType<typeof makeOrder>;

async function setupMocks(
  page: import("@playwright/test").Page,
  {
    orders = SEED_ORDERS,
    onStatusUpdate,
  }: {
    orders?: OrderShape[];
    onStatusUpdate?: (id: number, body: Record<string, unknown>) => void;
  } = {}
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
      const statusFilter = url.searchParams.get("status");
      const filtered = statusFilter
        ? orders.filter((o) => o.status === statusFilter)
        : orders;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orders: filtered, total: filtered.length, page: 1, limit: 20 }),
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
      const original = orders.find((o) => o.id === id) ?? orders[0];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...original, ...body }),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe("Admin order list", () => {
  test("renders several seeded orders and shows their statuses", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/processing");

    await expect(page.locator("text=PVC001")).toBeVisible({ timeout: 10000 });

    await expect(page.locator("text=PVC002")).toBeVisible();
    await expect(page.locator("text=PVC003")).toBeVisible();

    await expect(page.locator("text=Rajesh Kumar")).toBeVisible();
    await expect(page.locator("text=Priya Sharma")).toBeVisible();
    await expect(page.locator("text=Suresh Patel")).toBeVisible();

    await expect(page.getByTestId("badge-order-status-1")).toContainText("pending");
    await expect(page.getByTestId("badge-order-status-2")).toContainText("dispatched");
    await expect(page.getByTestId("badge-order-status-3")).toContainText("delivered");
  });

  test("status filter shows only orders matching the selected status", async ({ page }) => {
    await setupMocks(page);
    await page.goto("/processing");

    await expect(page.locator("text=PVC001")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("select-status-filter").click();
    await page.getByRole("option", { name: "Dispatched" }).click();

    await expect(page.locator("text=PVC002")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=PVC001")).not.toBeVisible();
    await expect(page.locator("text=PVC003")).not.toBeVisible();
  });

  test("updating order status from the detail dialog persists the new status in the order list", async ({ page }) => {
    const orderState = [
      makeOrder({ id: 1, orderNumber: "PVC001", customerName: "Rajesh Kumar", status: "pending" }),
    ];

    await setupMocks(page, {
      orders: orderState,
      onStatusUpdate: (id, body) => {
        const target = orderState.find((o) => o.id === id);
        if (target) Object.assign(target, body);
      },
    });

    await page.goto("/processing");
    await expect(page.getByTestId("button-view-order-1")).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId("badge-order-status-1")).toContainText("pending");

    await page.getByTestId("button-view-order-1").click();
    await expect(page.getByTestId("select-dialog-status")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("select-dialog-status").click();
    await page.getByRole("option", { name: "Processing" }).click();

    await expect(page.getByTestId("badge-order-status-1")).toContainText("processing", {
      timeout: 8000,
    });
  });
});
