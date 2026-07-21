import { test, expect } from "@playwright/test";

const MOCK_ORDER = {
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
  status: "processing",
  amount: "149",
  trackingNumber: null,
  paymentId: "pay_test123",
  paymentScreenshotUrl: null,
  operatorId: null,
  notes: null,
  createdAt: "2024-07-01T10:00:00.000Z",
  updatedAt: "2024-07-01T10:00:00.000Z",
};

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

    const href = await whatsappButton.locator("a").getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\//);
    expect(href).toContain("PVCTEST001");
  });
});
