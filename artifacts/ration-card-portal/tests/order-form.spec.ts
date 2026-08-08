import { test, expect, type Page } from "@playwright/test";

/**
 * Public order form — Cashfree online-payment flow.
 *
 * The Cashfree SDK never loads in tests: `window.__cashfreeTestFactory`
 * (checked first by openCashfreeCheckout) swaps in a fake whose checkout()
 * resolves immediately, simulating the customer closing the payment modal.
 * The server outcome is controlled per-test via the mocked
 * /api/payments/cashfree/status responses.
 */

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
  paymentMethod: "cashfree",
  paymentScreenshotUrl: null,
  operatorId: null,
  trackingNumber: null,
  notes: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
};

const MOCK_SESSION_RESPONSE = {
  orderNumber: "PVCTEST001",
  cfOrderId: "PVCTEST001",
  paymentSessionId: "session_test_abc123",
  mode: "sandbox",
  alreadyPaid: false,
};

type MockOptions = {
  /** HTTP status for POST /api/orders (default 201). */
  orderStatus?: number;
  orderBody?: unknown;
  /** HTTP status for POST /api/payments/cashfree/session (default 200). */
  sessionStatus?: number;
  sessionBody?: unknown;
  /** Successive paymentStatus values returned by the status endpoint; the last repeats. */
  statusSequence?: string[];
};

type Counters = { orderPosts: number; sessionPosts: number; statusGets: number };

async function installCashfreeFake(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__checkoutCalls = 0;
    w.__cashfreeTestFactory = ({ mode }: { mode: string }) => ({
      checkout: async () => {
        w.__checkoutCalls = (w.__checkoutCalls as number) + 1;
        w.__checkoutMode = mode;
        return {};
      },
    });
  });
  // Belt and braces: the fake factory means the real SDK is never imported,
  // but block its CDN anyway so a regression cannot reach the network.
  await page.route("**://sdk.cashfree.com/**", (route) => route.abort());
}

async function setupOrderMocks(page: Page, opts: MockOptions = {}): Promise<Counters> {
  const counters: Counters = { orderPosts: 0, sessionPosts: 0, statusGets: 0 };
  const statusSeq = opts.statusSequence ?? ["paid"];

  await page.route("**/api/**", async (route, request) => {
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname === "/api/orders" && method === "POST") {
      counters.orderPosts += 1;
      await route.fulfill({
        status: opts.orderStatus ?? 201,
        contentType: "application/json",
        body: JSON.stringify(opts.orderBody ?? MOCK_ORDER_RESPONSE),
      });
    } else if (pathname === "/api/payments/cashfree/session" && method === "POST") {
      counters.sessionPosts += 1;
      await route.fulfill({
        status: opts.sessionStatus ?? 200,
        contentType: "application/json",
        body: JSON.stringify(opts.sessionBody ?? MOCK_SESSION_RESPONSE),
      });
    } else if (pathname === "/api/payments/cashfree/status" && method === "GET") {
      const idx = Math.min(counters.statusGets, statusSeq.length - 1);
      counters.statusGets += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orderNumber: "PVCTEST001", paymentStatus: statusSeq[idx] }),
      });
    } else {
      await route.continue();
    }
  });

  return counters;
}

async function fillStep1(page: Page) {
  await page.getByTestId("input-customer-name").fill("Rajesh Kumar");
  await page.getByTestId("input-ration-card-number").fill("WB01234567890");
  await page.getByTestId("button-next-step1").click();
  await expect(page.getByTestId("dialog-family-member")).toBeVisible({ timeout: 5000 });
  await page.getByTestId("button-family-no").click();
}

async function fillStep2(page: Page) {
  await page.getByTestId("input-delivery-name").fill("Rajesh Kumar");
  await page.getByTestId("input-address").fill("12 Park Street, Kolkata");
  await page.getByTestId("input-post-office").fill("Park Street");
  await page.getByTestId("select-district").click();
  const kolkataOption = page.getByRole("option", { name: "Kolkata" });
  await expect(kolkataOption).toBeVisible({ timeout: 5000 });
  await kolkataOption.click();
  await page.getByTestId("input-pincode").fill("700001");
  await page.getByTestId("input-phone").fill("9876543210");
  await page.getByTestId("input-email").fill("rajesh@example.com");
  await expect(page.getByTestId("button-next-step2")).toBeEnabled({ timeout: 3000 });
  await page.getByTestId("button-next-step2").click();
}

async function reachStep3(page: Page) {
  await fillStep1(page);
  await expect(page.getByTestId("input-delivery-name")).toBeVisible({ timeout: 5000 });
  await fillStep2(page);
  await expect(page.getByTestId("checkbox-consent")).toBeVisible({ timeout: 5000 });
}

