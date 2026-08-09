import { test, expect, type Page } from "@playwright/test";

/**
 * Step-1 inline PDF upload + post-payment auto-attach (3-step flow).
 *
 * Customers can attach the e-ration-card PDF for each card while typing its
 * details on step 1. The files are held in the browser and pushed through
 * POST /api/orders/:orderNumber/upload-card-pdf automatically after payment.
 * Payment is the last step: the success screen always appears right after it
 * (the submit call only reports whether the confirmation email went out).
 * Missing or failed PDFs never block anything — the success screen points
 * the customer to the Track Order page to upload or replace them.
 *
 * The Cashfree SDK never loads: window.__cashfreeTestFactory swaps in a fake
 * whose checkout() resolves immediately, and the status endpoint reports
 * "paid" straight away.
 */

const pdfFile = (name: string) => ({
  name,
  mimeType: "application/pdf",
  buffer: Buffer.from(`%PDF-1.4\n% fake test pdf: ${name}\n`),
});

function mockOrder(familyCards: Array<Record<string, string>>, amount: string) {
  return {
    id: 1,
    orderNumber: "PVCPDF001",
    customerName: "Rajesh Kumar",
    customerPhone: "9876543210",
    customerEmail: "rajesh@example.com",
    rationCardNumber: "WB01234567890",
    deliveryName: "Rajesh Kumar",
    address: "12 Park Street, Kolkata",
    postOffice: "Park Street",
    state: "West Bengal",
    district: "Kolkata",
    pincode: "700001",
    cardType: "AAY",
    familyCards,
    quantity: 1 + familyCards.length,
    amount,
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
}

const MOCK_SESSION = {
  orderNumber: "PVCPDF001",
  cfOrderId: "PVCPDF001",
  paymentSessionId: "session_test_abc123",
  mode: "sandbox",
  alreadyPaid: false,
};

type Captured = { cardIndex: string; filename: string };
type Counters = { orderPosts: number; uploadPosts: number; submitPosts: number; uploads: Captured[] };

async function installCashfreeFake(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__cashfreeTestFactory = () => ({ checkout: async () => ({}) });
  });
  await page.route("**://sdk.cashfree.com/**", (route) => route.abort());
}

/**
 * Mocks the order/payment/upload/submit endpoints.
 * `uploadStatusSeq` gives the HTTP status per successive upload call
 * (the last value repeats), so a 500-then-200 retry can be simulated.
 */
async function setupMocks(
  page: Page,
  opts: { orderBody: unknown; uploadStatusSeq?: number[] } ,
): Promise<Counters> {
  const counters: Counters = { orderPosts: 0, uploadPosts: 0, submitPosts: 0, uploads: [] };
  const uploadSeq = opts.uploadStatusSeq ?? [200];

  await page.route("**/api/**", async (route, request) => {
    const { pathname } = new URL(request.url());
    const method = request.method();

    if (pathname === "/api/orders" && method === "POST") {
      counters.orderPosts += 1;
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(opts.orderBody) });
    } else if (pathname === "/api/payments/cashfree/session" && method === "POST") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SESSION) });
    } else if (pathname === "/api/payments/cashfree/status" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orderNumber: "PVCPDF001", paymentStatus: "paid" }),
      });
    } else if (pathname === "/api/orders/PVCPDF001/upload-card-pdf" && method === "POST") {
      const status = uploadSeq[Math.min(counters.uploadPosts, uploadSeq.length - 1)];
      counters.uploadPosts += 1;
      const raw = request.postData() ?? "";
      const cardIndex = /name="cardIndex"\r?\n\r?\n(\d+)/.exec(raw)?.[1] ?? "?";
      const filename = /filename="([^"]+)"/.exec(raw)?.[1] ?? "?";
      if (status >= 400) {
        await route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: "Storage unavailable" }) });
      } else {
        counters.uploads.push({ cardIndex, filename });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ pdfUrl: `/api/uploads/card-pdfs/${cardIndex}.pdf`, originalFilename: filename }),
        });
      }
    } else if (pathname === "/api/orders/PVCPDF001/submit" && method === "POST") {
      counters.submitPosts += 1;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, emailSent: true }) });
    } else {
      await route.continue();
    }
  });

  return counters;
}

async function pickCardType(page: Page, testId: string, type: string) {
  await page.getByTestId(testId).click();
  const option = page.getByRole("option", { name: type, exact: true });
  await expect(option).toBeVisible({ timeout: 5000 });
  await option.click();
}

async function fillPrimaryCard(page: Page) {
  await pickCardType(page, "select-card-type-step1", "AAY");
  await page.getByTestId("input-customer-name").fill("Rajesh Kumar");
  await page.getByTestId("input-ration-card-number").fill("WB01234567890");
}

