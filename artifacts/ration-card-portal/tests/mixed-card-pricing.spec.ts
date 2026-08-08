import { test, expect, type Page } from "@playwright/test";

/**
 * Mixed-card pricing — end-to-end UI checks for the money path.
 *
 * Expected numbers come from @workspace/pricing:
 *   Public:   1 PHH + 1 ABHA → 2 cards → multi tier → ₹50 + ₹75 = ₹125
 *   Operator: 1 PHH + 1 ABHA → 2 cards → multi tier → ₹40 + ₹70 = ₹110
 *
 * The API is mocked (same pattern as the rest of the suite); the POST /api/orders
 * body is captured so we can assert the submitted amount matches the on-screen
 * total. Server-side recomputation is already locked in by api-server unit tests.
 */

function mockOrderResponse(amount: number, extra: Record<string, unknown> = {}) {
  return {
    id: 1,
    orderNumber: "PVCMIX001",
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
    cardType: "PHH",
    familyCards: [{ customerName: "Sunita Kumar", rationCardNumber: "ABHA1234567890", cardType: "ABHA" }],
    quantity: 2,
    amount: String(amount),
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "upi",
    paymentScreenshotUrl: "https://example.com/screenshot.jpg",
    operatorId: null,
    trackingNumber: null,
    notes: null,
    createdAt: "2024-07-01T10:00:00.000Z",
    updatedAt: "2024-07-01T10:00:00.000Z",
    ...extra,
  };
}

const MOCK_OPERATOR = {
  id: 7,
  name: "Operator One",
  email: "op@test.com",
  shopName: "Test Shop",
  district: "Kolkata",
  phone: "9000000000",
  status: "approved",
};

type Captured = { body: any | null };

async function setupMocks(
  page: Page,
  { operator, expectedAmount }: { operator: boolean; expectedAmount: number }
): Promise<Captured> {
  const captured: Captured = { body: null };
  // Fake Cashfree checkout: openCashfreeCheckout() uses this instead of the SDK.
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__cashfreeTestFactory = () => ({
      checkout: async () => ({}),
    });
  });
  await page.route("**/api/**", async (route, request) => {
    const { pathname } = new URL(request.url());
    const method = request.method();

    if (pathname === "/api/payments/cashfree/session" && method === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orderNumber: "PVCMIX001", cfOrderId: "PVCMIX001", paymentSessionId: "session_test_mix", mode: "sandbox", alreadyPaid: false }) });
    } else if (pathname === "/api/payments/cashfree/status" && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orderNumber: "PVCMIX001", paymentStatus: "paid" }) });
    } else if (pathname === "/api/orders" && method === "POST") {
      captured.body = request.postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(mockOrderResponse(expectedAmount, operator ? { operatorId: MOCK_OPERATOR.id } : {})),
      });
    } else if (operator && pathname === "/api/operators/me" && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_OPERATOR) });
    } else {
      await route.continue();
    }
  });
  return captured;
}

async function pickCardType(page: Page, trigger: ReturnType<Page["locator"]>, type: string) {
  await trigger.click();
  const option = page.getByRole("option", { name: type, exact: true });
  await expect(option).toBeVisible({ timeout: 5000 });
  await option.click();
}

