# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: order-form.spec.ts >> Order form >> accepts a screenshot file and shows a preview before submission
- Location: tests/order-form.spec.ts:164:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('input-customer-name')

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | const MOCK_ORDER_RESPONSE = {
  4   |   id: 1,
  5   |   orderNumber: "PVCTEST001",
  6   |   customerName: "Rajesh Kumar",
  7   |   customerPhone: "9876543210",
  8   |   customerEmail: null,
  9   |   rationCardNumber: "WB01234567890",
  10  |   deliveryName: "Rajesh Kumar",
  11  |   address: "12 Park Street, Kolkata",
  12  |   postOffice: "Park Street",
  13  |   state: "West Bengal",
  14  |   district: "Kolkata",
  15  |   pincode: "700001",
  16  |   cardType: "AAY",
  17  |   familyCards: [],
  18  |   quantity: 1,
  19  |   amount: "70",
  20  |   status: "pending",
  21  |   paymentStatus: "pending",
  22  |   paymentMethod: "upi",
  23  |   paymentScreenshotUrl: "https://example.com/screenshot.jpg",
  24  |   operatorId: null,
  25  |   trackingNumber: null,
  26  |   notes: null,
  27  |   createdAt: "2024-07-01T10:00:00.000Z",
  28  |   updatedAt: "2024-07-01T10:00:00.000Z",
  29  | };
  30  | 
  31  | async function setupOrderMocks(page: import("@playwright/test").Page) {
  32  |   await page.route("**/api/**", async (route, request) => {
  33  |     const url = new URL(request.url());
  34  |     const { pathname } = url;
  35  |     const method = request.method();
  36  | 
  37  |     if (pathname === "/api/payments/upi-config" && method === "GET") {
  38  |       await route.fulfill({
  39  |         status: 200,
  40  |         contentType: "application/json",
  41  |         body: JSON.stringify({ merchantUpiId: "test@upi" }),
  42  |       });
  43  |     } else if (
  44  |       pathname === "/api/payments/upload-screenshot" &&
  45  |       method === "POST"
  46  |     ) {
  47  |       await route.fulfill({
  48  |         status: 200,
  49  |         contentType: "application/json",
  50  |         body: JSON.stringify({ url: "https://example.com/screenshot.jpg" }),
  51  |       });
  52  |     } else if (pathname === "/api/orders" && method === "POST") {
  53  |       await route.fulfill({
  54  |         status: 201,
  55  |         contentType: "application/json",
  56  |         body: JSON.stringify(MOCK_ORDER_RESPONSE),
  57  |       });
  58  |     } else {
  59  |       await route.continue();
  60  |     }
  61  |   });
  62  | }
  63  | 
  64  | async function fillStep1(page: import("@playwright/test").Page) {
> 65  |   await page.getByTestId("input-customer-name").fill("Rajesh Kumar");
      |                                                 ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  66  |   await page.getByTestId("input-ration-card-number").fill("WB01234567890");
  67  |   await page.getByTestId("button-next-step1").click();
  68  |   await expect(page.getByTestId("dialog-family-member")).toBeVisible({
  69  |     timeout: 5000,
  70  |   });
  71  |   await page.getByTestId("button-family-no").click();
  72  | }
  73  | 
  74  | async function fillStep2(page: import("@playwright/test").Page) {
  75  |   await page.getByTestId("input-delivery-name").fill("Rajesh Kumar");
  76  |   await page.getByTestId("input-address").fill("12 Park Street, Kolkata");
  77  |   await page.getByTestId("input-post-office").fill("Park Street");
  78  |   await page.getByTestId("select-district").click();
  79  |   const kolkataOption = page.getByRole("option", { name: "Kolkata" });
  80  |   await expect(kolkataOption).toBeVisible({ timeout: 5000 });
  81  |   await kolkataOption.click();
  82  |   await page.getByTestId("input-pincode").fill("700001");
  83  |   await page.getByTestId("input-phone").fill("9876543210");
  84  |   await expect(page.getByTestId("button-next-step2")).toBeEnabled({ timeout: 3000 });
  85  |   await page.getByTestId("button-next-step2").click();
  86  | }
  87  | 
  88  | async function reachStep3(page: import("@playwright/test").Page) {
  89  |   await fillStep1(page);
  90  |   await expect(page.getByTestId("input-delivery-name")).toBeVisible({
  91  |     timeout: 5000,
  92  |   });
  93  |   await fillStep2(page);
  94  |   await expect(page.getByTestId("button-upload-screenshot")).toBeVisible({
  95  |     timeout: 5000,
  96  |   });
  97  |   await page.setInputFiles('[data-testid="input-screenshot"]', {
  98  |     name: "screenshot.jpg",
  99  |     mimeType: "image/jpeg",
  100 |     buffer: Buffer.from("fake-image-data"),
  101 |   });
  102 |   await expect(page.locator("text=Screenshot selected")).toBeVisible({
  103 |     timeout: 3000,
  104 |   });
  105 | }
  106 | 
  107 | test.describe("Order form", () => {
  108 |   test("completes all 3 steps and submits the order successfully", async ({
  109 |     page,
  110 |   }) => {
  111 |     await setupOrderMocks(page);
  112 |     await page.goto("/order");
  113 | 
  114 |     await fillStep1(page);
  115 | 
  116 |     await expect(page.getByTestId("input-delivery-name")).toBeVisible({
  117 |       timeout: 5000,
  118 |     });
  119 |     await fillStep2(page);
  120 | 
  121 |     await expect(page.getByTestId("button-upload-screenshot")).toBeVisible({
  122 |       timeout: 5000,
  123 |     });
  124 |     await expect(page.getByTestId("text-merchant-upi-id")).toContainText(
  125 |       "test@upi"
  126 |     );
  127 | 
  128 |     await page.setInputFiles('[data-testid="input-screenshot"]', {
  129 |       name: "screenshot.jpg",
  130 |       mimeType: "image/jpeg",
  131 |       buffer: Buffer.from("fake-image-data"),
  132 |     });
  133 | 
  134 |     await expect(page.locator("text=Screenshot selected")).toBeVisible({
  135 |       timeout: 3000,
  136 |     });
  137 | 
  138 |     const submitButton = page.getByTestId("button-submit-order");
  139 |     await expect(submitButton).toBeEnabled({ timeout: 3000 });
  140 |     await submitButton.click();
  141 | 
  142 |     await expect(page).toHaveURL(/\/order-upload\/PVCTEST001/, {
  143 |       timeout: 10000,
  144 |     });
  145 |   });
  146 | 
  147 |   test("shows a validation error when customerName is empty and stays on step 1", async ({
  148 |     page,
  149 |   }) => {
  150 |     await setupOrderMocks(page);
  151 |     await page.goto("/order");
  152 | 
  153 |     await page.getByTestId("input-ration-card-number").fill("WB01234567890");
  154 |     await page.getByTestId("button-next-step1").click();
  155 | 
  156 |     await expect(
  157 |       page.locator("text=Name must be at least 2 characters")
  158 |     ).toBeVisible({ timeout: 3000 });
  159 | 
  160 |     await expect(page.getByTestId("dialog-family-member")).not.toBeVisible();
  161 |     await expect(page.getByTestId("input-customer-name")).toBeVisible();
  162 |   });
  163 | 
  164 |   test("accepts a screenshot file and shows a preview before submission", async ({
  165 |     page,
```