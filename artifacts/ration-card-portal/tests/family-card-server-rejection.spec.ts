import { test, expect, type Page } from "@playwright/test";

// A server 400 whose `details` point into the familyCards array must
// highlight the exact family-card row (red border + inline message), scroll
// back to step 1, and show a toast naming the bad card. The client-side
// dialog normally prevents invalid entries, so we force the 400 via a route
// mock — this is the "schema drift / bypassed client" path.
//
// Two `details` shapes are covered (both produced by the server):
//  - CreateOrderBody ZodError: path ["familyCards", 1, "customerName"]
//  - FamilyCardsSchema.safeParse: path [1, "customerName"] (array-relative)

const ABSOLUTE_DETAILS = [
  { path: ["familyCards", 1, "customerName"], code: "too_small", message: "String must contain at least 2 character(s)" },
];
const RELATIVE_DETAILS = [
  { path: [1, "customerName"], code: "invalid_type", message: "Required" },
];

const ABSOLUTE_MESSAGE = "Card holder name is missing or too short";
const RELATIVE_MESSAGE = "Card holder name is required";

function mockApis(page: Page, details: unknown) {
  return page.route("**/api/**", async (route, request) => {
    const { pathname } = new URL(request.url());
    const method = request.method();
    if (pathname === "/api/payments/upi-config" && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ merchantUpiId: "test@upi" }) });
    } else if (pathname === "/api/orders" && method === "POST") {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid familyCards", details }),
      });
    } else if (pathname === "/api/operators/me" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 1, name: "Test Operator", shopName: "Test Shop", district: "Kolkata", email: "op@example.com", status: "active" }),
      });
    } else {
      await route.continue();
    }
  });
}

async function assertRowHighlighted(page: Page, message: string) {
  const row = page.getByTestId("family-card-1");
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row).toHaveClass(/border-red-500/);
  const error = page.getByTestId("family-card-error-1");
  await expect(error).toBeVisible();
  await expect(error).toHaveText(message);
  // The un-rejected sibling row must NOT be highlighted.
  await expect(page.getByTestId("family-card-0")).not.toHaveClass(/border-red-500/);
  await expect(page.getByTestId("family-card-error-0")).toHaveCount(0);
  // Toast names the offending card (1-based).
  await expect(page.getByText("Please fix family member card 2", { exact: true })).toBeVisible();
}

/* ─────────────────────────── Public /order form ─────────────────────────── */

async function publicAddFamilyCard(page: Page, name: string, cardNumber: string) {
  await page.getByTestId("button-add-another").click();
  await expect(page.getByTestId("input-family-name")).toBeVisible({ timeout: 5000 });
  await page.getByTestId("input-family-name").fill(name);
  await page.getByTestId("input-family-number").fill(cardNumber);
  await page.getByTestId("button-family-save").click();
  await expect(page.getByTestId("input-family-name")).not.toBeVisible();
}

async function publicSubmitWithTwoFamilyCards(page: Page) {
  await page.goto("/order");
  // Step 1: main card + two family cards.
  await page.getByTestId("input-customer-name").fill("Rajesh Kumar");
  await page.getByTestId("input-ration-card-number").fill("WB01234567890");
  await publicAddFamilyCard(page, "Sunita Devi", "WB09876543210");
  await publicAddFamilyCard(page, "Amit Kumar", "WB05554443332");
  await expect(page.getByTestId("family-card-1")).toBeVisible();
  await page.getByTestId("button-next-step1").click();

  // Step 2: delivery details.
  await expect(page.getByTestId("input-delivery-name")).toBeVisible({ timeout: 5000 });
  await page.getByTestId("input-delivery-name").fill("Rajesh Kumar");
  await page.getByTestId("input-address").fill("12 Park Street, Kolkata");
  await page.getByTestId("input-post-office").fill("Park Street");
  await page.getByTestId("select-district").click();
  const kolkata = page.getByRole("option", { name: "Kolkata" });
  await expect(kolkata).toBeVisible({ timeout: 5000 });
  await kolkata.click();
  await page.getByTestId("input-pincode").fill("700001");
  await page.getByTestId("input-phone").fill("9876543210");
  await page.getByTestId("input-email").fill("rajesh@example.com");
  await page.getByTestId("button-next-step2").click();

  // Step 3: review & pay. The 422 fires on POST /api/orders, before any
  // payment session is requested — no Cashfree mocks needed.
  await expect(page.getByTestId("checkbox-consent")).toBeVisible({ timeout: 5000 });
  await page.getByTestId("checkbox-consent").click();
  const submit = page.getByTestId("button-pay-now");
  await expect(submit).toBeEnabled({ timeout: 5000 });
  await submit.click();
}

