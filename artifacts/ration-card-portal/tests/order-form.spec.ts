import { test, expect } from "@playwright/test";

const MOCK_ORDER_RESPONSE = {
  id: 1,
  orderNumber: "PVCTEST001",
  customerName: "Rajesh Kumar",
  customerPhone: "9876543210",
  customerEmail: null,
  rationCardNumber: "WB01234567890",
  deliveryName: "Rajesh Kumar",
  address: "12 Park Street, Kolkata",
  postOffice: "Park Street",
  state: "West Bengal",
  district: "Kolkata",
  pincode: "700001",
  cardType: "AAY",
  familyCards: [],
  quantity: 1,
  amount: "70",
  status: "pending",
  paymentStatus: "pending",
  paymentMethod: "upi",
  paymentScreenshotUrl: "https://example.com/screenshot.jpg",
  operatorId: null,
  trackingNumber: null,
  notes: null,
  createdAt: "2024-07-01T10:00:00.000Z",
  updatedAt: "2024-07-01T10:00:00.000Z",
};

async function setupOrderMocks(page: import("@playwright/test").Page) {
  await page.route("**/api/**", async (route, request) => {
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname === "/api/payments/upi-config" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ merchantUpiId: "test@upi" }),
      });
    } else if (
      pathname === "/api/payments/upload-screenshot" &&
      method === "POST"
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: "https://example.com/screenshot.jpg" }),
      });
    } else if (pathname === "/api/orders" && method === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ORDER_RESPONSE),
      });
    } else {
      await route.continue();
    }
  });
}

async function fillStep1(page: import("@playwright/test").Page) {
  await page.getByTestId("input-customer-name").fill("Rajesh Kumar");
  await page.getByTestId("input-ration-card-number").fill("WB01234567890");
  await page.getByTestId("button-next-step1").click();
  await expect(page.getByTestId("dialog-family-member")).toBeVisible({
    timeout: 5000,
  });
  await page.getByTestId("button-family-no").click();
}

async function fillStep2(page: import("@playwright/test").Page) {
  await page.getByTestId("input-delivery-name").fill("Rajesh Kumar");
  await page.getByTestId("input-address").fill("12 Park Street, Kolkata");
  await page.getByTestId("input-post-office").fill("Park Street");
  await page.getByTestId("select-district").click();
  const kolkataOption = page.getByRole("option", { name: "Kolkata" });
  await expect(kolkataOption).toBeVisible({ timeout: 5000 });
  await kolkataOption.click();
  await page.getByTestId("input-pincode").fill("700001");
  await page.getByTestId("input-phone").fill("9876543210");
  await expect(page.getByTestId("button-next-step2")).toBeEnabled({ timeout: 3000 });
  await page.getByTestId("button-next-step2").click();
}

async function reachStep3(page: import("@playwright/test").Page) {
  await fillStep1(page);
  await expect(page.getByTestId("input-delivery-name")).toBeVisible({
    timeout: 5000,
  });
  await fillStep2(page);
  await expect(page.getByTestId("button-upload-screenshot")).toBeVisible({
    timeout: 5000,
  });
  await page.setInputFiles('[data-testid="input-screenshot"]', {
    name: "screenshot.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from("fake-image-data"),
  });
  await expect(page.locator("text=Screenshot selected")).toBeVisible({
    timeout: 3000,
  });
}

test.describe("Order form", () => {
  test("completes all 3 steps and submits the order successfully", async ({
    page,
  }) => {
    await setupOrderMocks(page);
    await page.goto("/order");

    await fillStep1(page);

    await expect(page.getByTestId("input-delivery-name")).toBeVisible({
      timeout: 5000,
    });
    await fillStep2(page);

    await expect(page.getByTestId("button-upload-screenshot")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("text-merchant-upi-id")).toContainText(
      "test@upi"
    );

    await page.setInputFiles('[data-testid="input-screenshot"]', {
      name: "screenshot.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("fake-image-data"),
    });

    await expect(page.locator("text=Screenshot selected")).toBeVisible({
      timeout: 3000,
    });

    const submitButton = page.getByTestId("button-submit-order");
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
    await submitButton.click();

    await expect(page).toHaveURL(/\/order-upload\/PVCTEST001/, {
      timeout: 10000,
    });
  });

  test("shows a validation error when customerName is empty and stays on step 1", async ({
    page,
  }) => {
    await setupOrderMocks(page);
    await page.goto("/order");

    await page.getByTestId("input-ration-card-number").fill("WB01234567890");
    await page.getByTestId("button-next-step1").click();

    await expect(
      page.locator("text=Name must be at least 2 characters")
    ).toBeVisible({ timeout: 3000 });

    await expect(page.getByTestId("dialog-family-member")).not.toBeVisible();
    await expect(page.getByTestId("input-customer-name")).toBeVisible();
  });

  test("accepts a screenshot file and shows a preview before submission", async ({
    page,
  }) => {
    await setupOrderMocks(page);
    await page.goto("/order");

    await fillStep1(page);
    await expect(page.getByTestId("input-delivery-name")).toBeVisible({
      timeout: 5000,
    });
    await fillStep2(page);

    await expect(page.getByTestId("button-upload-screenshot")).toBeVisible({
      timeout: 5000,
    });

    await page.setInputFiles('[data-testid="input-screenshot"]', {
      name: "payment.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake-png-data"),
    });

    await expect(page.locator("text=Screenshot selected")).toBeVisible({
      timeout: 3000,
    });
    await expect(
      page.getByTestId("button-upload-screenshot")
    ).not.toBeVisible();
  });

  test("shows an error and stays on step 3 when the order API returns 500 after screenshot upload", async ({
    page,
  }) => {
    await page.route("**/api/**", async (route, request) => {
      const url = new URL(request.url());
      const { pathname } = url;
      const method = request.method();

      if (pathname === "/api/payments/upi-config" && method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ merchantUpiId: "test@upi" }),
        });
      } else if (
        pathname === "/api/payments/upload-screenshot" &&
        method === "POST"
      ) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ url: "https://example.com/screenshot.jpg" }),
        });
      } else if (pathname === "/api/orders" && method === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/order");
    await reachStep3(page);

    const submitButton = page.getByTestId("button-submit-order");
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
    await submitButton.click();

    await expect(
      page.getByText("Failed to place order", { exact: true }).first()
    ).toBeVisible({
      timeout: 8000,
    });
    await expect(page).not.toHaveURL(/\/order-upload\//, { timeout: 3000 });
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
  });

  test("shows an upload error and does not call the order API when screenshot upload fails", async ({
    page,
  }) => {
    let orderApiCalled = false;

    await page.route("**/api/**", async (route, request) => {
      const url = new URL(request.url());
      const { pathname } = url;
      const method = request.method();

      if (pathname === "/api/payments/upi-config" && method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ merchantUpiId: "test@upi" }),
        });
      } else if (
        pathname === "/api/payments/upload-screenshot" &&
        method === "POST"
      ) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Upload service unavailable" }),
        });
      } else if (pathname === "/api/orders" && method === "POST") {
        orderApiCalled = true;
        await route.continue();
      } else {
        await route.continue();
      }
    });

    await page.goto("/order");
    await reachStep3(page);

    const submitButton = page.getByTestId("button-submit-order");
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
    await submitButton.click();

    await expect(page.getByText("Upload failed", { exact: true }).first()).toBeVisible({
      timeout: 8000,
    });
    await expect(page).not.toHaveURL(/\/order-upload\//, { timeout: 3000 });
    expect(orderApiCalled).toBe(false);
    await expect(submitButton).toBeEnabled({ timeout: 5000 });
  });
});
