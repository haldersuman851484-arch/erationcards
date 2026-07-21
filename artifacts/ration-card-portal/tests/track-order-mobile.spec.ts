import { test, expect } from "@playwright/test";

const MOCK_ORDER_BASE = {
  id: 1,
  orderNumber: "PVCTEST001",
  customerName: "Rajesh Kumar",
  customerPhone: "9876543210",
  customerEmail: null,
  rationCardNumber: "WB-01-123456789",
  deliveryName: null,
  address: "12 Park Street",
  postOffice: null,
  state: "West Bengal",
  district: "Kolkata",
  pincode: "700001",
  cardType: "BPL",
  familyCards: [],
  amount: "149",
  trackingNumber: null,
  paymentId: "pay_test123",
  paymentScreenshotUrl: null,
  operatorId: null,
  notes: null,
  createdAt: "2024-07-01T10:00:00.000Z",
  updatedAt: "2024-07-01T10:00:00.000Z",
};

const MOCK_ORDER = { ...MOCK_ORDER_BASE, status: "processing" };
const MOCK_DISPATCHED_ORDER = { ...MOCK_ORDER_BASE, status: "dispatched" };
const MOCK_PENDING_ORDER = { ...MOCK_ORDER_BASE, status: "pending" };
const MOCK_DELIVERED_ORDER = { ...MOCK_ORDER_BASE, status: "delivered" };

test.describe("Track Order page — mobile layout", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test.beforeEach(async ({ page }) => {
    await page.route("**/api/orders/track**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ORDER),
      });
    });
  });

  test("search form submits and result card renders without horizontal scroll", async ({
    page,
  }) => {
    await page.goto("/track");

    const orderInput = page.getByTestId("input-order-number");
    await expect(orderInput).toBeVisible();
    await orderInput.fill("PVCTEST001");

    const searchButton = page.getByTestId("button-track-search");
    await expect(searchButton).toBeEnabled();
    await searchButton.click();

    const result = page.getByTestId("order-tracking-result");
    await expect(result).toBeVisible({ timeout: 10000 });

    await expect(page.getByTestId("text-order-number")).toContainText(
      "PVCTEST001"
    );
    await expect(page.getByTestId("text-customer-name")).toContainText(
      "Rajesh Kumar"
    );
    await expect(page.getByTestId("status-order")).toContainText("processing");

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test("WhatsApp notify button is visible with correct wa.me href", async ({
    page,
  }) => {
    await page.goto("/track");

    const orderInput = page.getByTestId("input-order-number");
    await orderInput.fill("PVCTEST001");

    const searchButton = page.getByTestId("button-track-search");
    await searchButton.click();

    await expect(page.getByTestId("order-tracking-result")).toBeVisible({
      timeout: 10000,
    });

    const whatsappButton = page.getByTestId("button-whatsapp-notify");
    await expect(whatsappButton).toBeVisible();

    const href = await whatsappButton.getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\//);
    expect(href).toContain("PVCTEST001");
  });
});

async function searchAndWaitForResult(page: import("@playwright/test").Page) {
  await page.goto("/track");
  await page.getByTestId("input-order-number").fill("PVCTEST001");
  await page.getByTestId("button-track-search").click();
  await expect(page.getByTestId("order-tracking-result")).toBeVisible({
    timeout: 10000,
  });
}

test.describe("Track Order page — delivery address block", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/orders/track**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DISPATCHED_ORDER),
      });
    });
  });

  test("delivery address block shows street, district, state, and pincode for a dispatched order", async ({
    page,
  }) => {
    await searchAndWaitForResult(page);

    const addressBlock = page.getByTestId("delivery-address");
    await expect(addressBlock).toBeVisible();
    await expect(addressBlock).toContainText("12 Park Street");
    await expect(addressBlock).toContainText("Kolkata");
    await expect(addressBlock).toContainText("West Bengal");
    await expect(addressBlock).toContainText("700001");
  });
});

test.describe("Track Order page — estimated delivery banner", () => {
  test("banner appears for dispatched orders", async ({ page }) => {
    await page.route("**/api/orders/track**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DISPATCHED_ORDER),
      });
    });

    await searchAndWaitForResult(page);

    const banner = page.getByTestId("estimated-delivery");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Expected in 5–7 working days");
  });

  test("banner is absent for pending orders", async ({ page }) => {
    await page.route("**/api/orders/track**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PENDING_ORDER),
      });
    });

    await searchAndWaitForResult(page);

    await expect(page.getByTestId("estimated-delivery")).not.toBeVisible();
  });

  test("banner is absent for delivered orders", async ({ page }) => {
    await page.route("**/api/orders/track**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DELIVERED_ORDER),
      });
    });

    await searchAndWaitForResult(page);

    await expect(page.getByTestId("estimated-delivery")).not.toBeVisible();
  });
});