test.describe("Public order form — mixed card pricing", () => {
  test("PHH + family ABHA shows ₹50 + ₹75 breakdown, ₹125 total, and submits that amount", async ({ page }) => {
    const captured = await setupMocks(page, { operator: false, expectedAmount: 125 });
    await page.goto("/order");

    // Step 1: main card = PHH (picked from the grouped dropdown)
    await page.getByTestId("input-customer-name").fill("Rajesh Kumar");
    await page.getByTestId("input-ration-card-number").fill("WB01234567890");
    await pickCardType(page, page.getByTestId("select-card-type-step1"), "PHH");

    // Add a family member with ABHA (different price group)
    await page.getByTestId("button-add-another").click();
    await expect(page.getByTestId("input-family-name")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("input-family-name").fill("Sunita Kumar");
    await page.getByTestId("input-family-number").fill("ABHA1234567890");
    await pickCardType(page, page.getByTestId("select-family-card-type"), "ABHA");
    await page.getByTestId("button-family-save").click();

    await expect(page.getByTestId("family-card-0")).toContainText("ABHA");
    await page.getByTestId("button-next-step1").click();

    // Step 2: delivery
    await expect(page.getByTestId("input-delivery-name")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("input-delivery-name").fill("Rajesh Kumar");
    await page.getByTestId("input-address").fill("12 Park Street, Kolkata");
    await page.getByTestId("input-post-office").fill("Park Street");
    await page.getByTestId("select-district").click();
    const kolkata = page.getByRole("option", { name: "Kolkata", exact: true });
    await expect(kolkata).toBeVisible({ timeout: 5000 });
    await kolkata.click();
    await page.getByTestId("input-pincode").fill("700001");
    await page.getByTestId("input-phone").fill("9876543210");
    await page.getByTestId("input-email").fill("rajesh@example.com");
    await page.getByTestId("button-next-step2").click();

    // Step 3: price breakdown — the money path customers actually see
    const rationLine = page.getByTestId("price-line-ration");
    const specialLine = page.getByTestId("price-line-special");
    await expect(rationLine).toBeVisible({ timeout: 5000 });
    await expect(rationLine).toContainText("Ration Card — 1 × ₹50");
    await expect(rationLine).toContainText("₹50");
    await expect(specialLine).toContainText("ABHA / E-SHRAM / GENERAL — 1 × ₹75");
    await expect(specialLine).toContainText("₹75");
    await expect(page.getByTestId("text-amount-to-pay")).toHaveText("₹125");

    // Consent, then pay online (checkout modal + status poll are mocked to "paid")
    await page.getByTestId("checkbox-consent").click();
    const submit = page.getByTestId("button-pay-now");
    await expect(submit).toBeEnabled({ timeout: 5000 });
    await submit.click();

    // Success advances to the in-page step 4 (card PDF upload)
    await expect(page.getByTestId("card-step4-upload")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Order created — PVCMIX001")).toBeVisible();

    // The submitted amount matches the on-screen total
    expect(captured.body).not.toBeNull();
    expect(Number(captured.body.amount)).toBe(125);
    expect(captured.body.cardType).toBe("PHH");
    expect(captured.body.quantity).toBe(2);
    expect(captured.body.familyCards).toEqual([
      { customerName: "Sunita Kumar", rationCardNumber: "ABHA1234567890", cardType: "ABHA" },
    ]);
  });
});

test.describe("Operator order form — mixed card pricing", () => {
  test("PHH + family ABHA shows operator ₹40 + ₹70 breakdown, ₹110 total, and submits that amount", async ({ page }) => {
    const captured = await setupMocks(page, { operator: true, expectedAmount: 110 });
    await page.addInitScript(() => {
      localStorage.setItem("operatorToken", "test-operator-token");
    });
    await page.goto("/operator/order");

    // Step 1: customer & card details
    await page.getByPlaceholder("Full name on ration card").fill("Rajesh Kumar");
    await page.getByPlaceholder("10-digit mobile").fill("9876543210");
    await page.getByPlaceholder("Card number").fill("WB01234567890");
    // Card type starts unselected — pick it from the placeholder select.
    await pickCardType(page, page.getByTestId("select-card-type-operator"), "PHH");

    // Add a family ABHA card via the dialog
    await page.getByRole("button", { name: /Add Family Card/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByPlaceholder("Full name").fill("Sunita Kumar");
    await dialog.getByPlaceholder("Card number").fill("ABHA1234567890");
    await dialog.locator("button[role='combobox']").click();
    const abha = page.getByRole("option", { name: "ABHA", exact: true });
    await expect(abha).toBeVisible({ timeout: 5000 });
    await abha.click();
    await dialog.getByRole("button", { name: "Save Card" }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Live price summary on step 1 uses operator multi-tier rates
    await expect(page.getByTestId("price-line-ration")).toContainText("Ration Card: 1 card × ₹40");
    await expect(page.getByTestId("price-line-special")).toContainText("ABHA / E-SHRAM / GENERAL: 1 card × ₹70");
    await expect(page.getByText("₹110 total")).toBeVisible();

    await page.getByRole("button", { name: /Next: Delivery Address/ }).click();

    // Step 2: delivery
    await page.getByPlaceholder("Name for delivery").fill("Rajesh Kumar");
    await page.getByPlaceholder("House no, street, locality").fill("12 Park Street, Kolkata");
    await page.getByPlaceholder("Post office").fill("Park Street");
    await page.getByText("Select", { exact: true }).click();
    const kolkata = page.getByRole("option", { name: "Kolkata", exact: true });
    await expect(kolkata).toBeVisible({ timeout: 5000 });
    await kolkata.click();
    await page.getByPlaceholder("6-digit PIN").fill("700001");
    await page.getByPlaceholder("customer@example.com").fill("rajesh@example.com");
    await page.getByRole("button", { name: /Next: Payment/ }).click();

    // Step 3: review & pay shows the same operator total & breakdown
    await expect(page.getByTestId("price-line-step3-ration")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("price-line-step3-ration")).toContainText("₹40");
    await expect(page.getByTestId("price-line-step3-special")).toContainText("₹70");
    await expect(page.getByTestId("button-pay-now")).toContainText("₹110");

    await page.getByTestId("checkbox-consent").click();
    const submit = page.getByTestId("button-pay-now");
    await expect(submit).toBeEnabled({ timeout: 5000 });
    await submit.click();

    // Success advances to the in-page step 4 (card PDF upload)
    await expect(page.getByTestId("card-step4-upload")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Order created — PVCMIX001")).toBeVisible();

    expect(captured.body).not.toBeNull();
    expect(Number(captured.body.amount)).toBe(110);
    expect(captured.body.quantity).toBe(2);
  });
});