test.describe("Order form — online payment", () => {
  test("pays online and lands on the PDF upload step", async ({ page }) => {
    await installCashfreeFake(page);
    const counters = await setupOrderMocks(page, { statusSequence: ["paid"] });

    await page.goto("/order");
    await reachStep3(page);

    // Review & Pay: amount is visible, pay stays locked until consent.
    await expect(page.getByTestId("text-amount-to-pay")).toContainText("₹70");
    await expect(page.getByTestId("button-pay-now")).toBeDisabled();

    await page.getByTestId("checkbox-consent").click();
    await expect(page.getByTestId("button-pay-now")).toBeEnabled();
    await page.getByTestId("button-pay-now").click();

    // Modal opened once, order created once, and we advanced to step 4.
    await expect(page.getByTestId("card-step4-upload")).toBeVisible({ timeout: 15000 });
    expect(counters.orderPosts).toBe(1);
    const checkoutCalls = await page.evaluate(
      () => (window as unknown as { __checkoutCalls: number }).__checkoutCalls,
    );
    expect(checkoutCalls).toBe(1);
  });

  test("shows a validation error when customerName is empty and stays on step 1", async ({
    page,
  }) => {
    await installCashfreeFake(page);
    await setupOrderMocks(page);

    await page.goto("/order");
    await page.getByTestId("input-ration-card-number").fill("WB01234567890");
    await page.getByTestId("button-next-step1").click();

    await expect(page.getByTestId("input-customer-name")).toBeVisible();
    await expect(page.getByTestId("input-delivery-name")).not.toBeVisible();
  });

  test("order API 500 keeps the customer on step 3 and never opens the payment modal", async ({
    page,
  }) => {
    await installCashfreeFake(page);
    const counters = await setupOrderMocks(page, {
      orderStatus: 500,
      orderBody: { error: "Failed to create order" },
    });

    await page.goto("/order");
    await reachStep3(page);
    await page.getByTestId("checkbox-consent").click();
    await page.getByTestId("button-pay-now").click();

    await expect(page.getByText("Failed to create order").first()).toBeVisible({
      timeout: 8000,
    });
    await expect(page.getByTestId("checkbox-consent")).toBeVisible();
    expect(counters.sessionPosts).toBe(0);
    const checkoutCalls = await page.evaluate(
      () => (window as unknown as { __checkoutCalls: number }).__checkoutCalls,
    );
    expect(checkoutCalls).toBe(0);
  });

  test("payment service unavailable (503) shows the order-saved note and retry does not duplicate the order", async ({
    page,
  }) => {
    await installCashfreeFake(page);
    const counters = await setupOrderMocks(page, {
      sessionStatus: 503,
      sessionBody: { error: "Online payment is not available right now." },
    });

    await page.goto("/order");
    await reachStep3(page);
    await page.getByTestId("checkbox-consent").click();
    await page.getByTestId("button-pay-now").click();

    await expect(page.getByTestId("pay-unavailable-note")).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("note-order-saved")).toBeVisible();
    expect(counters.orderPosts).toBe(1);

    // Retry: the saved order is reused — only the payment session is retried.
    await page.getByTestId("button-pay-now").click();
    await expect(page.getByTestId("pay-unavailable-note")).toBeVisible({ timeout: 8000 });
    expect(counters.orderPosts).toBe(1);
    expect(counters.sessionPosts).toBe(2);
  });

  test("modal closed without paying shows the do-not-pay-twice note; Check Status finds the payment", async ({
    page,
  }) => {
    await installCashfreeFake(page);
    // Post-modal poll (3 attempts) sees pending; the manual re-check gets "paid".
    await setupOrderMocks(page, {
      statusSequence: ["pending", "pending", "pending", "paid"],
    });

    await page.goto("/order");
    await reachStep3(page);
    await page.getByTestId("checkbox-consent").click();
    await page.getByTestId("button-pay-now").click();

    await expect(page.getByTestId("pay-unconfirmed-note")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("button-check-status").click();
    await expect(page.getByTestId("card-step4-upload")).toBeVisible({ timeout: 15000 });
  });

  test("failed payment shows the money-returns note and offers to try again", async ({
    page,
  }) => {
    await installCashfreeFake(page);
    const counters = await setupOrderMocks(page, { statusSequence: ["failed"] });

    await page.goto("/order");
    await reachStep3(page);
    await page.getByTestId("checkbox-consent").click();
    await page.getByTestId("button-pay-now").click();

    await expect(page.getByTestId("pay-failed-note")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("button-pay-now")).toBeEnabled();
    expect(counters.orderPosts).toBe(1);
  });
});