test.describe("Public order form: family-card server rejection", () => {
  test('400 with path ["familyCards", 1, "customerName"] highlights row 1 and returns to step 1', async ({ page }) => {
    await mockApis(page, ABSOLUTE_DETAILS);
    await publicSubmitWithTwoFamilyCards(page);
    await assertRowHighlighted(page, ABSOLUTE_MESSAGE);
    // Back on step 1 — the main-card inputs are visible again.
    await expect(page.getByTestId("input-customer-name")).toBeVisible();
  });

  test('400 with array-relative path [1, "customerName"] highlights row 1 and returns to step 1', async ({ page }) => {
    await mockApis(page, RELATIVE_DETAILS);
    await publicSubmitWithTwoFamilyCards(page);
    await assertRowHighlighted(page, RELATIVE_MESSAGE);
    await expect(page.getByTestId("input-customer-name")).toBeVisible();
  });
});

/* ─────────────────── Operator /operator/place-order form ─────────────────── */

async function operatorAddFamilyCard(page: Page, name: string, cardNumber: string) {
  await page.getByRole("button", { name: "Add Family Card" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await dialog.getByPlaceholder("Full name").fill(name);
  await dialog.getByPlaceholder("Card number").fill(cardNumber);
  await dialog.getByRole("button", { name: "Save Card" }).click();
  await expect(dialog).not.toBeVisible();
}

async function operatorSubmitWithTwoFamilyCards(page: Page) {
  await page.addInitScript(() => localStorage.setItem("operatorToken", "test-token"));
  await page.goto("/operator/order");

  // Step 1: customer + card details, plus two family cards.
  await expect(page.getByPlaceholder("Full name on ration card")).toBeVisible({ timeout: 10000 });
  await page.getByPlaceholder("Full name on ration card").fill("Rajesh Kumar");
  await page.getByPlaceholder("10-digit mobile").fill("9876543210");
  await page.getByPlaceholder("Card number").fill("WB01234567890");
  await operatorAddFamilyCard(page, "Sunita Devi", "WB09876543210");
  await operatorAddFamilyCard(page, "Amit Kumar", "WB05554443332");
  await expect(page.getByTestId("family-card-1")).toBeVisible();
  await page.getByRole("button", { name: /Next: Delivery Address/ }).click();

  // Step 2: delivery details.
  await expect(page.getByPlaceholder("Name for delivery")).toBeVisible({ timeout: 5000 });
  await page.getByPlaceholder("Name for delivery").fill("Rajesh Kumar");
  await page.getByPlaceholder("House no, street, locality").fill("12 Park Street, Kolkata");
  await page.getByPlaceholder("Post office").fill("Park Street");
  await page.getByRole("combobox").click();
  const kolkata = page.getByRole("option", { name: "Kolkata" });
  await expect(kolkata).toBeVisible({ timeout: 5000 });
  await kolkata.click();
  await page.getByPlaceholder("6-digit PIN").fill("700001");
  await page.getByTestId("input-email").fill("rajesh@example.com");
  await page.getByRole("button", { name: /Next: Payment/ }).click();

  // Step 3: review & pay. The 422 fires on POST /api/orders, before any
  // payment session is requested — no Cashfree mocks needed.
  await expect(page.getByTestId("checkbox-consent")).toBeVisible({ timeout: 5000 });
  await page.getByTestId("checkbox-consent").click();
  const submit = page.getByTestId("button-pay-now");
  await expect(submit).toBeEnabled({ timeout: 5000 });
  await submit.click();
}

test.describe("Operator place-order form: family-card server rejection", () => {
  test('400 with path ["familyCards", 1, "customerName"] highlights row 1 and returns to step 1', async ({ page }) => {
    await mockApis(page, ABSOLUTE_DETAILS);
    await operatorSubmitWithTwoFamilyCards(page);
    await assertRowHighlighted(page, ABSOLUTE_MESSAGE);
    // Back on step 1 — the main-card inputs are visible again.
    await expect(page.getByPlaceholder("Full name on ration card")).toBeVisible();
  });

  test('400 with array-relative path [1, "customerName"] highlights row 1 and returns to step 1', async ({ page }) => {
    await mockApis(page, RELATIVE_DETAILS);
    await operatorSubmitWithTwoFamilyCards(page);
    await assertRowHighlighted(page, RELATIVE_MESSAGE);
    await expect(page.getByPlaceholder("Full name on ration card")).toBeVisible();
  });
});