/** Opens a fresh extra-card panel and fills it (commit happens on Add More / Next). */
async function fillNewFamilyCard(page: Page, name: string, cardNumber: string) {
  await page.getByTestId("button-add-another").click();
  await expect(page.getByTestId("input-family-name")).toBeVisible({ timeout: 5000 });
  await expect(page.getByTestId("input-family-name")).toHaveValue("");
  await pickCardType(page, "select-family-card-type", "PHH");
  await page.getByTestId("input-family-name").fill(name);
  await page.getByTestId("input-family-number").fill(cardNumber);
}

async function fillStep2(page: Page) {
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
  await expect(page.getByTestId("button-next-step2")).toBeEnabled({ timeout: 3000 });
  await page.getByTestId("button-next-step2").click();
}

async function payOnStep3(page: Page) {
  await expect(page.getByTestId("checkbox-consent")).toBeVisible({ timeout: 5000 });
  await page.getByTestId("checkbox-consent").click();
  const pay = page.getByTestId("button-pay-now");
  await expect(pay).toBeEnabled({ timeout: 5000 });
  await pay.click();
}

test.describe("Step-1 inline PDF upload", () => {
  test("PDFs attached at step 1 upload automatically after payment and the order submits itself", async ({ page }) => {
    await installCashfreeFake(page);
    const counters = await setupMocks(page, {
      orderBody: mockOrder([{ customerName: "Sunita Devi", rationCardNumber: "WB09876543210", cardType: "PHH" }], "100"),
    });
    await page.goto("/order");

    // Primary card + its PDF (dropzone appears once the three fields are filled).
    await fillPrimaryCard(page);
    await expect(page.getByTestId("pdf-dropzone-0")).toBeVisible();
    await page.getByTestId("input-pdf-file-0").setInputFiles(pdfFile("card0.pdf"));
    await expect(page.getByTestId("text-pending-pdf-name-0")).toHaveText("card0.pdf");

    // Second card + its PDF, committed by Next.
    await fillNewFamilyCard(page, "Sunita Devi", "WB09876543210");
    await expect(page.getByTestId("pdf-dropzone-1")).toBeVisible();
    await page.getByTestId("input-pdf-file-1").setInputFiles(pdfFile("card1.pdf"));
    await expect(page.getByTestId("text-pending-pdf-name-1")).toHaveText("card1.pdf");
    await page.getByTestId("button-next-step1").click();

    await fillStep2(page);
    await payOnStep3(page);

    // Both uploads run and the success screen appears — no clicks needed.
    await expect(page.getByTestId("order-success-card")).toBeVisible({ timeout: 15000 });
    expect(counters.uploadPosts).toBe(2);
    expect(counters.uploads).toEqual([
      { cardIndex: "0", filename: "card0.pdf" },
      { cardIndex: "1", filename: "card1.pdf" },
    ]);
    expect(counters.submitPosts).toBe(1);
    // All PDFs made it — the note says they can be replaced via Track Order.
    await expect(page.getByTestId("note-pdf-attached")).toBeVisible();
    await expect(page.getByTestId("note-pdf-pending")).toHaveCount(0);
  });

  test("dropzone appears only when details are complete, rejects non-PDFs, and remove restores it", async ({ page }) => {
    await installCashfreeFake(page);
    await setupMocks(page, { orderBody: mockOrder([], "70") });
    await page.goto("/order");

    // Nothing filled — no dropzone yet.
    await expect(page.getByTestId("pdf-dropzone-0")).not.toBeVisible();
    await page.getByTestId("input-customer-name").fill("Rajesh Kumar");
    await expect(page.getByTestId("pdf-dropzone-0")).not.toBeVisible();
    await page.getByTestId("input-ration-card-number").fill("WB01234567890");
    await pickCardType(page, "select-card-type-step1", "AAY");
    await expect(page.getByTestId("pdf-dropzone-0")).toBeVisible();

    // A photo is rejected with a friendly toast (aria-live duplicates the text).
    await page.getByTestId("input-pdf-file-0").setInputFiles({
      name: "photo.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("not a pdf"),
    });
    await expect(page.getByText("Only PDF files allowed").first()).toBeVisible();
    await expect(page.getByTestId("pending-pdf-chip-0")).toHaveCount(0);
    await expect(page.getByTestId("pdf-dropzone-0")).toBeVisible();

    // A real PDF shows the chip; removing it restores the dropzone.
    await page.getByTestId("input-pdf-file-0").setInputFiles(pdfFile("mycard.pdf"));
    await expect(page.getByTestId("text-pending-pdf-name-0")).toHaveText("mycard.pdf");
    await expect(page.getByTestId("pdf-dropzone-0")).not.toBeVisible();
    await page.getByTestId("button-remove-pending-pdf-0").click();
    await expect(page.getByTestId("pdf-dropzone-0")).toBeVisible();
  });

  test("with no PDFs attached, the success screen shows straight after payment and points to Track Order", async ({ page }) => {
    await installCashfreeFake(page);
    const counters = await setupMocks(page, { orderBody: mockOrder([], "70") });
    await page.goto("/order");

    await fillPrimaryCard(page);
    await page.getByTestId("button-family-no").click();
    await fillStep2(page);
    await payOnStep3(page);

    await expect(page.getByTestId("order-success-card")).toBeVisible({ timeout: 15000 });
    expect(counters.uploadPosts).toBe(0);
    expect(counters.submitPosts).toBe(1);
    // The PDF is still missing — the note points to the Track Order page.
    await expect(page.getByTestId("note-pdf-pending")).toBeVisible();
    await expect(page.getByTestId("note-pdf-attached")).toHaveCount(0);
  });

  test("a failed auto-upload never blocks the success screen — a toast points to Track Order", async ({ page }) => {
    await installCashfreeFake(page);
    const counters = await setupMocks(page, {
      orderBody: mockOrder([], "70"),
      uploadStatusSeq: [500],
    });
    await page.goto("/order");

    await fillPrimaryCard(page);
    await page.getByTestId("input-pdf-file-0").setInputFiles(pdfFile("card0.pdf"));
    await expect(page.getByTestId("text-pending-pdf-name-0")).toHaveText("card0.pdf");
    await page.getByTestId("button-family-no").click();
    await fillStep2(page);
    await payOnStep3(page);

    // Auto-upload fails → friendly toast, but the order is done regardless.
    await expect(page.getByText("One PDF could not be attached").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("order-success-card")).toBeVisible({ timeout: 15000 });
    expect(counters.uploadPosts).toBe(1);
    expect(counters.submitPosts).toBe(1);
    await expect(page.getByTestId("note-pdf-pending")).toBeVisible();
  });

  test("deleting a card re-keys held PDFs so each file reaches the right card", async ({ page }) => {
    await installCashfreeFake(page);
    const counters = await setupMocks(page, {
      orderBody: mockOrder([{ customerName: "Amit Kumar", rationCardNumber: "WB05554443332", cardType: "PHH" }], "100"),
    });
    await page.goto("/order");

    // Primary (no PDF) + family card A with a PDF.
    await fillPrimaryCard(page);
    await fillNewFamilyCard(page, "Sunita Devi", "WB09876543210");
    await page.getByTestId("input-pdf-file-1").setInputFiles(pdfFile("cardA.pdf"));
    await expect(page.getByTestId("text-pending-pdf-name-1")).toHaveText("cardA.pdf");

    // "Add More" commits A and opens the panel for card B (cardIndex 2).
    await page.getByTestId("button-add-another").click();
    await pickCardType(page, "select-family-card-type", "PHH");
    await page.getByTestId("input-family-name").fill("Amit Kumar");
    await page.getByTestId("input-family-number").fill("WB05554443332");
    await page.getByTestId("input-pdf-file-2").setInputFiles(pdfFile("cardB.pdf"));
    await expect(page.getByTestId("text-pending-pdf-name-2")).toHaveText("cardB.pdf");

    // Delete committed card A — B's held PDF must shift from slot 2 to slot 1.
    await page.getByTestId("button-delete-family-0").click();
    await expect(page.getByTestId("text-pending-pdf-name-1")).toHaveText("cardB.pdf");

    await page.getByTestId("button-next-step1").click();
    await fillStep2(page);
    await payOnStep3(page);

    // Only B's PDF uploads, to cardIndex 1; the primary card's PDF is still
    // missing, so the success note points to the Track Order page.
    await expect(page.getByTestId("order-success-card")).toBeVisible({ timeout: 15000 });
    expect(counters.uploads).toEqual([{ cardIndex: "1", filename: "cardB.pdf" }]);
    expect(counters.submitPosts).toBe(1);
    await expect(page.getByTestId("note-pdf-pending")).toBeVisible();
  });

  test("editing a family card keeps its PDF when unchanged and drops it when the details change", async ({ page }) => {
    await installCashfreeFake(page);
    await setupMocks(page, {
      orderBody: mockOrder([{ customerName: "Sunita Devi", rationCardNumber: "WB09876543210", cardType: "PHH" }], "100"),
    });
    await page.goto("/order");

    await fillPrimaryCard(page);
    await fillNewFamilyCard(page, "Sunita Devi", "WB09876543210");
    await page.getByTestId("input-pdf-file-1").setInputFiles(pdfFile("sunita.pdf"));
    await expect(page.getByTestId("text-pending-pdf-name-1")).toHaveText("sunita.pdf");

    // Commit via "Add More" (opens a fresh blank panel), close the blank panel.
    await page.getByTestId("button-add-another").click();
    await expect(page.getByTestId("input-family-name")).toHaveValue("");
    await page.getByTestId("button-delete-card-panel").click();
    await expect(page.getByTestId("summary-pdf-tag-1")).toBeVisible();

    // Re-open the card and commit WITHOUT changes — the file must survive.
    await page.getByTestId("button-edit-family-0").click();
    await expect(page.getByTestId("input-family-name")).toHaveValue("Sunita Devi");
    await page.getByTestId("button-add-another").click();
    await expect(page.getByTestId("input-family-name")).toHaveValue("");
    await page.getByTestId("button-delete-card-panel").click();
    await expect(page.getByTestId("summary-pdf-tag-1")).toBeVisible();
    await expect(page.getByText("Attached PDF removed")).toHaveCount(0);

    // Re-open and CHANGE the card number — someone else's PDF must not ride
    // along: the file is dropped with a clear message.
    await page.getByTestId("button-edit-family-0").click();
    await page.getByTestId("input-family-number").fill("WB01112223334");
    await page.getByTestId("button-add-another").click();
    await expect(page.getByText("Attached PDF removed").first()).toBeVisible();
    await expect(page.getByTestId("input-family-name")).toHaveValue("");
    await page.getByTestId("button-delete-card-panel").click();
    await expect(page.getByTestId("summary-pdf-tag-1")).toHaveCount(0);
  });

  test("clearing a card's details after attaching keeps the file and blocks moving on", async ({ page }) => {
    await installCashfreeFake(page);
    await setupMocks(page, {
      orderBody: mockOrder([{ customerName: "Sunita Devi", rationCardNumber: "WB09876543210", cardType: "PHH" }], "100"),
    });
    await page.goto("/order");

    await fillPrimaryCard(page);
    await fillNewFamilyCard(page, "Sunita Devi", "WB09876543210");
    await page.getByTestId("input-pdf-file-1").setInputFiles(pdfFile("sunita.pdf"));
    await expect(page.getByTestId("pending-pdf-chip-1")).toBeVisible();

    // Blank out the text fields — the chip must stay visible even though the
    // dropzone-gating condition (all details filled) no longer holds.
    await page.getByTestId("input-family-name").fill("");
    await page.getByTestId("input-family-number").fill("");
    await expect(page.getByTestId("pending-pdf-chip-1")).toBeVisible();

    // Moving on is blocked by validation; the file is never silently lost.
    await page.getByTestId("button-next-step1").click();
    await expect(page.getByTestId("family-editor-error")).toBeVisible();
    await expect(page.getByTestId("input-delivery-name")).not.toBeVisible();
    await expect(page.getByTestId("pending-pdf-chip-1")).toBeVisible();

    // Refilling the SAME details keeps the binding intact — no drop, no toast.
    await page.getByTestId("input-family-name").fill("Sunita Devi");
    await page.getByTestId("input-family-number").fill("WB09876543210");
    await page.getByTestId("button-next-step1").click();
    await expect(page.getByTestId("input-delivery-name")).toBeVisible();
    await expect(page.getByText("Attached PDF removed")).toHaveCount(0);
  });

  test("changing the primary card's details after attaching drops the held file", async ({ page }) => {
    await installCashfreeFake(page);
    const counters = await setupMocks(page, { orderBody: mockOrder([], "70") });
    await page.goto("/order");

    await fillPrimaryCard(page);
    await page.getByTestId("input-pdf-file-0").setInputFiles(pdfFile("old-number.pdf"));
    await expect(page.getByTestId("pending-pdf-chip-0")).toBeVisible();

    // The customer corrects the card number afterwards — the held file may
    // belong to the old number, so it is dropped (with a message) on Next.
    await page.getByTestId("input-ration-card-number").fill("WB09999999999");
    await page.getByTestId("button-next-step1").click();
    await expect(page.getByText("Attached PDF removed").first()).toBeVisible();
    await expect(page.getByTestId("input-delivery-name")).toBeVisible();

    // After payment nothing auto-uploads — the success note points to Track Order.
    await fillStep2(page);
    await payOnStep3(page);
    await expect(page.getByTestId("order-success-card")).toBeVisible({ timeout: 15000 });
    expect(counters.uploadPosts).toBe(0);
    expect(counters.submitPosts).toBe(1);
    await expect(page.getByTestId("note-pdf-pending")).toBeVisible();
  });
});
