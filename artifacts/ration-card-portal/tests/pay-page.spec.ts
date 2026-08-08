import { test, expect, type Page } from "@playwright/test";

/**
 * /pay/:orderNumber — standalone resume-payment page.
 *
 * Reached from the Cashfree return URL, the Track Order banner, and the
 * upload page's "Complete Payment" link. Uses the same
 * `window.__cashfreeTestFactory` seam as the order-form spec.
 */

function makeTrackedOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    orderNumber: "PVCPAY777",
    customerName: "Anita Bose",
    rationCardNumber: "WB-01-999999999",
    cardType: "PHH",
    familyCards: [],
    quantity: 1,
    amount: "149",
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "cashfree",
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

type MockOptions = {
  /** null → track endpoint answers 404. */
  order: Record<string, unknown> | null;
  statusSequence?: string[];
  sessionStatus?: number;
  sessionBody?: unknown;
};

async function installCashfreeFake(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__checkoutCalls = 0;
    w.__cashfreeTestFactory = () => ({
      checkout: async () => {
        w.__checkoutCalls = (w.__checkoutCalls as number) + 1;
        return {};
      },
    });
  });
  await page.route("**://sdk.cashfree.com/**", (route) => route.abort());
}

async function setupPayPageMocks(page: Page, opts: MockOptions) {
  const counters = { statusGets: 0, sessionPosts: 0 };
  const statusSeq = opts.statusSequence ?? ["pending"];

  await page.route("**/api/**", async (route, request) => {
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname === "/api/orders/track" && method === "GET") {
      if (opts.order === null) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "Order not found" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(opts.order),
        });
      }
    } else if (pathname === "/api/payments/cashfree/status" && method === "GET") {
      const idx = Math.min(counters.statusGets, statusSeq.length - 1);
      counters.statusGets += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orderNumber: "PVCPAY777", paymentStatus: statusSeq[idx] }),
      });
    } else if (pathname === "/api/payments/cashfree/session" && method === "POST") {
      counters.sessionPosts += 1;
      await route.fulfill({
        status: opts.sessionStatus ?? 200,
        contentType: "application/json",
        body: JSON.stringify(
          opts.sessionBody ?? {
            orderNumber: "PVCPAY777",
            cfOrderId: "PVCPAY777",
            paymentSessionId: "session_test_pay777",
            mode: "sandbox",
            alreadyPaid: false,
          },
        ),
      });
    } else {
      await route.continue();
    }
  });

  return counters;
}

test.describe("Pay page (/pay/:orderNumber)", () => {
  test("unpaid order shows the amount and completes payment through the modal", async ({
    page,
  }) => {
    await installCashfreeFake(page);
    // Mount-time sync poll sees pending; the post-modal poll gets "paid".
    await setupPayPageMocks(page, {
      order: makeTrackedOrder(),
      statusSequence: ["pending", "pending", "pending", "paid"],
    });

    await page.goto("/pay/PVCPAY777");
    await expect(page.getByTestId("pay-page-pay-card")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("text-amount-to-pay")).toContainText("₹149");

    await page.getByTestId("button-pay-now").click();
    await expect(page.getByTestId("pay-page-paid")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("link-upload-pdfs")).toBeVisible();
  });

  test("webhook race: an order that just got paid flips to the paid view without any click", async ({
    page,
  }) => {
    await installCashfreeFake(page);
    // DB still says pending, but the status sync (webhook already landed at
    // Cashfree) reports paid on the mount-time re-check.
    await setupPayPageMocks(page, {
      order: makeTrackedOrder(),
      statusSequence: ["paid"],
    });

    await page.goto("/pay/PVCPAY777");
    await expect(page.getByTestId("pay-page-paid")).toBeVisible({ timeout: 10000 });
  });

  test("already-paid order goes straight to the paid view", async ({ page }) => {
    await installCashfreeFake(page);
    const counters = await setupPayPageMocks(page, {
      order: makeTrackedOrder({ paymentStatus: "paid" }),
    });

    await page.goto("/pay/PVCPAY777");
    await expect(page.getByTestId("pay-page-paid")).toBeVisible({ timeout: 10000 });
    expect(counters.sessionPosts).toBe(0);
  });

  test("failed order shows the previous-payment-failed note before retrying", async ({
    page,
  }) => {
    await installCashfreeFake(page);
    await setupPayPageMocks(page, {
      order: makeTrackedOrder({ paymentStatus: "failed" }),
      statusSequence: ["pending"],
    });

    await page.goto("/pay/PVCPAY777");
    await expect(page.getByTestId("pay-page-pay-card")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("note-previous-failed")).toBeVisible();
  });

  test("legacy screenshot order is explained instead of asked to pay again", async ({
    page,
  }) => {
    await installCashfreeFake(page);
    await setupPayPageMocks(page, {
      order: makeTrackedOrder({ paymentMethod: "upi" }),
    });

    await page.goto("/pay/PVCPAY777");
    await expect(page.getByTestId("pay-legacy-note")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("button-pay-now")).not.toBeVisible();
  });

  test("rejected order points the customer to support", async ({ page }) => {
    await installCashfreeFake(page);
    await setupPayPageMocks(page, {
      order: makeTrackedOrder({ paymentStatus: "rejected" }),
    });

    await page.goto("/pay/PVCPAY777");
    await expect(page.getByTestId("pay-page-rejected")).toBeVisible({ timeout: 10000 });
  });

  test("unknown order number shows not-found with a way back", async ({ page }) => {
    await installCashfreeFake(page);
    await setupPayPageMocks(page, { order: null });

    await page.goto("/pay/DOESNOTEXIST");
    await expect(page.getByTestId("pay-page-notfound")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("link-track")).toBeVisible();
  });
});
