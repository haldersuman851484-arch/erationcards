import { test, expect, type Page } from "@playwright/test";

/**
 * New "Other PVC Cards" types — end-to-end order checks.
 *
 * Task: 8 new card types joined ABHA / E-SHRAM / GENERAL in the special price
 * group. These tests order one NEW type end-to-end on each form:
 *   Public:   1 AADHAAR  → single tier → ₹100
 *   Operator: 1 VOTER ID → single tier → ₹85
 * and assert the step-1 dropdown lists the complete group.
 *
 * Expected numbers come from @workspace/pricing. The API is mocked (same
 * pattern as mixed-card-pricing.spec.ts); the POST /api/orders body is
 * captured so we can assert the submitted cardType and amount.
 */

const ALL_SPECIAL_TYPES = [
  "ABHA",
  "E-SHRAM",
  "GENERAL",
  "AYUSHMAN BHARAT",
  "AADHAAR",
  "VOTER ID",
  "PAN",
  "APAAR ID",
  "DRIVING LICENCE",
  "BJP MEMBERSHIP CARD",
  "CUSTOM ID CARD",
];

function mockOrderResponse(cardType: string, amount: number, extra: Record<string, unknown> = {}) {
  return {
    id: 1,
    orderNumber: "PVCNEW001",
    customerName: "Rajesh Kumar",
    customerPhone: "9876543210",
    customerEmail: null,
    rationCardNumber: "DOC1234567890",
    deliveryName: "Rajesh Kumar",
    address: "12 Park Street, Kolkata",
    postOffice: "Park Street",
    state: "West Bengal",
    district: "Kolkata",
    pincode: "700001",
    cardType,
    familyCards: [],
    quantity: 1,
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
  { operator, cardType, expectedAmount }: { operator: boolean; cardType: string; expectedAmount: number }
): Promise<Captured> {
  const captured: Captured = { body: null };
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__cashfreeTestFactory = () => ({
      checkout: async () => ({}),
    });
  });
  await page.route("**/api/**", async (route, request) => {
    const { pathname } = new URL(request.url());
    const method = request.method();

    if (pathname === "/api/payments/cashfree/session" && method === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orderNumber: "PVCNEW001", cfOrderId: "PVCNEW001", paymentSessionId: "session_test_new", mode: "sandbox", alreadyPaid: false }) });
    } else if (pathname === "/api/payments/cashfree/status" && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ orderNumber: "PVCNEW001", paymentStatus: "paid" }) });
    } else if (pathname === "/api/orders" && method === "POST") {
      captured.body = request.postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(mockOrderResponse(cardType, expectedAmount, operator ? { operatorId: MOCK_OPERATOR.id } : {})),
      });
    } else if (operator && pathname === "/api/operators/me" && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_OPERATOR) });
    } else {
      await route.continue();
    }
  });
  return captured;
}

test.describe("Public order form — new card types", () => {
  test("dropdown lists all Other PVC Cards and a single AADHAAR order submits ₹100", async ({ page }) => {
    const captured = await setupMocks(page, { operator: false, cardType: "AADHAAR", expectedAmount: 100 });
    await page.goto("/order");

    // Step 1: customer details, then open the card-type dropdown
    await page.getByTestId("input-customer-name").fill("Rajesh Kumar");
    await page.getByTestId("input-ration-card-number").fill("DOC1234567890");
    await page.getByTestId("select-card-type-step1").click();

    // Every special-group option is present (old three + new eight)
    for (const type of ALL_SPECIAL_TYPES) {
      await expect(page.getByRole("option", { name: type, exact: true })).toBeVisible({ timeout: 5000 });
    }
    await page.getByRole("option", { name: "AADHAAR", exact: true }).click();

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

    // Step 3: single-card special pricing (₹100 single tier, new group label)
    const specialLine = page.getByTestId("price-line-special");
    await expect(specialLine).toBeVisible({ timeout: 5000 });
    await expect(specialLine).toContainText("Other PVC Cards — 1 × ₹100");
    await expect(page.getByTestId("text-amount-to-pay")).toHaveText("₹100");

    await page.getByTestId("checkbox-consent").click();
    const submit = page.getByTestId("button-pay-now");
    await expect(submit).toBeEnabled({ timeout: 5000 });
    await submit.click();

    await expect(page.getByTestId("card-step4-upload")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Order created — PVCNEW001")).toBeVisible();

    expect(captured.body).not.toBeNull();
    expect(captured.body.cardType).toBe("AADHAAR");
    expect(Number(captured.body.amount)).toBe(100);
    expect(captured.body.quantity).toBe(1);
    expect(captured.body.familyCards ?? []).toEqual([]);
  });
});

test.describe("Operator order form — new card types", () => {
  test("a single VOTER ID order uses operator pricing and submits ₹85", async ({ page }) => {
    const captured = await setupMocks(page, { operator: true, cardType: "VOTER ID", expectedAmount: 85 });
    await page.addInitScript(() => {
      localStorage.setItem("operatorToken", "test-operator-token");
    });
    await page.goto("/operator/order");

    // Step 1: customer & card details
    await page.getByPlaceholder("Full name on ration card").fill("Rajesh Kumar");
    await page.getByPlaceholder("10-digit mobile").fill("9876543210");
    await page.getByPlaceholder("Card number").fill("DOC1234567890");
    await page.getByTestId("select-card-type-operator").click();

    // Spot-check the new options exist on the operator form too
    for (const type of ["AYUSHMAN BHARAT", "VOTER ID", "DRIVING LICENCE", "CUSTOM ID CARD"]) {
      await expect(page.getByRole("option", { name: type, exact: true })).toBeVisible({ timeout: 5000 });
    }
    await page.getByRole("option", { name: "VOTER ID", exact: true }).click();

    // Live price summary uses the operator single-card rate & new group label
    await expect(page.getByTestId("price-line-special")).toContainText("Other PVC Cards: 1 card × ₹85");

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

    // Step 3: review & pay
    await expect(page.getByTestId("price-line-step3-special")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("price-line-step3-special")).toContainText("₹85");
    await expect(page.getByTestId("button-pay-now")).toContainText("₹85");

    await page.getByTestId("checkbox-consent").click();
    const submit = page.getByTestId("button-pay-now");
    await expect(submit).toBeEnabled({ timeout: 5000 });
    await submit.click();

    await expect(page.getByTestId("card-step4-upload")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Order created — PVCNEW001")).toBeVisible();

    expect(captured.body).not.toBeNull();
    expect(captured.body.cardType).toBe("VOTER ID");
    expect(Number(captured.body.amount)).toBe(85);
    expect(captured.body.quantity).toBe(1);
  });
});
